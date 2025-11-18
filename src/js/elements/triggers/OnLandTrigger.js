import BaseTrigger from './BaseTrigger.js';
import TriggerTypes from '../../infrastructure/utils/TriggerTypes.js';

/**
 * OnLandTrigger - Triggered when a player lands on a space (finishes movement)
 *
 * This trigger fires only when the player is on the space AND has no moves remaining.
 * It represents the final destination after all movement is complete.
 *
 * Use Cases:
 * - "When you land on this space, skip your next turn"
 * - "Landing here teleports you to another space"
 * - Events that should only fire at final destination
 */
export default class OnLandTrigger extends BaseTrigger {
    constructor(type, payload = null) {
        super(type, payload);
    }

    /**
     * Check if player has landed on the space (no moves left)
     * @param {Object} context - Trigger evaluation context
     * @returns {boolean} True if player is on space and has no moves left
     */
    isTriggered(context) {
        const { gameState, space, eventBus } = context;

        // Emit pre-check event
        this.emitEvent(eventBus, 'triggerCheckStarted', { gameState, space });

        const player = gameState.getCurrentPlayer();

        // Check if player is on this space
        const isOnSpace = player.currentSpaceId === space.id;

        // Check if player has no moves left
        const noMovesLeft = !gameState.hasMovesLeft();

        const isTriggered = isOnSpace && noMovesLeft;

        // Emit post-check event
        this.emitEvent(eventBus, 'triggerCheckEnded', {
            result: isTriggered,
            gameState,
            space
        });

        // Debug logging
        if (isTriggered) {
            console.log(`OnLandTrigger activated for space ID ${space.id} by player ${player.nickname}`);
        }

        return isTriggered;
    }

    /**
     * Validate the trigger configuration
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        const baseValidation = super.validate();
        const errors = [...baseValidation.errors];

        // OnLandTrigger doesn't use payload, but allow it for flexibility
        // No additional validation needed

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get metadata about this trigger type
     * @static
     * @returns {Object} Metadata schema
     */
    static getMetadata() {
        return {
            type: TriggerTypes.ON_LAND,
            displayName: 'On Land',
            description: 'Triggered when a player lands on a space after completing all movement. Only fires when the player has no moves remaining.',
            category: 'movement',
            timing: 'end_of_movement',
            payloadSchema: {
                // ON_LAND doesn't require payload
            },
            examples: [
                {
                    description: 'Trigger when landing on the space',
                    json: {
                        type: 'ON_LAND',
                        payload: null
                    }
                }
            ],
            useCases: [
                'Events that fire only at final destination',
                'Post-movement triggers',
                'Landing-based game mechanics'
            ]
        };
    }
}
