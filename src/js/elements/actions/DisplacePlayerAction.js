import BaseAction from './BaseAction.js';
import ActionTypes from '../../enums/ActionTypes.js';

/**
 * DisplacePlayerAction - Moves the player forward or backward
 *
 * Positive steps add to remaining moves, negative steps move back in history.
 */
export default class DisplacePlayerAction extends BaseAction {
    constructor(type, payload) {
        super(type, payload);
    }

    /**
     * Execute the displace player action
     * @param {Object} gameEngine - The game engine instance
     * @param {Function} postExecutionCallback - Callback after execution
     */
    execute(gameEngine, postExecutionCallback) {
        const { eventBus } = gameEngine;

        this.emitEvent(eventBus, 'beforeActionExecution', gameEngine);

        const { steps } = this.payload || {};

        if (steps === undefined) {
            console.warn('Missing required parameter: payload.steps');
            postExecutionCallback();
            return;
        }

        const currentPlayer = gameEngine.gameState.getCurrentPlayer(); // Get the current player
        if (!currentPlayer) {
            console.warn(`No active player found in the game state.`);
            postExecutionCallback();
            return;
        }

        if (steps > 0) {
            // Positive displacement: Add steps to remaining moves
            console.log(`Adding ${steps} moves to ${currentPlayer.nickname}'s remaining moves.`);
            gameEngine.gameState.setRemainingMoves(gameEngine.gameState.remainingMoves + steps);

        } else if (steps < 0) {
            // Negative displacement: Move back in movement history
            const moveBackSteps = Math.abs(steps);

            if (currentPlayer.movementHistory.flattenHistory().length === 0) {
                console.warn(`${currentPlayer.nickname} has no movement history to move back.`);
                postExecutionCallback();
                return;
            }


            // Flatten the history and filter out backtracked moves
            const flatHistory = currentPlayer.movementHistory.flattenHistory().filter(move => !move.isBacktracked);

            // Calculate the target index after moving back the specified steps
            const targetIndex = Math.max(0, flatHistory.length - moveBackSteps - 1);

            // Get the target move (the move we want to go back to)
            const targetMove = flatHistory[targetIndex];

            if (!targetMove) {
                console.warn(`Cannot move ${currentPlayer.nickname} back ${moveBackSteps} steps as there aren't enough previous moves.`);
                postExecutionCallback();
                return;
            }

            // Update the player's current position
            const targetPosition = targetMove.spaceId;
            console.log(
                `Moving ${currentPlayer.nickname} back ${moveBackSteps} steps to position ${targetPosition}.`
            );
            currentPlayer.setCurrentSpaceId(targetPosition);

            // Mark the moves as backtracked
            for (let i = targetIndex + 1; i < currentPlayer.movementHistory.flattenHistory().length; i++) {
                const move = currentPlayer.movementHistory.flattenHistory()[i];
                move.markAsBacktracked();
            }

        } else {
            console.warn(`Displacement of 0 steps has no effect.`);
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
            if (this.payload.steps === undefined || typeof this.payload.steps !== 'number') {
                errors.push('payload.steps must be a number');
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
            type: ActionTypes.DISPLACE_PLAYER,
            displayName: 'Displace Player',
            description: 'Move the player forward (positive) or backward (negative) by a number of steps',
            category: 'movement',
            payloadSchema: {
                steps: {
                    type: 'number',
                    required: true,
                    description: 'Number of steps to move. Positive = forward, negative = backward',
                    example: -3
                }
            }
        };
    }
}
