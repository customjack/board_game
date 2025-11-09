/**
 * SettingsManager - Manages game settings with schema-based validation
 *
 * Refactored to use SettingsModal and settings-schema for
 * automatic UI generation and validation.
 */

import Settings from '../../models/Settings.js';
import SettingsModal from '../../ui/components/SettingsModal.js';
import { validateAllSettings, GAME_SETTINGS_SCHEMA } from '../../config/settings-schema.js';

export default class SettingsManager {
    constructor(isHost = false) {
        this.isHost = isHost;
        this.currentSettings = null;
        this.settingsModal = null;
        this.onChangeCallback = null;
    }

    /**
     * Initialize settings from game state
     * @param {GameState} gameState - Game state with settings
     */
    initializeSettings(gameState) {
        this.currentSettings = Settings.fromJSON(gameState.settings.toJSON());

        // Initialize modal if not already created
        if (!this.settingsModal) {
            this.initializeModal();
        }

        this.syncModalWithSettings(this.currentSettings);
    }

    /**
     * Initialize the settings modal
     */
    initializeModal() {
        this.settingsModal = new SettingsModal({
            isHost: this.isHost,
            settings: this.currentSettings,
            onChange: this.isHost ? (settingId, value) => this.handleSettingChange(settingId, value) : null
        });

        this.settingsModal.init();
        this.settingsModal.render();
    }

    /**
     * Handle setting change (host only)
     * @param {string} settingId - Setting that changed
     * @param {any} value - New value
     */
    handleSettingChange(settingId, value) {
        console.log(`Setting changed: ${settingId} = ${value}`);

        // Notify callback if set
        if (this.onChangeCallback) {
            this.onChangeCallback();
        }
    }

    /**
     * Set callback for when settings change
     * @param {Function} callback - Callback function
     */
    setOnChangeCallback(callback) {
        this.onChangeCallback = callback;
    }

    /**
     * Update settings from game state
     * @param {GameState} gameState - Game state with updated settings
     */
    updateSettings(gameState) {
        this.currentSettings = Settings.fromJSON(gameState.settings.toJSON());

        // Initialize modal if not already created
        if (!this.settingsModal) {
            this.initializeModal();
        }

        this.syncModalWithSettings(this.currentSettings);
    }

    /**
     * Check if settings should be updated
     * @param {Settings} newSettings - New settings to compare
     * @returns {boolean} True if update needed
     */
    shouldUpdateSettings(newSettings) {
        if (!this.currentSettings) {
            return true;
        }
        return JSON.stringify(this.currentSettings) !== JSON.stringify(newSettings);
    }

    /**
     * Sync modal with settings object
     * @param {Settings} settings - Settings to display
     */
    syncModalWithSettings(settings) {
        if (this.settingsModal) {
            this.settingsModal.updateFromSettings(settings);
        }
    }

    /**
     * Show the settings modal
     */
    showSettings() {
        if (!this.settingsModal) {
            this.initializeModal();
        }
        this.settingsModal.show();
    }

    /**
     * Hide the settings modal
     */
    hideSettings() {
        if (this.settingsModal) {
            this.settingsModal.hide();
        }
    }

    /**
     * Update game state from current modal inputs (host only)
     * @param {GameState} gameState - Game state to update
     * @returns {GameState} Updated game state
     */
    updateGameStateFromInputs(gameState) {
        if (!this.isHost || !gameState || !this.settingsModal) {
            return gameState;
        }

        // Get all values from modal
        const rawValues = this.settingsModal.getAllValues();

        // Validate all settings
        const validation = validateAllSettings(rawValues);

        if (!validation.valid) {
            console.warn('Settings validation errors:', validation.errors);
        }

        // Use validated settings
        const validatedSettings = validation.settings;

        // Update current settings
        if (!this.currentSettings) {
            this.currentSettings = Settings.fromJSON(gameState.settings.toJSON());
        }

        // Apply validated settings to current settings
        GAME_SETTINGS_SCHEMA.forEach(schema => {
            if (validatedSettings[schema.id] !== undefined) {
                this.currentSettings[schema.id] = validatedSettings[schema.id];
            }
        });

        // Sync modal to reflect any clamped values
        this.syncModalWithSettings(this.currentSettings);

        // Update game state
        gameState.settings = Settings.fromJSON(this.currentSettings.toJSON());

        return gameState;
    }

    /**
     * Get settings elements (for backwards compatibility)
     * @deprecated Use settingsModal methods instead
     * @returns {Object} Map of setting IDs to elements
     */
    getSettingsElements() {
        if (!this.settingsModal) {
            return {};
        }

        const elements = {};
        GAME_SETTINGS_SCHEMA.forEach(schema => {
            const element = this.settingsModal.elements.get(schema.id);
            if (element) {
                elements[schema.id] = element;
            }
        });

        return elements;
    }

    /**
     * Legacy method for backwards compatibility
     * @deprecated
     */
    initializeInputs() {
        // No longer needed - modal handles this
        return {};
    }

    /**
     * Clean up
     */
    cleanup() {
        if (this.settingsModal) {
            this.settingsModal.cleanup();
            this.settingsModal = null;
        }
    }
}
