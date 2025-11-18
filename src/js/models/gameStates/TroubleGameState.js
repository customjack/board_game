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
        this.currentPlayerIndex = config.currentPlayerIndex || 0;
    }

    getStateType() {
        return 'trouble';
    }

    /**
     * Set the current player index
     * @param {number} index - Player index
     */
    setCurrentPlayerIndex(index) {
        this.currentPlayerIndex = index;
    }

    /**
     * Get current player based on index
     * @returns {Player|null} Current player
     */
    getCurrentPlayer() {
        if (!Array.isArray(this.players) || this.players.length === 0) {
            return null;
        }
        return this.players[this.currentPlayerIndex % this.players.length] || null;
    }

    /**
     * Get list of top-level fields that should be included in delta updates
     * Trouble state is primarily in pluginState.trouble, which is already
     * handled by StateDelta's composite field checking.
     * @returns {Array<string>} Field names to include in deltas
     */
    getDeltaFields() {
        return [
            ...super.getDeltaFields(),
            'currentPlayerIndex'
            // pluginState is handled separately by StateDelta
        ];
    }

    toJSON() {
        return {
            ...super.toJSON(),
            currentPlayerIndex: this.currentPlayerIndex
        };
    }

    static fromJSON(json, factoryManager) {
        const state = super.fromJSON(json, factoryManager);
        state.currentPlayerIndex = json.currentPlayerIndex || 0;
        return state;
    }
}
