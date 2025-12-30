import PlayerEffect from './PlayerEffect.js';
import TurnPhases from '../../game/engines/turn_based/phases/TurnPhases.js';
import { PlayerStates } from '../../elements/models/Player.js';

/**
 * SkipTurnsEffect - Forces a player to skip N turns
 * More general than SkipTurnEffect - can skip any number of turns
 */
export default class SkipTurnsEffect extends PlayerEffect {
    constructor(id, turnsToSkip, toRemove = false, playerIdToSkip = null, turnsSkipped = 0) {
        super(id, turnsToSkip, toRemove);
        this.playerIdToSkip = playerIdToSkip;
        this.turnsToSkip = turnsToSkip; // Total turns to skip
        this.turnsSkipped = turnsSkipped; // How many turns have been skipped so far
    }

    apply(gameEngine) {
        const currentPlayer = gameEngine.gameState.getCurrentPlayer();
        this.playerIdToSkip = currentPlayer.id;
        currentPlayer.addEffect(this);

        console.log(`Applying SkipTurns effect: ${currentPlayer.nickname} will skip ${this.turnsToSkip} turn(s).`);
    }

    enact(gameEngine) {
        const currentPlayer = gameEngine.gameState.getCurrentPlayer();

        // Only enact during CHANGE_TURN phase for the affected player
        if (currentPlayer.id === this.playerIdToSkip &&
            gameEngine.gameState.turnPhase === TurnPhases.CHANGE_TURN) {

            if (this.turnsSkipped >= this.turnsToSkip) {
                // All turns have been skipped, restore player to PLAYING state
                console.log(`SkipTurns effect complete for ${currentPlayer.nickname}. Returning to normal play.`);
                currentPlayer.setState(PlayerStates.PLAYING);
                this.markForRemoval();
            } else {
                // Skip this turn
                this.turnsSkipped++;
                console.log(`Skipping turn ${this.turnsSkipped}/${this.turnsToSkip} for ${currentPlayer.nickname}.`);
                currentPlayer.setState(PlayerStates.SKIPPING_TURN);
            }
        }
    }

    toJSON() {
        return {
            type: this.constructor.name,
            args: [
                {id: this.id},
                {turnsToSkip: this.turnsToSkip},
                {toRemove: this.toRemove},
                {playerIdToSkip: this.playerIdToSkip},
                {turnsSkipped: this.turnsSkipped}
            ]
        };
    }

    static getMetadata() {
        return {
            type: 'SkipTurnsEffect',
            displayName: 'Skip Turns',
            description: 'Forces a player to skip N consecutive turns. The affected player will have their state set to SKIPPING_TURN during each skipped turn.',
            category: 'turn_modifier',
            payloadSchema: {
                id: {
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for this effect instance',
                    example: 'skip_turns_1'
                },
                turnsToSkip: {
                    type: 'number',
                    required: true,
                    description: 'Number of consecutive turns to skip',
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
                },
                turnsSkipped: {
                    type: 'number',
                    required: false,
                    description: 'Number of turns skipped so far (internal counter)',
                    example: 0,
                    default: 0
                }
            }
        };
    }

    validate() {
        const baseValidation = super.validate();
        const errors = [...baseValidation.errors];

        if (this.turnsToSkip < 1) {
            errors.push('SkipTurnsEffect turnsToSkip must be at least 1');
        }

        if (this.turnsSkipped < 0) {
            errors.push('turnsSkipped cannot be negative');
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
