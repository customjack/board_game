/**
 * Settings Model - Game settings with schema-based defaults
 *
 * Refactored to use settings-schema for default values and validation.
 * Now adding new settings only requires updating the schema!
 */

import { getDefaultSettings, GAME_SETTINGS_SCHEMA, validateAllSettings } from '../../config/settings-schema.js';

export default class Settings {
    /**
     * Constructs a new Settings instance
     * Uses schema defaults, but allows overrides via params object
     * @param {Object} params - Settings parameters (optional)
     */
    constructor(params = {}) {
        // Get default values from schema
        const defaults = getDefaultSettings();

        // Merge defaults with provided params
        const mergedSettings = { ...defaults, ...params };

        // Apply all settings from schema
        GAME_SETTINGS_SCHEMA.forEach(schema => {
            this[schema.id] = mergedSettings[schema.id];
        });
    }

    /**
     * Method to return the settings in an object format
     * @returns {Object} The settings serialized as an object
     */
    toJSON() {
        const json = {};

        GAME_SETTINGS_SCHEMA.forEach(schema => {
            json[schema.id] = this[schema.id];
        });

        return json;
    }

    /**
     * Static method to create a Settings object from a JSON object
     * @param {Object} json - The JSON object containing the settings data
     * @returns {Settings} A new Settings instance
     */
    static fromJSON(json = {}) {
        // Validate and use validated values
        const validation = validateAllSettings(json);

        if (!validation.valid) {
            console.warn('Settings validation warnings:', validation.errors);
        }

        return new Settings(validation.settings);
    }

    /**
     * Legacy constructor for backwards compatibility
     * @deprecated Use new Settings(params) instead
     */
    static createLegacy(
        playerLimitPerPeer = 1,
        playerLimit = 8,
        turnTimer = 150,
        moveDelay = 300,
        turnTimerEnabled = false,
        modalTimeoutSeconds = 15
    ) {
        return new Settings({
            playerLimitPerPeer,
            playerLimit,
            turnTimer,
            moveDelay,
            turnTimerEnabled,
            modalTimeoutSeconds
        });
    }

    // ========================================
    // Getters and Setters (for IDE autocomplete and backwards compatibility)
    // ========================================

    /**
     * Gets the turn timer value
     * @returns {number} Turn timer in seconds
     */
    getTurnTimer() {
        return this.turnTimer;
    }

    /**
     * Sets the turn timer for each player's turn
     * @param {number} seconds - The new time limit for each turn in seconds
     */
    setTurnTimer(seconds) {
        this.turnTimer = seconds;
    }

    /**
     * Gets the move delay value
     * @returns {number} Move delay in milliseconds
     */
    getMoveDelay() {
        return this.moveDelay;
    }

    /**
     * Sets the move delay between moves
     * @param {number} milliseconds - The delay in milliseconds
     */
    setMoveDelay(milliseconds) {
        this.moveDelay = milliseconds;
    }

    /**
     * Gets the player limit per peer
     * @returns {number} Max players per peer
     */
    getPlayerLimitPerPeer() {
        return this.playerLimitPerPeer;
    }

    /**
     * Sets the player limit per peer
     * @param {number} limit - Maximum players per peer
     */
    setPlayerLimitPerPeer(limit) {
        this.playerLimitPerPeer = limit;
    }

    /**
     * Gets the total player limit
     * @returns {number} Total player limit
     */
    getPlayerLimit() {
        return this.playerLimit;
    }

    /**
     * Sets the total player limit
     * @param {number} limit - Total player limit
     */
    setPlayerLimit(limit) {
        this.playerLimit = limit;
    }

    /**
     * Gets whether turn timer is enabled
     * @returns {boolean} Turn timer enabled state
     */
    getTurnTimerEnabled() {
        return this.turnTimerEnabled;
    }

    /**
     * Sets whether turn timer is enabled
     * @param {boolean} enabled - Turn timer enabled state
     */
    setTurnTimerEnabled(enabled) {
        this.turnTimerEnabled = enabled;
    }

    /**
     * Gets the modal timeout in seconds
     * @returns {number} Modal timeout in seconds
     */
    getModalTimeoutSeconds() {
        return this.modalTimeoutSeconds;
    }

    /**
     * Sets the modal auto-dismiss timeout
     * @param {number} seconds - Timeout in seconds (0 to disable)
     */
    setModalTimeoutSeconds(seconds) {
        this.modalTimeoutSeconds = seconds;
    }

    /**
     * Clone the settings object
     * @returns {Settings} A new Settings instance with the same values
     */
    clone() {
        return Settings.fromJSON(this.toJSON());
    }

    /**
     * Compare with another Settings object
     * @param {Settings} other - Settings to compare with
     * @returns {boolean} True if all settings match
     */
    equals(other) {
        if (!other) return false;

        return GAME_SETTINGS_SCHEMA.every(schema =>
            this[schema.id] === other[schema.id]
        );
    }

    /**
     * Get a human-readable summary of settings
     * @returns {string} Summary string
     */
    toString() {
        const parts = [];

        GAME_SETTINGS_SCHEMA.forEach(schema => {
            parts.push(`${schema.label}: ${this[schema.id]}`);
        });

        return parts.join(', ');
    }
}
