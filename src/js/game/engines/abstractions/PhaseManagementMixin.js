/**
 * PhaseManagementMixin - Provides common phase management patterns
 *
 * Many game engines use a phase-based state machine (game phases, turn phases).
 * This mixin provides reusable functionality for managing phases.
 */

export const PhaseManagementMixin = (Base) => class extends Base {
    /**
     * Change game state phase and propose update
     * @param {Object} options - Phase change options
     * @param {string} [options.newGamePhase] - New game phase
     * @param {string} [options.newTurnPhase] - New turn phase
     * @param {number} [options.delay] - Delay in ms before proposing state (-1 uses default)
     */
    changePhase({ newGamePhase, newTurnPhase, delay = -1 } = {}) {
        if (newGamePhase) {
            this.gameState.setGamePhase(newGamePhase);
        }
        if (newTurnPhase) {
            this.gameState.setTurnPhase(newTurnPhase);
        }

        const updateDelay = delay >= 0 ? delay : this.gameState.settings?.getMoveDelay?.() ?? 0;
        this.proposeStateChange(this.gameState, updateDelay);
    }

    /**
     * Get current phase as a string
     * @returns {string} Current phase in format "gamePhase:turnPhase"
     */
    getCurrentPhase() {
        const gamePhase = this.gameState?.gamePhase || 'unknown';
        const turnPhase = this.gameState?.turnPhase || 'unknown';
        return `${gamePhase}:${turnPhase}`;
    }

    /**
     * Check if in a specific game phase
     * @param {string} phase - Game phase to check
     * @returns {boolean}
     */
    isInGamePhase(phase) {
        return this.gameState?.gamePhase === phase;
    }

    /**
     * Check if in a specific turn phase
     * @param {string} phase - Turn phase to check
     * @returns {boolean}
     */
    isInTurnPhase(phase) {
        return this.gameState?.turnPhase === phase;
    }
};
