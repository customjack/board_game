import PlayerEffect from './PlayerEffect.js';

/**
 * ChangeDirectionEffect - Allows the player to traverse backwards
 *
 * NOTE: This is a placeholder implementation. Full backwards traversal
 * requires building a reverse connection map from the board structure.
 * The effect is applied but the actual backwards movement logic needs
 * to be implemented in the movement system.
 */
export default class ChangeDirectionEffect extends PlayerEffect {
    constructor(id, duration, toRemove = false, playerIdReversed = null, isReversed = false) {
        super(id, duration, toRemove);
        this.playerIdReversed = playerIdReversed;
        this.isReversed = isReversed; // Track if player is currently reversed
    }

    // Implementation of the 'apply' method
    apply(gameEngine) {
        const currentPlayer = gameEngine.gameState.getCurrentPlayer();
        this.playerIdReversed = currentPlayer.id;
        this.isReversed = true;
        currentPlayer.addEffect(this);

        console.log(`Applying ChangeDirection effect for ${this.duration} turn(s) to player ${currentPlayer.nickname}.`);
        console.warn(`Note: Full backwards traversal is not yet implemented.`);
        console.warn(`This requires computing reverse connections from the board structure.`);
    }

    enact(gameEngine) {
        const currentPlayer = gameEngine.gameState.getCurrentPlayer();

        // Check if this effect applies to the current player
        if (currentPlayer.id === this.playerIdReversed) {
            console.log(`Player ${currentPlayer.nickname} is moving in reverse direction.`);

            // TODO: Implement reverse movement logic
            // Options:
            // 1. Pre-compute reverse connection map from board (O(n) space, O(1) lookup)
            // 2. Compute reverse connections on-demand (O(n) time per lookup)
            // 3. Store bidirectional connections in board structure
            //
            // The movement system would need to check if this effect is active
            // and use the reverse connections instead of forward connections

            this.duration--;

            if (this.duration <= 0) {
                console.log(`ChangeDirection effect expired for ${currentPlayer.nickname}.`);
                this.isReversed = false;
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
                {playerIdReversed: this.playerIdReversed},
                {isReversed: this.isReversed}
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
            type: 'ChangeDirectionEffect',
            displayName: 'Change Direction (Not Implemented)',
            description: 'Allows the player to traverse backwards for a specified number of turns. Currently not fully implemented - requires reverse connection mapping in the movement system.',
            category: 'movement_modifier',
            payloadSchema: {
                id: {
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for this effect instance',
                    example: 'change_direction_1'
                },
                duration: {
                    type: 'number',
                    required: true,
                    description: 'Number of turns to move in reverse',
                    example: 3,
                    min: 1
                },
                toRemove: {
                    type: 'boolean',
                    required: false,
                    description: 'Whether this effect is marked for removal',
                    example: false,
                    default: false
                },
                playerIdReversed: {
                    type: 'string',
                    required: false,
                    description: 'ID of the player moving in reverse (auto-populated when applied)',
                    example: 'player_123',
                    default: null
                },
                isReversed: {
                    type: 'boolean',
                    required: false,
                    description: 'Whether the player is currently reversed',
                    example: true,
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
            errors.push('ChangeDirectionEffect duration must be at least 1');
        }

        if (this.playerIdReversed !== null && typeof this.playerIdReversed !== 'string') {
            errors.push('playerIdReversed must be a string or null');
        }

        if (typeof this.isReversed !== 'boolean') {
            errors.push('isReversed must be a boolean');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
