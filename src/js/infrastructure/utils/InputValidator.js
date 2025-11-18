/**
 * InputValidator - Utility for validating and sanitizing user input
 *
 * Prevents XSS attacks, validates data types, and ensures data integrity
 */
export default class InputValidator {
    /**
     * Sanitize a string to prevent XSS attacks
     * @param {string} input - The string to sanitize
     * @returns {string} Sanitized string
     */
    static sanitizeString(input) {
        if (typeof input !== 'string') {
            return '';
        }

        // Create a temporary div to use browser's HTML encoding
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    /**
     * Validate and sanitize a nickname
     * @param {string} nickname - The nickname to validate
     * @param {Object} options - Validation options
     * @returns {Object} {isValid: boolean, sanitized: string, error: string|null}
     */
    static validateNickname(nickname, options = {}) {
        const {
            minLength = 1,
            maxLength = 32,
            allowedCharacters = /^[a-zA-Z0-9_\- ]+$/,
            trim = true
        } = options;

        const result = {
            isValid: false,
            sanitized: '',
            error: null
        };

        // Check if input is a string
        if (typeof nickname !== 'string') {
            result.error = 'Nickname must be a string';
            return result;
        }

        // Trim if requested
        let processed = trim ? nickname.trim() : nickname;

        // Check length
        if (processed.length < minLength) {
            result.error = `Nickname must be at least ${minLength} character${minLength > 1 ? 's' : ''}`;
            return result;
        }

        if (processed.length > maxLength) {
            result.error = `Nickname must be at most ${maxLength} characters`;
            processed = processed.slice(0, maxLength);
        }

        // Check for allowed characters
        if (!allowedCharacters.test(processed)) {
            result.error = 'Nickname contains invalid characters (only letters, numbers, spaces, hyphens, and underscores allowed)';
            return result;
        }

        // Sanitize for XSS
        result.sanitized = this.sanitizeString(processed);
        result.isValid = true;
        result.error = null;

        return result;
    }

    /**
     * Validate a player ID (UUID format)
     * @param {string} playerId - The player ID to validate
     * @returns {boolean} True if valid UUID
     */
    static validatePlayerId(playerId) {
        if (typeof playerId !== 'string') {
            return false;
        }

        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(playerId);
    }

    /**
     * Validate a peer ID
     * @param {string} peerId - The peer ID to validate
     * @returns {boolean} True if valid
     */
    static validatePeerId(peerId) {
        if (typeof peerId !== 'string') {
            return false;
        }

        // PeerJS IDs can be alphanumeric with hyphens/underscores
        // Length varies but typically 8-100 characters
        // Just ensure it's not empty, not too long, and doesn't contain dangerous characters
        if (peerId.length < 1 || peerId.length > 200) {
            return false;
        }

        // Allow alphanumeric, hyphens, underscores, and dots (common in PeerJS IDs)
        // Disallow special characters that could be used for injection
        const peerIdRegex = /^[a-zA-Z0-9_.\-]+$/;
        return peerIdRegex.test(peerId);
    }

    /**
     * Validate a number within a range
     * @param {*} value - The value to validate
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @returns {Object} {isValid: boolean, value: number|null, error: string|null}
     */
    static validateNumber(value, min = -Infinity, max = Infinity) {
        const result = {
            isValid: false,
            value: null,
            error: null
        };

        // Try to parse as number
        const num = Number(value);

        if (isNaN(num)) {
            result.error = 'Value must be a number';
            return result;
        }

        if (num < min) {
            result.error = `Value must be at least ${min}`;
            return result;
        }

        if (num > max) {
            result.error = `Value must be at most ${max}`;
            return result;
        }

        result.isValid = true;
        result.value = num;
        return result;
    }

    /**
     * Validate a space ID
     * @param {*} spaceId - The space ID to validate
     * @returns {Object} {isValid: boolean, value: number|null, error: string|null}
     */
    static validateSpaceId(spaceId) {
        return this.validateNumber(spaceId, 1, 10000); // Assuming max 10000 spaces
    }

    /**
     * Validate game settings
     * @param {Object} settings - The settings object to validate
     * @returns {Object} {isValid: boolean, errors: Array<string>}
     */
    static validateGameSettings(settings) {
        const errors = [];

        // Validate player limit
        const playerLimit = this.validateNumber(settings.playerLimit, 1, 100);
        if (!playerLimit.isValid) {
            errors.push(`Player limit: ${playerLimit.error}`);
        }

        // Validate player limit per peer
        const playerLimitPerPeer = this.validateNumber(settings.playerLimitPerPeer, 1, 20);
        if (!playerLimitPerPeer.isValid) {
            errors.push(`Player limit per peer: ${playerLimitPerPeer.error}`);
        }

        // Validate turn timer
        const turnTimer = this.validateNumber(settings.turnTimer, 0, 3600); // Max 1 hour
        if (!turnTimer.isValid) {
            errors.push(`Turn timer: ${turnTimer.error}`);
        }

        // Validate move delay
        const moveDelay = this.validateNumber(settings.moveDelay, 0, 10000); // Max 10 seconds
        if (!moveDelay.isValid) {
            errors.push(`Move delay: ${moveDelay.error}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Sanitize a message/prompt for display
     * @param {string} message - The message to sanitize
     * @param {number} maxLength - Maximum message length
     * @returns {string} Sanitized message
     */
    static sanitizeMessage(message, maxLength = 500) {
        if (typeof message !== 'string') {
            return '';
        }

        let sanitized = this.sanitizeString(message);

        // Truncate if too long
        if (sanitized.length > maxLength) {
            sanitized = sanitized.slice(0, maxLength) + '...';
        }

        return sanitized;
    }

    /**
     * Validate an object has required properties
     * @param {Object} obj - The object to validate
     * @param {Array<string>} requiredProps - Required property names
     * @returns {Object} {isValid: boolean, missingProps: Array<string>}
     */
    static validateRequiredProps(obj, requiredProps) {
        const missingProps = [];

        for (const prop of requiredProps) {
            if (!(prop in obj) || obj[prop] === null || obj[prop] === undefined) {
                missingProps.push(prop);
            }
        }

        return {
            isValid: missingProps.length === 0,
            missingProps
        };
    }

    /**
     * Validate player data received from network
     * @param {Object} playerData - The player data to validate
     * @returns {Object} {isValid: boolean, errors: Array<string>}
     */
    static validatePlayerData(playerData) {
        const errors = [];

        // Check required properties
        const requiredCheck = this.validateRequiredProps(playerData, ['peerId', 'nickname']);
        if (!requiredCheck.isValid) {
            errors.push(`Missing required properties: ${requiredCheck.missingProps.join(', ')}`);
            return { isValid: false, errors };
        }

        // Validate peer ID
        if (!this.validatePeerId(playerData.peerId)) {
            errors.push('Invalid peer ID format');
        }

        // Validate nickname
        const nicknameCheck = this.validateNickname(playerData.nickname);
        if (!nicknameCheck.isValid) {
            errors.push(`Nickname: ${nicknameCheck.error}`);
        }

        // Validate player ID if present
        if (playerData.playerId && !this.validatePlayerId(playerData.playerId)) {
            errors.push('Invalid player ID format');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Rate limiting helper - tracks action counts per time window
     */
    static rateLimiter = new Map();

    /**
     * Check if an action should be rate limited
     * @param {string} key - Unique key for this action/user
     * @param {number} maxActions - Maximum actions allowed in time window
     * @param {number} windowMs - Time window in milliseconds
     * @returns {boolean} True if action is allowed, false if rate limited
     */
    static checkRateLimit(key, maxActions = 10, windowMs = 1000) {
        const now = Date.now();
        const limitData = this.rateLimiter.get(key) || { count: 0, resetTime: now + windowMs };

        // Reset if window expired
        if (now >= limitData.resetTime) {
            limitData.count = 0;
            limitData.resetTime = now + windowMs;
        }

        // Check if over limit
        if (limitData.count >= maxActions) {
            return false;
        }

        // Increment count
        limitData.count++;
        this.rateLimiter.set(key, limitData);

        return true;
    }

    /**
     * Clean up old rate limit entries (call periodically)
     */
    static cleanupRateLimiter() {
        const now = Date.now();
        for (const [key, data] of this.rateLimiter.entries()) {
            if (now >= data.resetTime + 60000) { // 1 minute grace period
                this.rateLimiter.delete(key);
            }
        }
    }
}

// Clean up rate limiter every 5 minutes
setInterval(() => {
    InputValidator.cleanupRateLimiter();
}, 5 * 60 * 1000);
