/**
 * TimerComponent - Turn timer display and control
 *
 * Manages the countdown timer with pause/resume functionality
 * and paused message display
 */
import BaseUIComponent from '../BaseUIComponent.js';

export default class TimerComponent extends BaseUIComponent {
    /**
     * Create a timer component
     * @param {Object} config - Component configuration
     * @param {Animation} config.animation - Timer animation instance
     * @param {GameState} config.gameState - Game state for settings
     */
    constructor(config = {}) {
        super({
            id: 'timer',
            containerId: 'timerContainer',
            ...config
        });

        this.animation = config.animation || null;
        this.gameState = config.gameState || null;
        this.onTimerEndCallback = null;
        this.pauseCallback = null;
        this.pausedMessage = null;
        this.running = false;
        this.paused = false;

        this.animationInitialized = false;
        this.animationInitializedAsDisabled = false;
    }

    /**
     * Initialize the component
     * @param {Object} callbacks - Callback functions
     * @param {Function} callbacks.onTimerEnd - Called when timer reaches zero
     * @param {Function} callbacks.onPauseToggle - Called when pause button clicked
     */
    init(callbacks = {}) {
        super.init();

        this.onTimerEndCallback = callbacks.onTimerEnd || null;
        this.pauseCallback = callbacks.onPauseToggle || null;

        this.ensureAnimationInitialized(this.gameState?.settings?.turnTimerEnabled === true);
    }

    /**
     * Start the timer
     */
    startTimer() {
        const timerEnabled = this.gameState?.settings?.turnTimerEnabled === true;
        if (!timerEnabled) {
            return; // Timer disabled
        }

        this.ensureAnimationInitialized(true);

        // Ensure the timer element is visible when enabled
        const timerContainer = document.querySelector('.timer-container');
        if (timerContainer) {
            timerContainer.style.display = '';
        }

        this.stopTimer(); // Clear any existing timer

        const duration = this.gameState.settings.getTurnTimer();

        if (this.animation) {
            this.animation.start({ duration }, () => {
                // Timer reached zero
                this.running = false;
                if (this.onTimerEndCallback) {
                    this.onTimerEndCallback();
                }
                this.emit('timerEnded');
            });
        }

        this.running = true;
        this.paused = false;
        this.emit('timerStarted', { duration });
    }

    /**
     * Stop the timer
     */
    stopTimer() {
        if (this.animation) {
            this.animation.cleanup();
        }
        this.running = false;
        this.paused = false;
        this.hidePausedMessage();
        this.emit('timerStopped');
    }

    /**
     * Pause the timer
     */
    pauseTimer() {
        if (!this.gameState || !this.gameState.settings.turnTimerEnabled) {
            return;
        }

        if (this.animation) {
            this.animation.pause();
        }

        this.paused = true;
        this.showPausedMessage();
        this.emit('timerPaused');
    }

    /**
     * Resume the timer
     */
    resumeTimer() {
        if (!this.gameState || !this.gameState.settings.turnTimerEnabled) {
            return;
        }

        if (this.animation) {
            this.animation.resume();
        }

        this.paused = false;
        this.hidePausedMessage();
        this.emit('timerResumed');
    }

    /**
     * Create the paused message element
     */
    createPausedMessage() {
        if (this.pausedMessage) return;

        const pausedMessage = document.createElement('div');
        pausedMessage.id = 'pausedMessage';
        pausedMessage.textContent = 'Game Paused';
        pausedMessage.classList.add('paused-message');

        // Try to insert into pausedMessageContainer
        const pausedMessageContainer = document.getElementById('pausedMessageContainer');
        if (pausedMessageContainer) {
            pausedMessageContainer.appendChild(pausedMessage);
        } else {
            // Fallback: insert into game sidebar
            const gameSidebar = document.getElementById('gameSidebar');
            if (gameSidebar) {
                gameSidebar.insertBefore(pausedMessage, gameSidebar.firstChild);
            }
        }

        this.pausedMessage = pausedMessage;
    }

    /**
     * Show the paused message
     */
    showPausedMessage() {
        if (this.pausedMessage) {
            this.pausedMessage.style.display = 'block';
        }
    }

    /**
     * Hide the paused message
     */
    hidePausedMessage() {
        if (this.pausedMessage) {
            this.pausedMessage.style.display = 'none';
        }
    }

    /**
     * Update component based on game state
     * @param {GameState} gameState - Current game state
     * @param {Object} context - Additional context
     */
    update(gameState, context = {}) {
        this.gameState = gameState;

        // Update timer enabled status
        if (this.animation) {
            const timerEnabled = gameState.settings.turnTimerEnabled;
            this.ensureAnimationInitialized(timerEnabled === true);
            if (!timerEnabled && this.running) {
                this.stopTimer();
            } else if (timerEnabled) {
                const timerContainer = document.querySelector('.timer-container');
                if (timerContainer) {
                    timerContainer.style.display = '';
                }
            }
        }
    }

    /**
     * Check if timer is running
     * @returns {boolean} True if running
     */
    isRunning() {
        return this.running;
    }

    /**
     * Check if timer is paused
     * @returns {boolean} True if paused
     */
    isPaused() {
        return this.paused;
    }

    /**
     * Get component state
     * @returns {Object} Component state
     */
    getState() {
        return {
            ...super.getState(),
            running: this.running,
            paused: this.paused,
            hasAnimation: !!this.animation,
            hasPausedMessage: !!this.pausedMessage,
            timerEnabled: this.gameState?.settings?.turnTimerEnabled || false
        };
    }

    /**
     * Cleanup component
     */
    cleanup() {
        this.stopTimer();

        if (this.pausedMessage) {
            this.pausedMessage.remove();
            this.pausedMessage = null;
        }

        this.animation = null;
        this.gameState = null;
        this.onTimerEndCallback = null;
        this.pauseCallback = null;
        this.animationInitialized = false;
        this.animationInitializedAsDisabled = false;

        super.cleanup();
    }

    /**
     * Ensure the timer animation and DOM are initialized, optionally re-initializing
     * when moving from disabled -> enabled so pause button appears.
     */
    ensureAnimationInitialized(turnTimerEnabled) {
        if (!this.animation) return;

        const shouldReinitFromDisabled = turnTimerEnabled && this.animationInitializedAsDisabled;
        if (this.animationInitialized && !shouldReinitFromDisabled) {
            return;
        }

        this.animation.init(this.pauseCallback, !turnTimerEnabled);
        this.createPausedMessage();
        this.hidePausedMessage();

        this.animationInitialized = true;
        this.animationInitializedAsDisabled = !turnTimerEnabled;
    }
}
