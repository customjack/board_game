import BaseAction from './BaseAction.js';
import ActionTypes from '../../enums/ActionTypes.js';

/**
 * ForceStopAction - Forces the player to stop on their current space
 *
 * Sets remaining moves to 0, preventing further movement this turn.
 */
export default class ForceStopAction extends BaseAction {
    constructor(type, payload) {
        super(type, payload);
    }

    /**
     * Execute the force stop action
     * @param {Object} gameEngine - The game engine instance
     * @param {Function} postExecutionCallback - Callback after execution
     */
    execute(gameEngine, postExecutionCallback) {
        const { eventBus } = gameEngine;

        this.emitEvent(eventBus, 'beforeActionExecution', gameEngine);

        const currentPlayer = gameEngine.gameState.getCurrentPlayer();
        if (!currentPlayer) {
            console.warn(`No active player found in the game state.`);
            postExecutionCallback();
            return;
        }

        console.log(`Forcing ${currentPlayer.nickname} to stop. Remaining moves set to 0.`);
        gameEngine.gameState.setRemainingMoves(0);

        postExecutionCallback();

        this.emitEvent(eventBus, 'afterActionExecution', gameEngine);
    }

    /**
     * Validate the action's payload
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        // No payload required for this action
        return {
            valid: true,
            errors: []
        };
    }

    /**
     * Get metadata about this action type
     * @static
     * @returns {Object} Metadata including displayName, description, and payload schema
     */
    static getMetadata() {
        return {
            type: ActionTypes.FORCE_STOP,
            displayName: 'Force Stop',
            description: 'Immediately stops the player on their current space by setting remaining moves to 0',
            category: 'movement',
            payloadSchema: {}
        };
    }
}
