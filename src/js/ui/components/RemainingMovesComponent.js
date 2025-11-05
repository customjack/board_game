/**
 * RemainingMovesComponent - Displays remaining moves in turn-based games
 *
 * Shows the number of moves the current player has left
 */
import BaseUIComponent from '../BaseUIComponent.js';

export default class RemainingMovesComponent extends BaseUIComponent {
    /**
     * Create a remaining moves component
     * @param {Object} config - Component configuration
     */
    constructor(config = {}) {
        super({
            id: 'remainingMoves',
            containerId: 'remainingMovesContainer',
            ...config
        });

        this.countElement = null;
        this.currentMoves = 0;
    }

    /**
     * Initialize the component
     */
    init() {
        super.init();

        // Get count element
        this.countElement = this.getElement('remainingMovesCount');

        if (!this.countElement) {
            console.warn('Remaining moves count element not found');
        }

        // Hide by default
        this.hide();
    }

    /**
     * Update remaining moves display
     * @param {GameState} gameState - Current game state
     * @param {Object} context - Additional context
     */
    update(gameState, context = {}) {
        if (!this.initialized) return;

        // Update moves count
        const moves = gameState.remainingMoves || 0;
        this.updateMoves(moves);

        // Show/hide based on game state
        if (gameState.gameStarted && !gameState.gameEnded) {
            this.show();
        } else {
            this.hide();
        }
    }

    /**
     * Update the moves count
     * @param {number} moves - Number of remaining moves
     */
    updateMoves(moves) {
        // Lazy load element if not cached
        if (!this.countElement) {
            this.countElement = this.getElement('remainingMovesCount');
        }

        if (this.countElement) {
            this.currentMoves = moves;
            this.countElement.textContent = moves;
        }
    }

    /**
     * Show the component
     */
    show() {
        super.show();
        this.emit('remainingMovesShown', { moves: this.currentMoves });
    }

    /**
     * Hide the component
     */
    hide() {
        super.hide();
        this.emit('remainingMovesHidden');
    }

    /**
     * Get component state
     * @returns {Object} Component state
     */
    getState() {
        return {
            ...super.getState(),
            currentMoves: this.currentMoves,
            hasCountElement: !!this.countElement
        };
    }
}
