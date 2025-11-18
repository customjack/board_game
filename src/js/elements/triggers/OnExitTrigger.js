import BaseTrigger from './BaseTrigger.js';
import TriggerTypes from '../../infrastructure/utils/TriggerTypes.js';

/**
 * OnExitTrigger - Triggered when a player exits (leaves) a space
 *
 * This trigger fires when the player's previous move was from this space.
 * It checks the movement history to determine if the player just left.
 *
 * Use Cases:
 * - "When you leave this space, move back 1"
 * - "Exiting this space costs you a turn"
 * - Events that should fire when departing from a space
 */
export default class OnExitTrigger extends BaseTrigger {
    constructor(type, payload = null) {
        super(type, payload);
    }

    /**
     * Check if player has exited from this space
     * @param {Object} context - Trigger evaluation context
     * @returns {boolean} True if player's last move was from this space
     */
    isTriggered(context) {
        const { gameState, space, eventBus } = context;

        // Emit pre-check event
        this.emitEvent(eventBus, 'triggerCheckStarted', { gameState, space });

        const player = gameState.getCurrentPlayer();

        // Get the second most recent move (the space they left from)
        const lastMove = player.movementHistory.getPreviousMove(1);

        // Check if that move's space ID matches this space
        const isTriggered = lastMove && lastMove.spaceId === space.id;

        // Emit post-check event
        this.emitEvent(eventBus, 'triggerCheckEnded', {
            result: isTriggered,
            gameState,
            space
        });

        // Debug logging
        if (isTriggered) {
            console.log(`OnExitTrigger activated for space ID ${space.id} by player ${player.nickname}`);
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

        // OnExitTrigger doesn't use payload, but allow it for flexibility
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
            type: TriggerTypes.ON_EXIT,
            displayName: 'On Exit',
            description: 'Triggered when a player exits (leaves) a space. Checks movement history to detect when the player has departed.',
            category: 'movement',
            timing: 'immediate',
            payloadSchema: {
                // ON_EXIT doesn't require payload
            },
            examples: [
                {
                    description: 'Trigger when exiting the space',
                    json: {
                        type: 'ON_EXIT',
                        payload: null
                    }
                }
            ],
            useCases: [
                'Events that fire when leaving a space',
                'Exit penalties or bonuses',
                'Departure-based game mechanics'
            ]
        };
    }
}
