export default class PauseButtonManager {
    /**
     * Constructs the PauseButtonManager instance.
     */
    constructor() {
        this.pauseButton = null; // The DOM element for the pause/play button
    }

    /**
     * Initializes the pause button.
     * @param {HTMLElement} existingButtonElement - An existing button element to use.
     * @param {Function} onClickCallback - The function to call when the button is clicked.
     */
    init(existingButtonElement, onClickCallback) {
        this.pauseButton = existingButtonElement || this.createPauseButton();

        this.pauseButton.addEventListener('click', () => {
            onClickCallback();
            this.toggleButton();
        });
    }

    /**
     * Creates a new pause button if one doesn't exist.
     * @returns {HTMLElement} The newly created pause button element.
     */
    createPauseButton() {
        const pauseButton = document.createElement('button');
        pauseButton.id = 'pauseButton';
        pauseButton.textContent = '⏸';  // Pause emoji
        pauseButton.classList.add('pause-button');

        const timerCanvas = document.getElementById('timerCanvas');
        if (timerCanvas) {
            timerCanvas.parentNode.insertBefore(pauseButton, timerCanvas.nextSibling);
        }

        return pauseButton;
    }

    /**
     * Toggles the button text between play and pause styles.
     */
    toggleButton() {
        if (this.pauseButton.textContent === '⏸') {
            this.pauseButton.textContent = '▶️';  // Play emoji
            this.pauseButton.classList.remove('pause-button');
            this.pauseButton.classList.add('play-button');
        } else {
            this.pauseButton.textContent = '⏸';  // Set back to pause emoji
            this.pauseButton.classList.remove('play-button');
            this.pauseButton.classList.add('pause-button');
        }
    }
}
