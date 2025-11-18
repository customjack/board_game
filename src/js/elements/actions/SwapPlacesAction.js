import BaseAction from './BaseAction.js';
import ActionTypes from '../../infrastructure/utils/ActionTypes.js';

/**
 * SwapPlacesAction - Swaps the current player's position with another player
 *
 * Can target a specific player by ID or select a random player.
 */
export default class SwapPlacesAction extends BaseAction {
    constructor(type, payload) {
        super(type, payload);
    }

    /**
     * Execute the swap places action
     * @param {Object} gameEngine - The game engine instance
     * @param {Function} postExecutionCallback - Callback after execution
     */
    execute(gameEngine, postExecutionCallback) {
        const { eventBus } = gameEngine;

        this.emitEvent(eventBus, 'beforeActionExecution', gameEngine);

        const { targetPlayerId } = this.payload || {};

        const currentPlayer = gameEngine.gameState.getCurrentPlayer();
        if (!currentPlayer) {
            console.warn(`No active player found in the game state.`);
            postExecutionCallback();
            return;
        }

        // Get target player
        let targetPlayer = null;

        if (targetPlayerId) {
            // Target specific player by ID
            targetPlayer = gameEngine.gameState.players.find(p => p.id === targetPlayerId);
            if (!targetPlayer) {
                console.warn(`Target player with ID "${targetPlayerId}" not found.`);
                postExecutionCallback();
                return;
            }
        } else {
            // Select a random player (excluding current player)
            const otherPlayers = gameEngine.gameState.players.filter(p => p.id !== currentPlayer.id);
            if (otherPlayers.length === 0) {
                console.warn(`No other players available to swap with.`);
                postExecutionCallback();
                return;
            }
            targetPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        }

        // Swap positions
        const currentPlayerPosition = currentPlayer.getCurrentSpaceId();
        const targetPlayerPosition = targetPlayer.getCurrentSpaceId();

        console.log(`Swapping positions: ${currentPlayer.nickname} (${currentPlayerPosition}) ↔ ${targetPlayer.nickname} (${targetPlayerPosition})`);

        currentPlayer.setCurrentSpaceId(targetPlayerPosition);
        targetPlayer.setCurrentSpaceId(currentPlayerPosition);

        postExecutionCallback();

        this.emitEvent(eventBus, 'afterActionExecution', gameEngine);
    }

    /**
     * Validate the action's payload
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        const errors = [];

        if (this.payload && this.payload.targetPlayerId !== undefined) {
            if (typeof this.payload.targetPlayerId !== 'string') {
                errors.push('payload.targetPlayerId must be a string');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get metadata about this action type
     * @static
     * @returns {Object} Metadata including displayName, description, and payload schema
     */
    static getMetadata() {
        return {
            type: ActionTypes.SWAP_PLACES,
            displayName: 'Swap Places',
            description: 'Swap the current player\'s position with another player. If no target is specified, selects a random player.',
            category: 'movement',
            payloadSchema: {
                targetPlayerId: {
                    type: 'string',
                    required: false,
                    description: 'ID of the player to swap with. If omitted, a random player is selected.',
                    example: 'player_2'
                }
            }
        };
    }
}
