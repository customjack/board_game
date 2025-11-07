// Client.js

import BasePeer from './BasePeer.js';
import ModalUtil from '../utils/ModalUtil.js';
import NetworkProtocol from './protocol/NetworkProtocol.js';
import { MessageTypes } from './protocol/MessageTypes.js';
import GameStateHandler from './handlers/GameStateHandler.js';
import PlayerHandler from './handlers/PlayerHandler.js';
import ConnectionHandler from './handlers/ConnectionHandler.js';
import ConnectionStatusManager from './ConnectionStatusManager.js';

export default class Client extends BasePeer {
    constructor(originalName, hostId, eventHandler) {
        super(eventHandler);
        this.originalName = originalName;
        this.hostId = hostId;
        this.conn = null;
        this.heartbeatInterval = null;
        this.heartbeatTimeout = null;
        this.heartbeatIntervalMs = 10000; // 10 seconds
        this.heartbeatTimeoutMs = 25000;  // consider connection lost if no response within 25s

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
            new ConnectionHandler(this.protocol, context)
        ];

        // Register each handler
        this.handlers.forEach(handler => handler.register());
    }

    async init(progressTracker = null) {
        console.log("Initializing Client...");

        // OPTIMIZATION: Parallelize PeerJS connection and board loading
        console.log('[Performance] Starting parallel initialization...');
        const parallelStart = performance.now();

        const [id] = await Promise.all([
            this.initPeer(),
            this.initializeGameState()
        ]);

        const parallelEnd = performance.now();
        console.log(`[Performance] Parallel init completed in ${(parallelEnd - parallelStart).toFixed(0)}ms`);

        if (progressTracker) progressTracker.nextStage();

        console.log("Peer connection open with ID:", id);

        const managersStart = performance.now();
        this.eventHandler.initManagers(id, this.hostId);
        console.log(`[Performance] Managers initialized in ${(performance.now() - managersStart).toFixed(0)}ms`);

        if (progressTracker) progressTracker.nextStage();

        this.addPlayer(id, this.originalName);

        // Update UI with initial game state (including board)
        this.eventHandler.updateGameState(true);

        if (progressTracker) progressTracker.nextStage('Connecting to host...');
        this.connectToHost();
    }

    connectToHost() {
        this.conn = this.peer.connect(this.hostId);

        this.conn.on('open', () => this.handleOpenConnection());
        this.conn.on('data', (data) => this.handleData(data));
        this.conn.on('close', () => this.handleDisconnection());
        this.conn.on('error', (err) => this.handleConnectionError(err));
    }

    async addNewOwnedPlayer(playerName) {
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
                nickname: playerName
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

        // Initialize connection status manager
        if (!this.connectionStatusManager) {
            this.connectionStatusManager = new ConnectionStatusManager(this);
        }

        this.startHeartbeat();
        const playersJSON = this.ownedPlayers.map(player => player.toJSON());
        this.conn.send({
            type: MessageTypes.JOIN,
            peerId: this.peer.id,
            players: playersJSON,
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
        await ModalUtil.alert('Disconnected from the host.');
        location.reload();
    }

    async handleConnectionError(err) {
        this.stopHeartbeat();
        await ModalUtil.alert('Connection error: ' + err);
        location.reload();
    }

    startHeartbeat() {
        this.stopHeartbeat();
        this.markHeartbeatReceived();
        this.heartbeatInterval = setInterval(() => {
            if (this.conn && this.conn.open) {
                this.conn.send({ type: MessageTypes.HEARTBEAT, timestamp: Date.now() });
                this.scheduleHeartbeatTimeout();
            }
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
}
