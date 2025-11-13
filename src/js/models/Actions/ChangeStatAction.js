import BaseAction from './BaseAction.js';
import ActionTypes from '../../enums/ActionTypes.js';

/**
 * ChangeStatAction - Changes a player stat by a delta amount
 *
 * This action modifies a stat's value by adding or subtracting a delta.
 * The stat is identified by its ID (e.g., "score", "health", etc.)
 */
export default class ChangeStatAction extends BaseAction {
    constructor(type, payload) {
        super(type, payload);
    }

    /**
     * Execute the change stat action
     * @param {Object} gameEngine - The game engine instance
     * @param {Function} postExecutionCallback - Callback after execution
     */
    execute(gameEngine, postExecutionCallback) {
        const { eventBus } = gameEngine;

        this.emitEvent(eventBus, 'beforeActionExecution', gameEngine);

        const { statId, delta, mode = 'both' } = this.payload || {};

        if (statId === undefined || delta === undefined) {
            console.warn('Missing required parameters: payload.statId and/or payload.delta');
            postExecutionCallback();
            return;
        }

        const currentPlayer = gameEngine.gameState.getCurrentPlayer();
        if (!currentPlayer) {
            console.warn('No current player found to change stat.');
            postExecutionCallback();
            return;
        }

        try {
            // Use the Player's updateStat method which will handle stat instances
            currentPlayer.updateStat(statId, delta, mode);
            console.log(`[ChangeStatAction] Changed ${currentPlayer.nickname}'s stat "${statId}" by ${delta} (mode: ${mode})`);
        } catch (error) {
            console.error(`[ChangeStatAction] Failed to change stat "${statId}":`, error);
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
            if (this.payload.delta === undefined || typeof this.payload.delta !== 'number') {
                errors.push('payload.delta must be a number');
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
            type: ActionTypes.CHANGE_STAT,
            displayName: 'Change Stat',
            description: 'Change a player stat by a delta amount (positive or negative)',
            category: 'stats',
            payloadSchema: {
                statId: {
                    type: 'string',
                    required: true,
                    description: 'The ID of the stat to change (e.g., "score")',
                    example: 'score'
                },
                delta: {
                    type: 'number',
                    required: true,
                    description: 'The amount to change the stat by (can be negative)',
                    example: 10
                },
                mode: {
                    type: 'string',
                    required: false,
                    description: 'Which value to change: "both" (default), "true", or "display"',
                    options: ['both', 'true', 'display'],
                    example: 'both'
                }
            }
        };
    }
}
