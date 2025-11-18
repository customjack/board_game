/**
 * GameStateHandler - Handles all game state synchronization messages
 *
 * Responsibilities:
 * - Handle full game state updates
 * - Handle delta updates
 * - Handle proposed game state changes
 * - Handle full state requests
 */

import MessageHandlerPlugin from './MessageHandlerPlugin.js';
import { MessageTypes } from '../protocol/MessageTypes.js';
import GameStateFactory from '../../../infrastructure/factories/GameStateFactory.js';
import StateDelta from '../utils/StateDelta.js';

export default class GameStateHandler extends MessageHandlerPlugin {
    register() {
        this.registerHandler(
            MessageTypes.GAME_STATE,
            this.handleGameState,
            { description: 'Handle full game state update' }
        );

        this.registerHandler(
            MessageTypes.GAME_STATE_DELTA,
            this.handleGameStateDelta,
            { description: 'Handle delta game state update' }
        );

        this.registerHandler(
            MessageTypes.PROPOSE_GAME_STATE,
            this.handleProposeGameState,
            { description: 'Handle proposed game state (host only)' }
        );

        this.registerHandler(
            MessageTypes.REQUEST_FULL_STATE,
            this.handleRequestFullState,
            { description: 'Handle full state request (host only)' }
        );
    }

    /**
     * Handle full game state update (Client)
     */
    handleGameState(message, context) {
        const peer = this.getPeer();
        const factoryManager = this.getFactoryManager();

        peer.gameState = GameStateFactory.fromJSON(message.gameState, factoryManager);
        peer.ownedPlayers = peer.gameState.getPlayersByPeerId(peer.peer.id);

        console.log('Game state updated from full state');
        peer.eventHandler.updateGameState();
    }

    /**
     * Handle delta game state update (Client)
     */
    handleGameStateDelta(message, context) {
        const peer = this.getPeer();
        const factoryManager = this.getFactoryManager();

        try {
            // Get current state as JSON
            const currentStateJSON = peer.gameState.toJSON();

            // Check if delta can be safely applied
            if (!StateDelta.canApplyDelta(currentStateJSON, message.delta)) {
                console.warn('Delta version mismatch. Requesting full state.');
                this.requestFullState('version_mismatch');
                return;
            }

            // Apply delta to current state
            const updatedStateJSON = StateDelta.applyDelta(currentStateJSON, message.delta);

            // Reconstruct GameState from the updated JSON
            peer.gameState = GameStateFactory.fromJSON(updatedStateJSON, factoryManager);
            peer.ownedPlayers = peer.gameState.getPlayersByPeerId(peer.peer.id);

            console.log(`Delta applied successfully. Version: ${peer.gameState.getVersion()}`);
            peer.eventHandler.updateGameState();
        } catch (error) {
            console.error('Error applying delta:', error);
            console.warn('Requesting full state due to delta application error.');
            this.requestFullState('delta_application_error');
        }
    }

    /**
     * Handle proposed game state (Host)
     */
    handleProposeGameState(message, context) {
        const peer = this.getPeer();
        const conn = context.connection;
        const factoryManager = this.getFactoryManager();

        const proposedGameState = GameStateFactory.fromJSON(message.gameState, factoryManager);

        // Validate the proposed game state
        if (this.validateProposedGameState(conn.peer, proposedGameState)) {
            peer.gameState = proposedGameState;
            peer.ownedPlayers = peer.gameState.getPlayersByPeerId(peer.peer.id);

            peer.broadcastGameState();
            peer.eventHandler.updateGameState();
        } else {
            console.error('Invalid game state proposed by peer:', conn.peer);
            peer.sendGameState(conn);
        }
    }

    /**
     * Handle full state request (Host)
     */
    handleRequestFullState(message, context) {
        const peer = this.getPeer();
        const conn = context.connection;

        console.log(`Client ${conn.peer} requested full state. Reason: ${message.reason || 'unspecified'}`);
        peer.sendGameState(conn);
    }

    /**
     * Validate proposed game state (Host)
     */
    validateProposedGameState(peerId, proposedGameState) {
        const peer = this.getPeer();

        // Don't allow state changes if game is paused
        if (peer.gameState.gamePhase === 'PAUSED' && proposedGameState.gamePhase !== 'PAUSED') {
            return false;
        }

        return true;
    }

    /**
     * Request full state from host (Client helper)
     */
    requestFullState(reason) {
        const peer = this.getPeer();

        if (peer.conn && peer.conn.open) {
            peer.conn.send({
                type: MessageTypes.REQUEST_FULL_STATE,
                reason: reason || 'delta_sync_failed'
            });
        }
    }
}
