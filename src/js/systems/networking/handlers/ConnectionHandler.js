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
            // Don't show lobby/game page yet - wait for JOIN to be accepted
            // Stay on loading page until we know we're accepted
            return;
        } else {
            // Normal case: update owned players from game state
            peer.ownedPlayers = ownedPlayersFromState;
        }

        // Only show lobby/game page if we have owned players (JOIN was accepted)
        // If we don't have owned players, we might be getting rejected, so stay on loading page
        if (ownedPlayersFromState.length > 0) {
            if (peer.gameState.isGameStarted()) {
                peer.eventHandler.showGamePage();
            } else {
                peer.eventHandler.showLobbyPage();
            }
        }
        // Otherwise, stay on loading page and wait for JOIN_REJECTED or GAME_STATE update
        
        // After receiving game state, check plugins and send readiness
        // This ensures the host knows the client's plugin status
        if (peer.eventHandler && peer.eventHandler.checkAndLoadPlugins) {
            // Set the previous map ID to trigger plugin check
            peer.eventHandler.previousMapId = peer.gameState?.selectedMapId || null;
            if (peer.eventHandler.getRequirementsHash) {
                peer.eventHandler.previousPluginRequirementsHash = peer.eventHandler.getRequirementsHash(peer.gameState?.pluginRequirements || []);
            }
            // Check plugins for current map
            if (peer.gameState?.selectedMapId) {
                // Ensure connection is open before checking
                const checkPlugins = () => {
                    if (peer.conn && peer.conn.open) {
                        peer.eventHandler.checkAndLoadPlugins(peer.gameState);
                    } else if (peer.conn) {
                        // Wait for connection to open
                        peer.conn.once('open', () => {
                            peer.eventHandler.checkAndLoadPlugins(peer.gameState);
                        });
                    } else {
                        // Connection not ready yet, try again shortly
                        setTimeout(checkPlugins, 100);
                    }
                };
                checkPlugins();
            } else {
                // No map selected yet, mark as ready (no plugins required)
                if (peer.gameState && peer.peer?.id) {
                    peer.gameState.setPluginReadiness(peer.peer.id, true, []);
                    peer.eventHandler.updateGameState();
                }
                if (peer.eventHandler.sendPluginReadiness) {
                    const sendReadiness = () => {
                        if (peer.conn && peer.conn.open) {
                            peer.eventHandler.sendPluginReadiness(true, []);
                        } else if (peer.conn) {
                            peer.conn.once('open', () => {
                                peer.eventHandler.sendPluginReadiness(true, []);
                            });
                        } else {
                            setTimeout(sendReadiness, 100);
                        }
                    };
                    sendReadiness();
                }
            }
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

        // Check if game has started and mid-game joins are not allowed
        const gameStarted = peer.gameState.isGameStarted();
        const allowMidGameJoin = peer.gameState.settings.allowMidGameJoin !== false; // Default to true if not set

        if (gameStarted && !allowMidGameJoin) {
            conn.send({
                type: MessageTypes.JOIN_REJECTED,
                reason: 'The game has already started and mid-game joins are not allowed.'
            });
            console.log('Join request rejected: Game has started and mid-game joins are disabled');
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
            const joiningPeerId = message.peerId || (players[0]?.peerId);
            const requirements = peer.gameState?.pluginRequirements || [];
            const missingPluginIds = requirements
                .filter(req => req && req.id && req.id !== 'core' && req.source !== 'builtin')
                .map(req => req.id);

            // Mark new peer as not ready until they report readiness
            if (
                requirements.length > 0 &&
                joiningPeerId &&
                peer.gameState &&
                typeof peer.gameState.getPluginReadiness === 'function' &&
                !peer.gameState.getPluginReadiness(joiningPeerId)
            ) {
                peer.gameState.setPluginReadiness(joiningPeerId, false, missingPluginIds);
            }

            peer.broadcastGameState();
            peer.eventHandler?.updateGameState?.(true);
            
            // Request plugin readiness from the newly joined client
            // This ensures we get their readiness status even if they already have plugins
            const peerId = message.peerId;
            if (peerId && conn.open) {
                console.log(`[Host] Requesting plugin readiness from ${peerId}`);
                conn.send({
                    type: MessageTypes.REQUEST_PLUGIN_READINESS
                });
            }
        }
    }

    /**
     * Handle join rejection (Client)
     */
    async handleJoinRejected(message, context) {
        const peer = this.getPeer();
        // Stay on loading page and show error
        // Don't show lobby with default values
        await ModalUtil.alert(`Join request rejected: ${message.reason}`);
        // Return to home page instead of reloading
        if (peer && peer.eventHandler) {
            peer.eventHandler.showPage('homePage');
        } else {
            location.reload();
        }
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
