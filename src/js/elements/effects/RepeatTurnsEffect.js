import PlayerEffect from './PlayerEffect.js';
import TurnPhases from '../../game/engines/turn_based/TurnPhases.js';

/**
 * RepeatTurnsEffect - Grants the player N extra consecutive turns
 * More general than DoubleTurnEffect - can grant any number of extra turns
 */
export default class RepeatTurnsEffect extends PlayerEffect {
    constructor(id, extraTurns, toRemove = false, playerIdToRepeat = null, turnsGranted = 0) {
        super(id, extraTurns, toRemove);
        this.playerIdToRepeat = playerIdToRepeat;
        this.extraTurns = extraTurns; // Total extra turns to grant
        this.turnsGranted = turnsGranted; // How many extra turns have been granted so far
    }

    apply(gameEngine) {
        const currentPlayer = gameEngine.gameState.getCurrentPlayer();
        this.playerIdToRepeat = currentPlayer.id;
        currentPlayer.addEffect(this);

        console.log(`Applying RepeatTurns effect: ${currentPlayer.nickname} will get ${this.extraTurns} extra turn(s).`);
    }

    enact(gameEngine) {
        const currentPlayer = gameEngine.gameState.getCurrentPlayer();

        // Only enact during END_TURN phase for the affected player
        if (currentPlayer.id === this.playerIdToRepeat &&
            gameEngine.gameState.turnPhase === TurnPhases.END_TURN) {

            if (this.turnsGranted >= this.extraTurns) {
                // All extra turns have been granted
                console.log(`RepeatTurns effect complete for ${currentPlayer.nickname}.`);
                this.markForRemoval();
            } else {
                // Grant an extra turn by preventing the turn from advancing
                this.turnsGranted++;
                console.log(`Granting extra turn ${this.turnsGranted}/${this.extraTurns} to ${currentPlayer.nickname}.`);

                // Emit event to notify the game engine to keep the current player
                gameEngine.eventBus.emit('effect:repeat_turn', {
                    playerId: currentPlayer.id,
                    effectId: this.id,
                    turnsGranted: this.turnsGranted,
                    extraTurns: this.extraTurns
                });
            }
        }
    }

    toJSON() {
        return {
            type: this.constructor.name,
            args: [
                {id: this.id},
                {extraTurns: this.extraTurns},
                {toRemove: this.toRemove},
                {playerIdToRepeat: this.playerIdToRepeat},
                {turnsGranted: this.turnsGranted}
            ]
        };
    }

    static getMetadata() {
        return {
            type: 'RepeatTurnsEffect',
            displayName: 'Repeat Turns',
            description: 'Grants the player N extra consecutive turns. The player will take their turn multiple times in a row.',
            category: 'turn_modifier',
            payloadSchema: {
                id: {
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for this effect instance',
                    example: 'repeat_turns_1'
                },
                extraTurns: {
                    type: 'number',
                    required: true,
                    description: 'Number of extra consecutive turns to grant',
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
                playerIdToRepeat: {
                    type: 'string',
                    required: false,
                    description: 'ID of the player to grant extra turns (auto-populated when applied)',
                    example: 'player_123',
                    default: null
                },
                turnsGranted: {
                    type: 'number',
                    required: false,
                    description: 'Number of extra turns granted so far (internal counter)',
                    example: 0,
                    default: 0
                }
            }
        };
    }

    validate() {
        const baseValidation = super.validate();
        const errors = [...baseValidation.errors];

        if (this.extraTurns < 1) {
            errors.push('RepeatTurnsEffect extraTurns must be at least 1');
        }

        if (this.turnsGranted < 0) {
            errors.push('turnsGranted cannot be negative');
        }

        if (this.playerIdToRepeat !== null && typeof this.playerIdToRepeat !== 'string') {
            errors.push('playerIdToRepeat must be a string or null');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
