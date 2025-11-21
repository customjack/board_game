import InputValidator from './InputValidator.js';

/**
 * Prepare a prompt message with optional trusted HTML.
 * @param {string} message
 * @param {Object} options
 * @param {boolean} options.trustedHtml - If true, return raw HTML; else sanitize text.
 * @param {number} options.maxLength - Max length before truncation.
 * @returns {string}
 */
export function sanitizePromptMessage(message, { trustedHtml = false, maxLength = 500 } = {}) {
    if (typeof message !== 'string') return '';
    return trustedHtml ? message : InputValidator.sanitizeMessage(message, maxLength, false);
}
