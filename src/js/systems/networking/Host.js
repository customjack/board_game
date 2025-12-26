// Host.js

import BasePeer from './BasePeer.js';
import GameStateFactory from '../../infrastructure/factories/GameStateFactory.js';
import StateDelta from '../../infrastructure/utils/StateDelta.js';
import ModalUtil from '../../infrastructure/utils/ModalUtil.js';
import NetworkProtocol from './protocol/NetworkProtocol.js';
import { MessageTypes } from './protocol/MessageTypes.js';
import GameStateHandler from './handlers/GameStateHandler.js';
import PlayerHandler from './handlers/PlayerHandler.js';
import ConnectionHandler from './handlers/ConnectionHandler.js';
import PlayerActionHandler from './handlers/PlayerActionHandler.js';
import PluginReadinessHandler from './handlers/PluginReadinessHandler.js';

export default class Host extends BasePeer {
    constructor(originalName, eventHandler) {
        super(eventHandler);
        this.originalName = originalName;
        this.isHost = true;

        // Store the previous game state for delta calculation
        this.previousGameStateJSON = null;
        this.connectionHeartbeatIntervalMs = 15000;

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
            new PlayerActionHandler(this.protocol, context),
            new PluginReadinessHandler(this.protocol, context)
        ];

        // Register each handler
        this.handlers.forEach(handler => handler.register());
    }

    async init(progressTracker = null) {
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

        console.log('Host ID:', id);
        this.hostId = id;

        const managersStart = performance.now();
        this.eventHandler.initManagers(id, id);
        console.log(`[Performance] Managers initialized in ${(performance.now() - managersStart).toFixed(0)}ms`);

        if (progressTracker) progressTracker.nextStage();

        this.setupUI();
        this.addPlayer(id, this.originalName, true);

        // Update UI with initial game state (including board)
        this.eventHandler.updateGameState(true);

        // Set up event listeners
        this.peer.on('connection', (conn) => this.handleConnection(conn));
    }

    setupUI() {
        console.log("Setting up UI");
        this.eventHandler.displayInviteCode(this.hostId);
        this.eventHandler.showPage("lobbyPage");
    }

    handleConnection(conn) {
        console.log('New connection from', conn.peer);

        // Mark that this connection supports delta updates
        conn.supportsDelta = true;

        this.connections.push(conn);

        // Wait for connection to be fully open before sending data
        conn.on('open', () => {
            console.log(`Connection with ${conn.peer} is now open`);
            // Send a one-time connection package (always full state)
            this.sendConnectionPackage(conn);
        });

        conn.on('data', (data) => this.handleData(conn, data));
        conn.on('close', () => this.handleDisconnection(conn.peer));

        conn.__heartbeatInterval = setInterval(() => {
            if (conn.open) {
                conn.send({ type: MessageTypes.HEARTBEAT, timestamp: Date.now() });
            } else {
                if (conn.__heartbeatInterval) {
                    clearInterval(conn.__heartbeatInterval);
                    conn.__heartbeatInterval = null;
                }
            }
        }, this.connectionHeartbeatIntervalMs);
    }

    sendGameState(conn) {
        if (this.gameState) {
            const gameStateData = this.gameState.toJSON();
            conn.send({ type: MessageTypes.GAME_STATE, gameState: gameStateData });
        }
    }

    sendConnectionPackage(conn) {
        if (this.gameState) {
            const gameStateData = this.gameState.toJSON();
            conn.send({ type: MessageTypes.CONNECTION_PACKAGE, gameState: gameStateData });
        }
    }

    updateAndBroadcastGameState(newGameState) {
        //Effectively sets the gamestate to a copy (not a reference)
        //The client has to do similar to rebuild it's gamestate,
        //so this is to make the host and client have similar behavior

        // Increment version before serializing
        newGameState.incrementVersion();

        const newGameStateJSON = newGameState.toJSON();
        this.gameState = GameStateFactory.fromJSON(newGameStateJSON, this.eventHandler.factoryManager);

        // Refresh ownedPlayers to reference new Player objects
        this.ownedPlayers = this.gameState.getPlayersByPeerId(this.peer.id);

        this.broadcastGameState();
        this.eventHandler.updateGameState();
    }

    handleData(conn, data) {
        // Route message through protocol system
        this.protocol.handleMessage(data, {
            connection: conn,
            peer: this
        });
    }


    handleDisconnection(peerId) {
        console.log(`Connection closed with ${peerId}`);
        const connectionIndex = this.connections.findIndex((conn) => conn.peer === peerId);
        if (connectionIndex !== -1) {
            const [conn] = this.connections.splice(connectionIndex, 1);
            if (conn.__heartbeatInterval) {
                clearInterval(conn.__heartbeatInterval);
                conn.__heartbeatInterval = null;
            }
        }
        this.removePeer(peerId);
        this.broadcastGameState();
    }

    removePeer(peerId) {
        const playersToRemove = this.gameState.players.filter(player => player.peerId === peerId);
        playersToRemove.forEach(player => this.removePlayer(player.playerId));
    }

    broadcastGameState() {
        const gameStateData = this.gameState.toJSON();

        // Calculate delta if we have a previous state
        let delta = null;
        let useDelta = false;

        if (this.previousGameStateJSON) {
            delta = StateDelta.createGameStateDelta(this.previousGameStateJSON, gameStateData, this.gameState);
            const stats = StateDelta.getSizeStats(gameStateData, delta);

            // Use delta only if it's significantly smaller (< 50% of full state)
            useDelta = stats.worthIt;

            if (useDelta) {
                console.debug(`Using delta update (${stats.savingsPercent}% smaller): ${stats.deltaSize} bytes vs ${stats.fullSize} bytes`);
            }
        }

        // Broadcast to all connections
        this.connections.forEach(conn => {
            if (useDelta && conn.supportsDelta) {
                // Send delta update to clients that support it
                conn.send({
                    type: MessageTypes.GAME_STATE_DELTA,
                    delta: delta,
                    fullState: null // Full state not included in delta messages
                });
            } else {
                // Send full state to new clients or when delta isn't beneficial
                conn.send({
                    type: MessageTypes.GAME_STATE,
                    gameState: gameStateData
                });
            }
        });

        // Store current state for next delta calculation
        this.previousGameStateJSON = gameStateData;

        //console.log("Broadcasted gamestate:", useDelta ? delta : gameStateData);
    }

    broadcastStartGame() {
        this.gameState.startGame();
        this.broadcastGameState();
        console.log('Sending start game signal to all clients...');
        this.connections.forEach((conn) => {
            conn.send({ type: MessageTypes.START_GAME });
        });
    }

    kickPlayer(peerId) {
        console.log(`Kicking player with peerId: ${peerId}`);
        const connection = this.connections.find((conn) => conn.peer === peerId);
        if (connection) {
            connection.send({ type: MessageTypes.KICK });
            connection.close();
            this.removePeer(peerId);
            this.broadcastGameState();
        }
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

        this.addPlayer(this.peer.id, playerName);
        this.eventHandler.updateGameState();
        this.broadcastGameState();
    }
}
