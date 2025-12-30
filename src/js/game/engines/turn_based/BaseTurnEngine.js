import BaseGameEngine from '../../../core/base/BaseGameEngine.js';
import InputValidator from '../../../infrastructure/utils/InputValidator.js';

/**
 * BaseTurnEngine - shared turn-based helpers used by concrete engines.
 * Centralizes small utilities that were previously split across mixins.
 */
export default class BaseTurnEngine extends BaseGameEngine {
    constructor(dependencies, config = {}) {
        super(dependencies, config);
    }

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

    /**
     * Handle the branch when there are triggered events to process or not.
     * @param {Array} triggeredEvents
     * @param {Object} options
     * @param {Function} options.onEmpty - Called when no events remain
     * @param {Function} options.onProcess - Called when events exist
     */
    processTriggeredEventsFlow(triggeredEvents, { onEmpty, onProcess } = {}) {
        if (!Array.isArray(triggeredEvents) || triggeredEvents.length === 0) {
            onEmpty?.();
        } else {
            onProcess?.();
        }
    }

    /**
     * Set modal message content with optional trusted HTML.
     * @param {HTMLElement} modalMessageEl
     * @param {string} message
     * @param {Object} options
     * @param {boolean} options.trustedHtml - If true, inject as HTML; otherwise sanitize as text.
     * @param {number} options.maxLength
     */
    setModalMessage(modalMessageEl, message, { trustedHtml = false, maxLength = 500 } = {}) {
        if (!modalMessageEl) return;
        if (trustedHtml) {
            modalMessageEl.innerHTML = message;
        } else {
            modalMessageEl.textContent = InputValidator.sanitizeMessage(message, maxLength);
        }
    }
}
