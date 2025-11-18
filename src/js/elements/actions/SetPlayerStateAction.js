import BaseAction from './BaseAction.js';
import ActionTypes from '../../infrastructure/utils/ActionTypes.js';

/**
 * SetPlayerStateAction - Changes the current player's state
 *
 * Updates the player's state (e.g., NORMAL, DRUNK, FROZEN, etc.)
 */
export default class SetPlayerStateAction extends BaseAction {
    constructor(type, payload) {
        super(type, payload);
    }

    /**
     * Execute the set player state action
     * @param {Object} gameEngine - The game engine instance
     * @param {Function} postExecutionCallback - Callback after execution
     */
    execute(gameEngine, postExecutionCallback) {
        const { eventBus } = gameEngine;

        this.emitEvent(eventBus, 'beforeActionExecution', gameEngine);

        const { state } = this.payload || {};

        if (!state) {
            console.warn('Missing required parameter: payload.state');
            postExecutionCallback();
            return;
        }

        const currentPlayer = gameEngine.gameState.getCurrentPlayer();
        if (currentPlayer) {
            try {
                currentPlayer.setState(state); // Use the setter method for proper state assignment
                console.log(`Set ${currentPlayer.nickname}'s state to ${state}.`);
            } catch (error) {
                console.error(`Failed to set player state: ${error.message}`);
            }
        } else {
            console.warn('No current player found to set state.');
        }
        console.log(currentPlayer.getState());

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
            if (!this.payload.state || typeof this.payload.state !== 'string') {
                errors.push('payload.state must be a non-empty string');
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
            type: ActionTypes.SET_PLAYER_STATE,
            displayName: 'Set Player State',
            description: 'Change the current player\'s state',
            category: 'player',
            payloadSchema: {
                state: {
                    type: 'enum',
                    required: true,
                    description: 'The state to set for the player',
                    options: ['NORMAL', 'DRUNK', 'FROZEN', 'INVINCIBLE'],
                    example: 'DRUNK'
                }
            }
        };
    }
}
