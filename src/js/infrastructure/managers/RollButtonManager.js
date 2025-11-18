// controllers/RollButtonManager.js

import Animation from '../../../animations/Animation'; // Import the base Animation class

export default class RollButtonManager {
    /**
     * Constructs the RollButtonManager instance.
     * @param {Animation} animation - An instance of an Animation subclass.
     */
    constructor(animation) {
        this.rollButton = null; // Will hold the roll button element
        this.animation = animation; // The animation to play when the roll button is clicked
        this.onRollDiceCallback = null; // Callback to perform the dice roll
        this.onRollCompleteCallback = null; // Callback after roll and animation complete
    }

    /**
     * Initializes the roll button. Uses the existing button element if provided, or creates a new one.
     * @param {HTMLElement} existingButtonElement - An existing button element to use for the roll button.
     * @param {Function} onRollDiceCallback - Function to call to perform the dice roll.
     * @param {Function} onRollCompleteCallback - Function to call when roll and animation are complete.
     */
    init(existingButtonElement, onRollDiceCallback, onRollCompleteCallback) {
        // Use the existing button element if provided, otherwise create a new one
        this.rollButton = existingButtonElement || this.createRollButton();

        // Store the callbacks
        this.onRollDiceCallback = onRollDiceCallback;
        this.onRollCompleteCallback = onRollCompleteCallback;

        // Add click event listener
        this.rollButton.addEventListener('click', () => {
            if (this.rollButton.classList.contains('active')) {
                // Deactivate the roll button immediately to prevent multiple clicks
                this.deactivate();

                // Handle the roll and animation
                this.handleRoll();
            }
        });
    }

    /**
     * Handles the roll action, including playing the animation.
     */
    handleRoll() {
        // Perform the dice roll using the provided callback
        const rollResult = this.onRollDiceCallback();

        // Play the animation
        this.animation.start(
            { resultText: rollResult.toString() },
            () => {
                // When the animation is complete, call the onRollCompleteCallback with the roll result
                if (this.onRollCompleteCallback) {
                    this.onRollCompleteCallback(rollResult);
                }
            }
        );
    }

    /**
     * Creates a new roll button if one doesn't exist.
     * @returns {HTMLElement} The newly created roll button element.
     */
    createRollButton() {
        const rollButton = document.createElement('button');
        rollButton.id = 'rollButton';
        rollButton.textContent = "Roll Dice";
        rollButton.classList.add('roll-button'); // Apply default styling
        document.body.appendChild(rollButton);
        return rollButton;
    }

    /**
     * Activates the roll button, making it clickable with animation.
     */
    activate() {
        if (!this.rollButton) return;
        this.rollButton.classList.add('active');
        this.rollButton.style.cursor = 'pointer';
        this.rollButton.disabled = false; // Enable the button
    }

    /**
     * Deactivates the roll button, making it unclickable and changing its appearance.
     */
    deactivate() {
        if (!this.rollButton) return;
        this.rollButton.classList.remove('active');
        this.rollButton.style.cursor = 'not-allowed';
        this.rollButton.disabled = true; // Disable the button to prevent clicks
    }

    /**
     * Clean up the roll button and remove its event listener if necessary.
     */
    cleanup() {
        if (this.rollButton) {
            this.rollButton.removeEventListener('click', this.onClickCallback);
            this.rollButton.remove();
            this.rollButton = null;
        }
    }
}
