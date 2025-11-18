import BaseAction from './BaseAction.js';
import ActionTypes from '../../infrastructure/utils/ActionTypes.js';

/**
 * SetPlayerSpaceAction - Teleports the player to a specific space
 *
 * Moves the player directly to the specified space ID.
 */
export default class SetPlayerSpaceAction extends BaseAction {
    constructor(type, payload) {
        super(type, payload);
    }

    /**
     * Execute the set player space action
     * @param {Object} gameEngine - The game engine instance
     * @param {Function} postExecutionCallback - Callback after execution
     */
    execute(gameEngine, postExecutionCallback) {
        const { eventBus } = gameEngine;

        this.emitEvent(eventBus, 'beforeActionExecution', gameEngine);

        console.log("triggered this!")
        const { spaceId } = this.payload || {};

        if (spaceId === undefined) {
            console.warn('Missing required parameter: payload.spaceId');
            postExecutionCallback();
            return;
        }

        const currentPlayer = gameEngine.gameState.getCurrentPlayer();
        if (currentPlayer) {
            try {
                gameEngine.gameState.movePlayer(spaceId);
                console.log(`Set ${currentPlayer.nickname}'s space to ${spaceId}.`);
            } catch (error) {
                console.error(`Failed to set player space: ${error.message}`);
            }
        } else {
            console.warn('No current player found to set space.');
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
            if (this.payload.spaceId === undefined) {
                errors.push('payload.spaceId is required');
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
            type: ActionTypes.SET_PLAYER_SPACE,
            displayName: 'Set Player Space',
            description: 'Teleport the player to a specific space on the board',
            category: 'movement',
            payloadSchema: {
                spaceId: {
                    type: 'string',
                    required: true,
                    description: 'The ID of the space to move the player to',
                    example: 'space-42'
                }
            }
        };
    }
}
