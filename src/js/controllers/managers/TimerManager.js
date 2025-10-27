export default class TimerManager {
    /**
     * Constructs the TimerManager instance.
     * @param {Animation} animation - An instance of an Animation subclass (e.g., TimerAnimation).
     * @param {GameState} gameState - The current game state to get settings from.
     */
    constructor(animation, gameState) {
        this.animation = animation; // The animation to display the timer
        this.gameState = gameState; // The game state to access settings dynamically
        this.onTimerEndCallback = null; // Callback when the timer ends
        this.pausedMessage = null; // DOM element for "Game Paused" message
    }

    /**
     * Initializes the timer manager.
     * @param {Function} onTimerEndCallback - Function to call when the timer ends.
     * @param {Function} pauseCallback - Function to call when the pause button is clicked.
     * @param {boolean} timerDisabled - Whether the timer is disabled, showing the infinity symbol instead.
     */
    init(onTimerEndCallback, pauseCallback = null) {
        // Initialize the animation with the appropriate settings
        this.onTimerEndCallback = onTimerEndCallback;

        // If the timer is disabled, show the infinity symbol and no pause button
        if (!this.gameState.settings.isTurnTimerEnabled()) {
            this.animation.init(null, true); // Just show the infinity symbol
        } else {
            this.animation.init(pauseCallback);
            this.createPausedMessage();
            this.hidePausedMessage();
        }
    }

    /**
     * Starts the timer if enabled in the settings.
     */
    startTimer() {
        console.log("Calling startTimer");
        if (!this.gameState.settings.isTurnTimerEnabled()) {
            //console.log("Turn timer is disabled. Timer will not start.");
            return;
        }

        this.stopTimer(); // Stop any existing timer

        const duration = this.gameState.settings.getTurnTimer();
        this.animation.start({ duration }, () => {
            // Timer reached zero
            if (this.onTimerEndCallback) {
                this.onTimerEndCallback();
            }
        });
    }

    /**
     * Stops the timer.
     */
    stopTimer() {
        this.animation.cleanup();
    }

    /**
     * Pauses the timer and shows the "Game Paused" message.
     */
    pauseTimer() {
        if (!this.gameState.settings.isTurnTimerEnabled()) {
            //console.log("Turn timer is disabled. No pause action.");
            return;
        }

        this.animation.pause();
        this.showPausedMessage();
    }

    /**
     * Resumes the timer and hides the "Game Paused" message.
     */
    resumeTimer() {
        if (!this.gameState.settings.isTurnTimerEnabled()) {
            //console.log("Turn timer is disabled. No resume action.");
            return;
        }

        this.animation.resume();
        this.hidePausedMessage();
    }

    /**
     * Creates the "Game Paused" notification element if one doesn't exist.
     */
    createPausedMessage() {
        if (!this.pausedMessage) {
            const pausedMessage = document.createElement('div');
            pausedMessage.id = 'pausedMessage';
            pausedMessage.textContent = 'Game Paused';
            pausedMessage.classList.add('paused-message');

            // Insert the message into the pausedMessageContainer
            const pausedMessageContainer = document.getElementById('pausedMessageContainer');
            if (pausedMessageContainer) {
                pausedMessageContainer.appendChild(pausedMessage);
            } else {
                // Fallback: insert into the game sidebar
                const gameSidebar = document.getElementById('gameSidebar');
                if (gameSidebar) {
                    gameSidebar.insertBefore(pausedMessage, gameSidebar.firstChild);
                }
            }

            this.pausedMessage = pausedMessage;
        }
    }

    /**
     * Displays the "Game Paused" message.
     */
    showPausedMessage() {
        if (this.pausedMessage) {
            this.pausedMessage.style.display = 'block';
        }
    }

    /**
     * Hides the "Game Paused" message.
     */
    hidePausedMessage() {
        if (this.pausedMessage) {
            this.pausedMessage.style.display = 'none';
        }
    }
}
