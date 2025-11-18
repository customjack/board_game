import PlayerEffect from './PlayerEffect.js';
import TurnPhases from '../../game/phases/TurnPhases.js';
import PlayerStates from '../../game/phases/PlayerStates.js';


export default class SkipTurnEffect extends PlayerEffect {
    constructor(id, duration, toRemove = false, playerIdToSkip = null) {
        super(id, duration, toRemove);
        this.playerIdToSkip = playerIdToSkip;
    }

    // Implementation of the 'apply' method, determining how this effect affects the game
    apply(gameEngine) {
        const currentPlayer = gameEngine.gameState.getCurrentPlayer();
        this.playerIdToSkip = currentPlayer.id;
        currentPlayer.addEffect(this);

        console.log(`Applying SkipTurn effect for ${this.duration} turns to player ${currentPlayer.nickname}.`);
    }

    enact(gameEngine) {
        const currentPlayer = gameEngine.gameState.getCurrentPlayer();
        if (currentPlayer.id === this.playerIdToSkip &&
            gameEngine.gameState.turnPhase === TurnPhases.CHANGE_TURN) {
            if (this.duration <= 0) {
                currentPlayer.setState(PlayerStates.PLAYING);
                this.markForRemoval();
            } else {
                console.log(`Enacting SkipTurn effect for ${this.duration} more turn(s).`);
                currentPlayer.setState(PlayerStates.SKIPPING_TURN);
                this.duration--;
            }
        }
    }

    toJSON() {
        return {
            type: this.constructor.name, // To identify the effect type during deserialization
            args: [
                {id: this.id},
                {duration: this.duration},
                {toRemove: this.toRemove},
                {playerIdToSkip: this.playerIdToSkip}
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
            type: 'SkipTurnEffect',
            displayName: 'Skip Turn',
            description: 'Forces a player to skip their turn for a specified number of rounds. The affected player will have their state set to SKIPPING_TURN during their turn.',
            category: 'turn_modifier',
            payloadSchema: {
                id: {
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for this effect instance',
                    example: 'skip_turn_1'
                },
                duration: {
                    type: 'number',
                    required: true,
                    description: 'Number of turns to skip',
                    example: 2,
                    min: 1
                },
                toRemove: {
                    type: 'boolean',
                    required: false,
                    description: 'Whether this effect is marked for removal',
                    example: false,
                    default: false
                },
                playerIdToSkip: {
                    type: 'string',
                    required: false,
                    description: 'ID of the player to skip (auto-populated when applied)',
                    example: 'player_123',
                    default: null
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
            errors.push('SkipTurnEffect duration must be at least 1');
        }

        if (this.playerIdToSkip !== null && typeof this.playerIdToSkip !== 'string') {
            errors.push('playerIdToSkip must be a string or null');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
