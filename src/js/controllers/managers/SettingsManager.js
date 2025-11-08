import Settings from '../../models/Settings';

export default class SettingsManager {
    constructor(isHost = false) {
        this.isHost = isHost;
        this.currentSettings = null;
        this.settingsElements = this.initializeInputs();
    }

    initializeSettings(gameState) {
        this.currentSettings = Settings.fromJSON(gameState.settings.toJSON());
        this.syncUIWithSettings(this.currentSettings);
    }

    initializeInputs() {
        if (this.isHost) {
            return {
                playerLimitPerPeerInput: document.getElementById('playerLimitPerPeerHost'),
                totalPlayerLimitInput: document.getElementById('totalPlayerLimitHost'),
                turnTimerInput: document.getElementById('turnTimerHost'),
                moveDelayInput: document.getElementById('moveDelayHost'),
                turnTimerEnabledInput: document.getElementById('turnTimerEnabledHost'),
                modalTimeoutInput: document.getElementById('modalTimeoutHost')
            };
        } else {
            return {
                playerLimitPerPeerDisplay: document.getElementById('playerLimitPerPeerDisplayClient'),
                totalPlayerLimitDisplay: document.getElementById('totalPlayerLimitDisplayClient'),
                turnTimerDisplay: document.getElementById('turnTimerClient'),
                moveDelayDisplay: document.getElementById('moveDelayClient'),
                turnTimerEnabledDisplay: document.getElementById('turnTimerEnabledClient'),
                modalTimeoutDisplay: document.getElementById('modalTimeoutClient')
            };
        }
    }

    getSettingsElements() {
        return this.settingsElements;
    }

    updateSettings(gameState) {
        this.currentSettings = Settings.fromJSON(gameState.settings.toJSON());
        this.syncUIWithSettings(this.currentSettings);
    }

    shouldUpdateSettings(newSettings) {
        if (!this.currentSettings) {
            return true;
        }
        return JSON.stringify(this.currentSettings) !== JSON.stringify(newSettings);
    }

    syncUIWithSettings(settings) {
        const elements = this.settingsElements;
        if (this.isHost) {
            // Host-side inputs
            if (elements.playerLimitPerPeerInput) elements.playerLimitPerPeerInput.value = settings.playerLimitPerPeer;
            if (elements.totalPlayerLimitInput) elements.totalPlayerLimitInput.value = settings.playerLimit;
            if (elements.turnTimerInput) elements.turnTimerInput.value = settings.turnTimer;
            if (elements.moveDelayInput) elements.moveDelayInput.value = settings.moveDelay;
            if (elements.turnTimerEnabledInput) elements.turnTimerEnabledInput.checked = settings.turnTimerEnabled;
            if (elements.modalTimeoutInput) elements.modalTimeoutInput.value = settings.modalTimeoutSeconds;
        } else {
            // Client-side displays
            if (elements.playerLimitPerPeerDisplay) elements.playerLimitPerPeerDisplay.textContent = settings.playerLimitPerPeer;
            if (elements.totalPlayerLimitDisplay) elements.totalPlayerLimitDisplay.textContent = settings.playerLimit;
            if (elements.turnTimerDisplay) elements.turnTimerDisplay.textContent = settings.turnTimer;
            if (elements.turnTimerEnabledDisplay) elements.turnTimerEnabledDisplay.checked = settings.turnTimerEnabled;
            if (elements.moveDelayDisplay) elements.moveDelayDisplay.textContent = settings.moveDelay;
            if (elements.modalTimeoutDisplay) elements.modalTimeoutDisplay.textContent = settings.modalTimeoutSeconds;
        }
    }

    updateGameStateFromInputs(gameState) {
        if (!this.isHost || !gameState) return gameState;

        const elements = this.settingsElements;
        if (!this.currentSettings) {
            this.currentSettings = Settings.fromJSON(gameState.settings.toJSON());
        }

        const newPlayerLimitPerPeer = this.clampValue(
            parseInt(elements.playerLimitPerPeerInput.value, 10),
            elements.playerLimitPerPeerInput.min,
            elements.playerLimitPerPeerInput.max
        );
        const newTotalPlayerLimit = this.clampValue(
            parseInt(elements.totalPlayerLimitInput.value, 10),
            elements.totalPlayerLimitInput.min,
            elements.totalPlayerLimitInput.max
        );
        const newTurnTimer = this.clampValue(
            parseInt(elements.turnTimerInput.value, 10),
            elements.turnTimerInput.min,
            elements.turnTimerInput.max
        );
        const newMoveDelay = this.clampValue(
            parseInt(elements.moveDelayInput.value, 10),
            elements.moveDelayInput.min,
            elements.moveDelayInput.max
        );
        const newTurnTimerEnabled = elements.turnTimerEnabledInput.checked; // New setting from checkbox
        const modalTimeoutInput = elements.modalTimeoutInput;
        const newModalTimeout = modalTimeoutInput
            ? this.clampValue(
                parseInt(modalTimeoutInput.value, 10),
                modalTimeoutInput.min,
                modalTimeoutInput.max
            )
            : this.currentSettings.modalTimeoutSeconds;

        // Update current settings
        this.currentSettings.playerLimitPerPeer = newPlayerLimitPerPeer;
        this.currentSettings.playerLimit = newTotalPlayerLimit;
        this.currentSettings.turnTimer = newTurnTimer;
        this.currentSettings.moveDelay = newMoveDelay;
        this.currentSettings.turnTimerEnabled = newTurnTimerEnabled; // Add new setting to current settings
        this.currentSettings.modalTimeoutSeconds = newModalTimeout;

        // Sync the UI to reflect changes
        this.syncUIWithSettings(this.currentSettings);

        // Update the game state's settings
        gameState.settings = Settings.fromJSON(this.currentSettings.toJSON());

        return gameState;
    }

    clampValue(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
}
