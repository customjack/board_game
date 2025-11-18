/**
 * DiceRollMixin - Provides common dice rolling patterns
 *
 * Many game engines need dice rolling functionality.
 * This mixin provides reusable functionality for that pattern.
 */

export const DiceRollMixin = (Base) => class extends Base {
    /**
     * Roll dice for the current player
     * @param {number} [numDice=1] - Number of dice to roll
     * @param {number} [sides=6] - Number of sides per die
     * @returns {number|Array<number>} Roll result(s)
     */
    rollDiceForCurrentPlayer(numDice = 1, sides = 6) {
        const currentPlayer = this.gameState?.getCurrentPlayer?.();
        if (!currentPlayer) {
            console.warn('[DiceRoll] No current player');
            return numDice === 1 ? 0 : [];
        }

        // Use player's roll method if available (handles seeded RNG)
        if (currentPlayer.rollDice && typeof currentPlayer.rollDice === 'function') {
            const result = currentPlayer.rollDice();
            this.logPlayerAction?.(currentPlayer, `rolled a ${result}.`, {
                type: 'dice-roll',
                metadata: { result }
            });
            return result;
        }

        // Fallback: standard dice roll
        const results = [];
        for (let i = 0; i < numDice; i++) {
            results.push(Math.floor(Math.random() * sides) + 1);
        }

        const total = results.reduce((sum, val) => sum + val, 0);
        const result = numDice === 1 ? results[0] : results;

        this.logPlayerAction?.(currentPlayer, `rolled ${numDice === 1 ? result : results.join(', ')}.`, {
            type: 'dice-roll',
            metadata: { result, results, total, numDice, sides }
        });

        return result;
    }

    /**
     * Activate the roll button for the current player
     */
    activateRollButton() {
        // Try UIComponentRegistry first
        const rollButton = this.getUIComponent?.('rollButton');
        if (rollButton?.activate) {
            rollButton.activate();
            return;
        }

        // Try UISystem
        if (this.uiSystem) {
            const btn = this.uiSystem.getComponent('rollButton');
            if (btn?.activate) {
                btn.activate();
                return;
            }
        }

        // Legacy UIController
        if (this.uiController?.activateRollButton) {
            this.uiController.activateRollButton();
        }
    }

    /**
     * Deactivate the roll button
     */
    deactivateRollButton() {
        const rollButton = this.getUIComponent?.('rollButton');
        if (rollButton?.deactivate) {
            rollButton.deactivate();
            return;
        }

        if (this.uiSystem) {
            const btn = this.uiSystem.getComponent('rollButton');
            if (btn?.deactivate) {
                btn.deactivate();
                return;
            }
        }

        if (this.uiController?.deactivateRollButton) {
            this.uiController.deactivateRollButton();
        }
    }
};
