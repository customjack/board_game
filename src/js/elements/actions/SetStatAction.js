import BaseAction from './BaseAction.js';
import ActionTypes from '../../infrastructure/utils/ActionTypes.js';

/**
 * SetStatAction - Sets a player stat to a specific value
 *
 * This action sets a stat's value directly, replacing any previous value.
 * The stat is identified by its ID (e.g., "score", "health", etc.)
 */
export default class SetStatAction extends BaseAction {
    constructor(type, payload) {
        super(type, payload);
    }

    /**
     * Execute the set stat action
     * @param {Object} gameEngine - The game engine instance
     * @param {Function} postExecutionCallback - Callback after execution
     */
    execute(gameEngine, postExecutionCallback) {
        const { eventBus } = gameEngine;

        this.emitEvent(eventBus, 'beforeActionExecution', gameEngine);

        const { statId, value, mode = 'both' } = this.payload || {};

        if (statId === undefined || value === undefined) {
            console.warn('Missing required parameters: payload.statId and/or payload.value');
            postExecutionCallback();
            return;
        }

        const currentPlayer = gameEngine.gameState.getCurrentPlayer();
        if (!currentPlayer) {
            console.warn('No current player found to set stat.');
            postExecutionCallback();
            return;
        }

        try {
            // Use the Player's setStat method which will handle stat instances
            currentPlayer.setStat(statId, value, mode);
            console.log(`[SetStatAction] Set ${currentPlayer.nickname}'s stat "${statId}" to ${value} (mode: ${mode})`);
        } catch (error) {
            console.error(`[SetStatAction] Failed to set stat "${statId}":`, error);
        }

        postExecutionCallback();

        this.emitEvent(eventBus, 'afterActionExecution', gameEngine);
    }

    /**
     * Validate the action's payload
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        const errors = [];

        if (!this.payload) {
            errors.push('Payload is required');
        } else {
            if (this.payload.statId === undefined || typeof this.payload.statId !== 'string') {
                errors.push('payload.statId must be a non-empty string');
            }
            if (this.payload.value === undefined) {
                errors.push('payload.value is required');
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
            type: ActionTypes.SET_STAT,
            displayName: 'Set Stat',
            description: 'Set a player stat to a specific value',
            category: 'stats',
            payloadSchema: {
                statId: {
                    type: 'string',
                    required: true,
                    description: 'The ID of the stat to set (e.g., "score")',
                    example: 'score'
                },
                value: {
                    type: 'any',
                    required: true,
                    description: 'The value to set the stat to',
                    example: 100
                },
                mode: {
                    type: 'string',
                    required: false,
                    description: 'Which value to set: "both" (default), "true", or "display"',
                    options: ['both', 'true', 'display'],
                    example: 'both'
                }
            }
        };
    }
}
