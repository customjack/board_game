import PlayerEffect from './PlayerEffect.js';
import TurnPhases from '../../game/phases/TurnPhases.js';

/**
 * DoubleTurnEffect - Grants the player an extra turn
 */
export default class DoubleTurnEffect extends PlayerEffect {
    constructor(id, duration, toRemove = false, playerIdToDouble = null, hasUsed = false) {
        super(id, duration, toRemove);
        this.playerIdToDouble = playerIdToDouble;
        this.hasUsed = hasUsed; // Track if the extra turn has been granted
    }

    // Implementation of the 'apply' method
    apply(gameEngine) {
        const currentPlayer = gameEngine.gameState.getCurrentPlayer();
        this.playerIdToDouble = currentPlayer.id;
        currentPlayer.addEffect(this);

        console.log(`Applying DoubleTurn effect for ${this.duration} turn(s) to player ${currentPlayer.nickname}.`);
    }

    enact(gameEngine) {
        const currentPlayer = gameEngine.gameState.getCurrentPlayer();

        // Check if it's the target player's turn and we're in the appropriate phase
        if (currentPlayer.id === this.playerIdToDouble &&
            gameEngine.gameState.turnPhase === TurnPhases.END_TURN &&
            !this.hasUsed) {

            console.log(`Enacting DoubleTurn effect for player ${currentPlayer.nickname}.`);

            // Grant an extra turn by NOT advancing to next player
            // We'll do this by emitting an event that the game engine can handle
            gameEngine.eventBus.emit('effect:double_turn', {
                playerId: currentPlayer.id,
                effectId: this.id
            });

            this.hasUsed = true;
            this.duration--;

            if (this.duration <= 0) {
                this.markForRemoval();
            }
        }
    }

    toJSON() {
        return {
            type: this.constructor.name,
            args: [
                {id: this.id},
                {duration: this.duration},
                {toRemove: this.toRemove},
                {playerIdToDouble: this.playerIdToDouble},
                {hasUsed: this.hasUsed}
            ]
        };
    }

    /**
     * Get metadata about this effect type
     * @static
     * @returns {Object} Metadata including displayName, description, and payload schema
     */
    static getMetadata() {
        return {
            type: 'DoubleTurnEffect',
            displayName: 'Double Turn',
            description: 'Grants the player an extra turn immediately after their current turn ends.',
            category: 'turn_modifier',
            payloadSchema: {
                id: {
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for this effect instance',
                    example: 'double_turn_1'
                },
                duration: {
                    type: 'number',
                    required: true,
                    description: 'Number of times this effect can trigger',
                    example: 1,
                    min: 1
                },
                toRemove: {
                    type: 'boolean',
                    required: false,
                    description: 'Whether this effect is marked for removal',
                    example: false,
                    default: false
                },
                playerIdToDouble: {
                    type: 'string',
                    required: false,
                    description: 'ID of the player to grant extra turn (auto-populated when applied)',
                    example: 'player_123',
                    default: null
                },
                hasUsed: {
                    type: 'boolean',
                    required: false,
                    description: 'Whether the extra turn has been granted',
                    example: false,
                    default: false
                }
            }
        };
    }

    /**
     * Validate the effect's configuration
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        const baseValidation = super.validate();
        const errors = [...baseValidation.errors];

        if (this.duration < 1) {
            errors.push('DoubleTurnEffect duration must be at least 1');
        }

        if (this.playerIdToDouble !== null && typeof this.playerIdToDouble !== 'string') {
            errors.push('playerIdToDouble must be a string or null');
        }

        if (typeof this.hasUsed !== 'boolean') {
            errors.push('hasUsed must be a boolean');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
