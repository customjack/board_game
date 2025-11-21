import InputValidator from '../../../infrastructure/utils/InputValidator.js';

/**
 * PromptRenderingMixin - utilities for rendering/sanitizing prompt messages.
 */
export const PromptRenderingMixin = (Base) => class extends Base {
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
};
