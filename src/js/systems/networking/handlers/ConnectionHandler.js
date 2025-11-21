/**
 * ConnectionHandler - Handles connection lifecycle messages
 *
 * Responsibilities:
 * - Handle connection packages
 * - Handle join requests
 * - Handle join rejections
 * - Handle kicks
 * - Handle game start signals
 * - Handle heartbeats
 */

import MessageHandlerPlugin from './MessageHandlerPlugin.js';
import { MessageTypes } from '../protocol/MessageTypes.js';
import GameStateFactory from '../../../infrastructure/factories/GameStateFactory.js';
import InputValidator from '../../../infrastructure/utils/InputValidator.js';
import ModalUtil from '../../../infrastructure/utils/ModalUtil.js';

export default class ConnectionHandler extends MessageHandlerPlugin {
    register() {
        this.registerHandler(
            MessageTypes.CONNECTION_PACKAGE,
            this.handleConnectionPackage,
            { description: 'Handle initial connection package (client only)' }
        );

        this.registerHandler(
            MessageTypes.JOIN,
            this.handleJoin,
            { description: 'Handle join request (host only)' }
        );

        this.registerHandler(
            MessageTypes.JOIN_REJECTED,
            this.handleJoinRejected,
            { description: 'Handle join rejection (client only)' }
        );

        this.registerHandler(
            MessageTypes.KICK,
            this.handleKick,
            { description: 'Handle kick (client only)' }
        );

        this.registerHandler(
            MessageTypes.START_GAME,
            this.handleStartGame,
            { description: 'Handle game start signal (client only)' }
        );

        this.registerHandler(
            MessageTypes.HEARTBEAT,
            this.handleHeartbeat,
            { description: 'Handle heartbeat ping' }
        );

        this.registerHandler(
            MessageTypes.HEARTBEAT_ACK,
            this.handleHeartbeatAck,
            { description: 'Handle heartbeat acknowledgement' }
        );
    }

    /**
     * Handle connection package (Client)
     */
    handleConnectionPackage(message, context) {
        const peer = this.getPeer();
        const factoryManager = this.getFactoryManager();

        // Store current owned players before updating game state
        const previousOwnedPlayers = peer.ownedPlayers || [];

        peer.gameState = GameStateFactory.fromJSON(message.gameState, factoryManager);

        // Try to get owned players from the new game state
        const ownedPlayersFromState = peer.gameState.getPlayersByPeerId(peer.peer.id);

        console.log('Game state updated from connection package');
        console.log(`[ConnectionPackage] Owned players: ${previousOwnedPlayers.length} -> ${ownedPlayersFromState.length}`);

        // If we had local players but the new game state doesn't include them,
        // it means our JOIN request hasn't been processed yet. Keep the previous references.
        // They will be properly updated when the host sends GAME_STATE after processing JOIN.
        if (previousOwnedPlayers.length > 0 && ownedPlayersFromState.length === 0) {
            console.log('[ConnectionPackage] Preserving local player references (JOIN not processed yet)');
            peer.ownedPlayers = previousOwnedPlayers;
        } else {
            // Normal case: update owned players from game state
            peer.ownedPlayers = ownedPlayersFromState;
        }

        if (peer.gameState.isGameStarted()) {
            peer.eventHandler.showGamePage();
        } else {
            peer.eventHandler.showLobbyPage();
        }
    }

    /**
     * Handle join request (Host)
     */
    handleJoin(message, context) {
        const peer = this.getPeer();
        const conn = context.connection;
        const players = message.players;

        // Validate players array
        if (!Array.isArray(players) || players.length === 0) {
            conn.send({
                type: MessageTypes.JOIN_REJECTED,
                reason: 'Invalid join request: No players provided.'
            });
            console.log('Join request rejected: No players provided');
            return;
        }

        const totalPlayersCount = peer.gameState.players.length;
        const playersToAddCount = players.length;

        if (totalPlayersCount + playersToAddCount > peer.gameState.settings.playerLimit) {
            conn.send({
                type: MessageTypes.JOIN_REJECTED,
                reason: `Lobby is full. The maximum player limit of ${peer.gameState.settings.playerLimit} has been reached.`
            });
            console.log(`Join request rejected. Player limit of ${peer.gameState.settings.playerLimit} reached.`);
            return;
        }

        // Track if any player failed validation
        let validationFailed = false;

        players.forEach(playerData => {
            // Validate player data
            const validation = InputValidator.validatePlayerData(playerData);
            if (!validation.isValid) {
                conn.send({
                    type: MessageTypes.JOIN_REJECTED,
                    reason: `Invalid player data: ${validation.errors.join(', ')}`
                });
                console.log('Join request rejected due to invalid player data:', validation.errors);
                validationFailed = true;
                return;
            }

            // Sanitize nickname
            const nicknameValidation = InputValidator.validateNickname(playerData.nickname);
            const sanitizedNickname = nicknameValidation.sanitized;

            // Add the player to the game state
            peer.addPlayer(playerData.peerId, sanitizedNickname);
        });

        if (!validationFailed) {
            peer.broadcastGameState();
        }
    }

    /**
     * Handle join rejection (Client)
     */
    async handleJoinRejected(message, context) {
        await ModalUtil.alert(`Join request rejected: ${message.reason}`);
        location.reload();
    }

    /**
     * Handle kick (Client)
     */
    async handleKick(message, context) {
        // Immediately route to home and close the session without showing the browser "leave page" prompt
        const peer = this.getPeer();
        if (peer) {
            peer.isKicked = true;
            peer.stopHeartbeat?.();
            if (peer.connectionStatusManager) {
                peer.connectionStatusManager.reconnectDisabled = true;
            }
            if (peer.conn) {
                try { peer.conn.close(); } catch (_) {}
            }
        }
        peer?.eventHandler?.showPage?.('homePage');
        try {
            await ModalUtil.alert('You have been kicked from the game.');
        } finally {
            window.onbeforeunload = null;
            window.location.replace(window.location.origin + window.location.pathname);
        }
    }

    /**
     * Handle game start signal (Client)
     */
    handleStartGame(message, context) {
        const peer = this.getPeer();
        peer.eventHandler.showGamePage();
    }

    /**
     * Handle heartbeat ping
     */
    handleHeartbeat(message, context) {
        const peer = this.getPeer();
        const conn = context.connection;

        // Send acknowledgement
        if (conn && conn.open) {
            conn.send({
                type: MessageTypes.HEARTBEAT_ACK,
                timestamp: Date.now()
            });
        }

        // Mark heartbeat received (for clients)
        if (peer.markHeartbeatReceived) {
            peer.markHeartbeatReceived();
        }
    }

    /**
     * Handle heartbeat acknowledgement
     */
    handleHeartbeatAck(message, context) {
        const peer = this.getPeer();

        // Mark heartbeat received (for clients)
        if (peer.markHeartbeatReceived) {
            peer.markHeartbeatReceived();
        }
    }
}
