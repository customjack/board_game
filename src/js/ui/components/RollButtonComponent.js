/**
 * RollButtonComponent - Interactive dice roll button
 *
 * Manages the roll dice button with activation/deactivation states,
 * click handling, and animation coordination
 */
import BaseUIComponent from '../BaseUIComponent.js';

export default class RollButtonComponent extends BaseUIComponent {
    /**
     * Create a roll button component
     * @param {Object} config - Component configuration
     * @param {FactoryManager} config.factoryManager - Factory manager for creating animations
     * @param {PersonalSettings} config.personalSettings - Personal settings for animation selection
     */
    constructor(config = {}) {
        super({
            id: 'rollButton',
            containerId: 'rollButton',
            ...config
        });

        this.factoryManager = config.factoryManager || null;
        this.personalSettings = config.personalSettings || null;
        this.onRollDiceCallback = null;
        this.onRollCompleteCallback = null;
        this.active = false;

        // Bind methods
        this.handleClick = this.handleClick.bind(this);
    }

    /**
     * Initialize the component
     * @param {Object} callbacks - Callback functions
     * @param {Function} callbacks.onRollDice - Called to perform roll
     * @param {Function} callbacks.onRollComplete - Called after roll completes
     */
    init(callbacks = {}) {
        super.init();

        // Store callbacks
        this.onRollDiceCallback = callbacks.onRollDice || null;
        this.onRollCompleteCallback = callbacks.onRollComplete || null;

        // The container IS the button for this component
        if (this.container) {
            this.addEventListener(this.container, 'click', this.handleClick);
            this.deactivate(); // Start deactivated
        } else {
            console.warn('Roll button element not found');
        }
    }

    /**
     * Handle button click
     */
    handleClick() {
        if (!this.active || !this.enabled) {
            return;
        }

        // Deactivate immediately to prevent multiple clicks
        this.deactivate();

        // Perform the roll
        this.handleRoll();
    }

    /**
     * Handle the roll action with animation
     */
    handleRoll() {
        // Execute roll callback
        if (!this.onRollDiceCallback) {
            console.warn('No roll dice callback registered');
            return;
        }

        const rollResult = this.onRollDiceCallback();

        // Emit event
        this.emit('diceRolled', { result: rollResult });

        // Get animation from factory using current personal settings
        const animation = this.getAnimation();

        // Play animation if available
        if (animation) {
            animation.start(
                { resultText: rollResult.toString() },
                () => {
                    // Animation complete
                    if (this.onRollCompleteCallback) {
                        this.onRollCompleteCallback(rollResult);
                    }
                    this.emit('rollComplete', { result: rollResult });
                }
            );
        } else {
            // No animation, complete immediately
            if (this.onRollCompleteCallback) {
                this.onRollCompleteCallback(rollResult);
            }
            this.emit('rollComplete', { result: rollResult });
        }
    }

    /**
     * Get animation instance based on current personal settings
     * @returns {Animation|null} Animation instance or null
     */
    getAnimation() {
        if (!this.factoryManager) {
            console.warn('[RollButtonComponent] No factory manager available');
            return null;
        }

        const animationFactory = this.factoryManager.getFactory('AnimationFactory');
        if (!animationFactory) {
            console.warn('[RollButtonComponent] AnimationFactory not found');
            return null;
        }

        // Get selected animation type from personal settings
        const animationType = this.personalSettings?.getRollAnimation() || 'dice-roll';

        console.log(`[RollButtonComponent] Creating animation: ${animationType}`);

        // Create and return animation
        try {
            return animationFactory.create(animationType);
        } catch (error) {
            console.error('[RollButtonComponent] Failed to create animation:', error);
            return null;
        }
    }

    /**
     * Activate the roll button
     */
    activate() {
        if (!this.container) return;

        this.active = true;
        this.container.classList.add('active');
        this.container.style.cursor = 'pointer';
        this.container.disabled = false;

        this.emit('buttonActivated');
    }

    /**
     * Deactivate the roll button
     */
    deactivate() {
        if (!this.container) return;

        this.active = false;
        this.container.classList.remove('active');
        this.container.style.cursor = 'not-allowed';
        this.container.disabled = true;

        this.emit('buttonDeactivated');
    }

    /**
     * Check if button is active
     * @returns {boolean} True if active
     */
    isActive() {
        return this.active;
    }

    /**
     * Update component based on game state
     * @param {GameState} gameState - Current game state
     * @param {Object} context - Additional context
     */
    update(gameState, context = {}) {
        // This component is typically controlled by the game engine
        // rather than automatically updating from state
        // But we can add logic here if needed
    }

    /**
     * Register callbacks
     * @param {Object} callbacks - Callback functions
     */
    registerCallbacks(callbacks = {}) {
        if (callbacks.onRollDice) {
            this.onRollDiceCallback = callbacks.onRollDice;
        }
        if (callbacks.onRollComplete) {
            this.onRollCompleteCallback = callbacks.onRollComplete;
        }
    }

    /**
     * Get component state
     * @returns {Object} Component state
     */
    getState() {
        return {
            ...super.getState(),
            active: this.active,
            hasFactoryManager: !!this.factoryManager,
            hasRollCallback: !!this.onRollDiceCallback,
            hasCompleteCallback: !!this.onRollCompleteCallback
        };
    }

    /**
     * Cleanup component
     */
    cleanup() {
        this.deactivate();
        this.onRollDiceCallback = null;
        this.onRollCompleteCallback = null;
        super.cleanup();
    }
}
