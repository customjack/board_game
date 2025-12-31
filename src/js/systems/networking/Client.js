// Client.js

import BasePeer from './BasePeer.js';
import ModalUtil from '../../infrastructure/utils/ModalUtil.js';
import NetworkProtocol from './protocol/NetworkProtocol.js';
import { MessageTypes } from './protocol/MessageTypes.js';
import GameStateHandler from './handlers/GameStateHandler.js';
import PlayerHandler from './handlers/PlayerHandler.js';
import ConnectionHandler from './handlers/ConnectionHandler.js';
import PluginStateHandler from './handlers/PluginStateHandler.js';
import PluginReadinessHandler from './handlers/PluginReadinessHandler.js';
import ConnectionStatusManager from './ConnectionStatusManager.js';

export default class Client extends BasePeer {
    constructor(originalName, hostId, eventHandler) {
        super(eventHandler);
        this.originalName = originalName;
        this.isHost = false;
        this.hostId = hostId;
        this.conn = null;
        this.heartbeatInterval = null;
        this.heartbeatTimeout = null;
        this.heartbeatIntervalMs = 15000; // 15 seconds (slower to survive throttling)
        this.heartbeatTimeoutMs = 120000;  // allow up to 2 minutes for background tabs (overridden by settings)

        // Connection status manager for reconnection
        this.connectionStatusManager = null;

        // Initialize protocol and handlers
        this.protocol = new NetworkProtocol({
            validateMessages: true,
            logMessages: false
        });
        this.initializeHandlers();
    }

    /**
     * Initialize message handlers
     */
    initializeHandlers() {
        const context = {
            peer: this,
            eventBus: this.eventHandler?.eventBus,
            factoryManager: this.eventHandler?.factoryManager
        };

        // Register all handler plugins
        this.handlers = [
            new GameStateHandler(this.protocol, context),
            new PlayerHandler(this.protocol, context),
            new ConnectionHandler(this.protocol, context),
            new PluginStateHandler(this.protocol, context),
            new PluginReadinessHandler(this.protocol, context)
        ];

        // Register each handler
        this.handlers.forEach(handler => handler.register());
    }

    async init(progressTracker = null) {
        console.log("Initializing Client...");
        this.progressTracker = progressTracker || null;

        // Initialize PeerJS connection
        const peerStart = performance.now();
        const id = await this.initPeer();
        console.log(`[Performance] Peer initialized in ${(performance.now() - peerStart).toFixed(0)}ms`);

        console.log("Peer connection open with ID:", id);

        // Initialize game state
        const gameStateStart = performance.now();
        await this.initializeGameState();
        console.log(`[Performance] Game state initialized in ${(performance.now() - gameStateStart).toFixed(0)}ms`);

        if (this.progressTracker) this.progressTracker.nextStage();

        // Initialize managers
        const managersStart = performance.now();
        this.eventHandler.initManagers(id, this.hostId);
        console.log(`[Performance] Managers initialized in ${(performance.now() - managersStart).toFixed(0)}ms`);

        if (this.progressTracker) this.progressTracker.nextStage();

        // Update UI with initial game state (including board)
        this.eventHandler.updateGameState(true);

        // Build the game engine early so the stage ordering stays deterministic
        if (this.eventHandler?.createGameEngine) {
            this.eventHandler.createGameEngine((proposedGameState) => this.proposeGameState(proposedGameState));
            if (this.progressTracker) this.progressTracker.nextStage();
        }

        // Apply connection timeout from settings (seconds -> ms)
        const idleTimeoutSec = this.gameState?.settings?.connectionIdleTimeoutSeconds;
        if (Number.isFinite(idleTimeoutSec)) {
            this.heartbeatTimeoutMs = idleTimeoutSec * 1000;
        }

        if (this.progressTracker) this.progressTracker.nextStage();
        this.connectToHost();

        // Keep heartbeat alive when tab visibility changes (helps with throttled timers)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.sendHeartbeat();
            }
        });
    }

    connectToHost() {
        this.conn = this.peer.connect(this.hostId);

        this.conn.on('open', () => this.handleOpenConnection());
        this.conn.on('data', (data) => this.handleData(data));
        this.conn.on('close', () => this.handleDisconnection());
        this.conn.on('error', (err) => this.handleConnectionError(err));
    }

    async addNewOwnedPlayer(playerName, { playerColor, peerColor } = {}) {
        const totalPlayers = this.gameState.players.length;
        if (totalPlayers >= this.gameState.settings.playerLimit) {
            await ModalUtil.alert(`Cannot add more players. The maximum limit of ${this.gameState.settings.playerLimit} players has been reached.`);
            return;
        }

        const totalOwnedPlayers = this.ownedPlayers.length;
        if (totalOwnedPlayers >= this.gameState.settings.playerLimitPerPeer) {
            await ModalUtil.alert(`Cannot add more players. The maximum limit of ${this.gameState.settings.playerLimitPerPeer} players for this peer has been reached.`);
            return;
        }

        // Propose to the host to add the new player
        this.conn.send({
            type: MessageTypes.PROPOSE_ADD_PLAYER,
            player: {
                peerId: this.peer.id,
                nickname: playerName,
                playerColor,
                peerColor
            }
        });
    }


    // Method to propose a new game state to the host
    proposeGameState(proposedGameState) {
        //console.log("Proposed game state (JSON): ", proposedGameState.toJSON());
        // Only propose if connected to host
        if (this.conn && this.conn.open) {
            this.conn.send({
                type: MessageTypes.PROPOSE_GAME_STATE,
                gameState: proposedGameState.toJSON(),
            });
        } else {
            console.error('Cannot propose game state, not connected to host.');
        }
    }

    handleOpenConnection() {
        console.log('Connected to host');
        if (this.progressTracker) {
            this.progressTracker.nextStage();
            this.progressTracker.complete();
        }

        // Initialize connection status manager
        if (!this.connectionStatusManager) {
            this.connectionStatusManager = new ConnectionStatusManager(this);
        }

        this.startHeartbeat();
        this.conn.send({
            type: MessageTypes.JOIN,
            peerId: this.peer.id,
            players: []
        });
        this.eventHandler.displayInviteCode(this.hostId);
    }

    handleData(data) {
        // Route message through protocol system
        this.protocol.handleMessage(data, {
            connection: this.conn,
            peer: this
        });
    }

    async handleDisconnection() {
        this.stopHeartbeat();

        if (this.isKicked) {
            this.eventHandler?.showPage?.('homePage');
            return;
        }

        if (this.connectionStatusManager) {
            this.connectionStatusManager.handleDisconnection();
        } else {
            await ModalUtil.alert('Disconnected from the host.');
            location.reload();
        }
    }

    async handleConnectionError(err) {
        this.stopHeartbeat();

        if (this.connectionStatusManager) {
            console.error('Connection error:', err);
            this.connectionStatusManager.handleDisconnection();
        } else {
            // Stay on loading page, show error, then return to home
            await ModalUtil.alert('Connection error: ' + err);
            if (this.eventHandler) {
                this.eventHandler.showPage('homePage');
            } else {
                location.reload();
            }
        }
    }

    startHeartbeat() {
        this.stopHeartbeat();
        this.markHeartbeatReceived();
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, this.heartbeatIntervalMs);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
    }

    markHeartbeatReceived() {
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }

        // Notify connection status manager
        if (this.connectionStatusManager) {
            this.connectionStatusManager.markHeartbeatReceived();
        }
    }

    scheduleHeartbeatTimeout() {
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
        }
        this.heartbeatTimeout = setTimeout(() => {
            console.warn('Heartbeat timeout - attempting to reconnect to host.');
            this.stopHeartbeat();
            if (this.conn) {
                this.conn.close();
            }
            this.connectToHost();
        }, this.heartbeatTimeoutMs);
    }

    sendHeartbeatAck() {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: MessageTypes.HEARTBEAT_ACK, timestamp: Date.now() });
        }
        this.markHeartbeatReceived();
    }

    sendHeartbeat() {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: MessageTypes.HEARTBEAT, timestamp: Date.now() });
            this.scheduleHeartbeatTimeout();
        }
    }
}
