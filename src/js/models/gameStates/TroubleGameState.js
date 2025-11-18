import BaseGameState from './BaseGameState.js';

/**
 * TroubleGameState - Game state for Trouble game engine
 *
 * This is a lightweight state class that works with TroubleGameEngine.
 * It primarily serves as a marker for the game type and ensures
 * compatibility with the modular state system.
 *
 * The actual Trouble-specific state (pieces, positions, etc.) is managed
 * in gameState.pluginState.trouble by the TroubleGameEngine.
 */
export default class TroubleGameState extends BaseGameState {
    constructor(config = {}) {
        super(config);
    }

    getStateType() {
        return 'trouble';
    }

    /**
     * Get list of top-level fields that should be included in delta updates
     * Trouble state is primarily in pluginState.trouble, which is already
     * handled by StateDelta's composite field checking.
     * @returns {Array<string>} Field names to include in deltas
     */
    getDeltaFields() {
        return [
            ...super.getDeltaFields()
            // pluginState is handled separately by StateDelta
        ];
    }

    toJSON() {
        return {
            ...super.toJSON()
        };
    }

    static fromJSON(json, factoryManager) {
        return super.fromJSON(json, factoryManager);
    }
}
