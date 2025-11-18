// BasePeer.js

import Peer from 'peerjs';
import GameStateFactory from '../../infrastructure/factories/GameStateFactory.js';
import BoardManager from '../../infrastructure/managers/BoardManager';
import { PEER_CONFIG, getPerformanceLabel, PERFORMANCE_THRESHOLDS } from './NetworkConfig.js';

export default class BasePeer {
    constructor(eventHandler) {
        this.peer = null;
        this.eventHandler = eventHandler;
        this.gameState = null;
        this.settings = null;
        this.ownedPlayers = [];
        this.connections = []; // For Host, will be empty for Client
        this.isHost = false;
    }

    async initPeer() {
        console.log('[Network] Initializing PeerJS connection...');

        const startTime = performance.now();

        // Create peer with configuration
        this.peer = new Peer(PEER_CONFIG);

        return new Promise((resolve, reject) => {
            // Set up timeout to detect slow connections
            const timeoutId = setTimeout(() => {
                const elapsed = performance.now() - startTime;
                console.warn(`[Network] PeerJS connection is taking unusually long: ${elapsed.toFixed(0)}ms`);
                console.warn('[Network] This may indicate issues with the signaling server.');
                console.warn('[Network] Consider setting up a local PeerServer for faster connections.');
            }, PERFORMANCE_THRESHOLDS.PEER_INIT_WARNING);

            this.peer.on('open', (id) => {
                clearTimeout(timeoutId);
                const elapsed = performance.now() - startTime;
                const perfLabel = getPerformanceLabel(elapsed);

                console.log(`[Network] ✓ Peer connection established [${perfLabel}]: ${elapsed.toFixed(0)}ms`);
                console.log('[Network] Peer ID:', id);

                if (perfLabel === 'SLOW' || perfLabel === 'WARNING' || perfLabel === 'ERROR') {
                    console.warn(`[Network] Connection took ${elapsed.toFixed(0)}ms - consider using a local PeerServer`);
                    console.warn('[Network] See NetworkConfig.js for setup instructions');
                }

                resolve(id);
            });

            this.peer.on('error', (err) => {
                clearTimeout(timeoutId);
                const elapsed = performance.now() - startTime;
                console.error(`[Network] Peer error after ${elapsed.toFixed(0)}ms:`, err);
                this.eventHandler.handlePeerError(err);
                reject(err);
            });
        });
    }

    async initializeGameState() {
        const boardManager = new BoardManager(this.eventHandler.factoryManager);
        await boardManager.loadDefaultBoard();
        this.gameState = GameStateFactory.create({
            board: boardManager.board,
            factoryManager: this.eventHandler.factoryManager
        });
        console.log("GameState initialized", this.gameState);
    }

    addPlayer(peerId, nickname, isHost = false, playerId = null) {
        // Add player to the gameState (now GameState handles the creation)
        const newPlayer = this.gameState.addPlayer(peerId, nickname, isHost, playerId);

        // If this is the local player (owned by this peer), add them to the ownedPlayers list
        if (this.peer.id === peerId) {
            this.ownedPlayers = this.gameState.getPlayersByPeerId(peerId);
        }

        // Call event handler to update the game state
        this.eventHandler.updateGameState();

        return newPlayer;
    }

    removePlayer(playerId) {
        this.ownedPlayers = this.ownedPlayers.filter(player => player.playerId !== playerId);
        this.gameState.removePlayer(playerId);
        this.eventHandler.updateGameState();
    }

    broadcastGameState() {
        // Implemented in Host.js
    }

    // Additional shared methods can be added here
}
