import BaseTrigger from './BaseTrigger.js';

/**
 * OnEnterTrigger - Triggered when a player enters (moves into) a space
 *
 * This trigger fires whenever the player has moved during this turn and is currently on the space.
 * It activates mid-movement, before the player has finished all their moves.
 *
 * Use Cases:
 * - "When you enter this space, take a drink"
 * - "Passing through this space triggers an event"
 * - Events that should fire during movement, not just on landing
 */
export default class OnEnterTrigger extends BaseTrigger {
    static type = 'ON_ENTER';

    constructor(payload = null) {
        super(payload);
    }

    /**
     * Check if player has entered the space this turn
     * @param {Object} context - Trigger evaluation context
     * @returns {boolean} True if player has moved and is on this space
     */
    isTriggered(context) {
        const { gameState, space, eventBus } = context;

        // Emit pre-check event
        this.emitEvent(eventBus, 'triggerCheckStarted', { gameState, space });

        const player = gameState.getCurrentPlayer();

        // Check if player has moved this turn
        const hasMovedThisTurn = player.movementHistory.getHistoryForTurn(gameState.getTurnNumber()).length > 0;

        // Check if player is currently on this space
        const isOnSpace = player.currentSpaceId === space.id;

        const isTriggered = hasMovedThisTurn && isOnSpace;

        // Emit post-check event
        this.emitEvent(eventBus, 'triggerCheckEnded', {
            result: isTriggered,
            gameState,
            space
        });

        return isTriggered;
    }

    /**
     * Validate the trigger configuration
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        const baseValidation = super.validate();
        const errors = [...baseValidation.errors];

        // OnEnterTrigger doesn't use payload, but allow it for flexibility
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
            type: this.type,
            displayName: 'On Enter',
            description: 'Triggered when a player enters (moves into) a space. Fires mid-movement, before all moves are complete.',
            category: 'movement',
            timing: 'immediate',
            payloadSchema: {
                // ON_ENTER doesn't require payload
            },
            examples: [
                {
                    description: 'Trigger when entering the space',
                    json: {
                        type: 'ON_ENTER',
                        payload: null
                    }
                }
            ],
            useCases: [
                'Events that fire when passing through a space',
                'Mid-movement triggers',
                'Entry-based game mechanics'
            ]
        };
    }
}
