/**
 * TurnFlowMixin - reusable helpers for turn flow decisions.
 */
export const TurnFlowMixin = (Base) => class extends Base {
    /**
     * Decide how to advance the turn when entering CHANGE_TURN.
     * @param {Object} options
     * @param {boolean} options.shouldSkip - Whether the current player should be skipped
     * @param {Function} options.onSkip - Callback when skipping
     * @param {Function} options.onProceed - Callback when proceeding normally
     */
    handleTurnChangeDecision({ shouldSkip, onSkip, onProceed } = {}) {
        if (shouldSkip) {
            onSkip?.();
        } else {
            onProceed?.();
        }
    }
};
