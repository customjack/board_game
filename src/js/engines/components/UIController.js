import { getVisibleElementById } from '../../utils/helpers.js';

/**
 * UIController - Manages UI elements and their interactions
 *
 * This component handles:
 * - Roll button state management
 * - Timer display and controls
 * - Game modals (prompts, choices, etc.)
 * - UI state synchronization with game state
 * - UI event callbacks to game engine
 */
export default class UIController {
    /**
     * Create a new UI controller
     * @param {Object} managers - UI manager instances
     * @param {RollButtonManager} managers.rollButtonManager - Roll button manager
     * @param {TimerManager} managers.timerManager - Timer manager
     * @param {Object} config - Configuration options
     */
    constructor(managers = {}, config = {}) {
        this.rollButtonManager = managers.rollButtonManager || null;
        this.timerManager = managers.timerManager || null;

        this.config = {
            // Whether to auto-hide modals after interactions
            autoHideModals: config.autoHideModals !== undefined ? config.autoHideModals : true,
            // Default modal display duration
            modalDuration: config.modalDuration || 3000,
            ...config
        };

        // Modal element references
        this.modals = {
            gamePrompt: null,
            choice: null,
            notification: null
        };

        // UI state tracking
        this.uiState = {
            rollButtonActive: false,
            timerRunning: false,
            modalOpen: false,
            currentModal: null
        };

        // Callbacks
        this.callbacks = new Map();

        // UI element references
        this.elements = {
            remainingMovesCount: null,
            remainingMovesContainer: null
        };
    }

    /**
     * Initialize the UI controller
     * @param {Object} callbacks - Callback functions for UI events
     */
    init(callbacks = {}) {
        // Store callbacks
        this.callbacks = new Map(Object.entries(callbacks));

        // Initialize modal references
        this.modals.gamePrompt = document.getElementById('gamePromptModal');
        this.modals.choice = document.getElementById('choiceModal');
        this.modals.notification = document.getElementById('notificationModal');

        // Initialize UI element references
        this.elements.remainingMovesCount = document.getElementById('remainingMovesCount');
        this.elements.remainingMovesContainer = document.getElementById('remainingMovesContainer');

        // Initialize managers if they exist
        if (this.rollButtonManager) {
            this.rollButtonManager.init(
                document.getElementById('rollButton'),
                () => this.executeCallback('onRollDice'),
                (result) => this.executeCallback('onRollComplete', result)
            );
        }

        if (this.timerManager) {
            this.timerManager.init(
                () => this.executeCallback('onTimerEnd'),
                () => this.executeCallback('onPauseToggle')
            );
        }
    }

    /**
     * Execute a registered callback
     * @param {string} name - Callback name
     * @param {...any} args - Callback arguments
     * @returns {any} Callback return value
     */
    executeCallback(name, ...args) {
        const callback = this.callbacks.get(name);
        if (callback && typeof callback === 'function') {
            try {
                return callback(...args);
            } catch (error) {
                console.error(`Error executing UI callback ${name}:`, error);
            }
        }
        return undefined;
    }

    /**
     * Register a callback for UI events
     * @param {string} name - Callback name
     * @param {Function} callback - Callback function
     */
    registerCallback(name, callback) {
        this.callbacks.set(name, callback);
    }

    // ===== Roll Button Methods =====

    /**
     * Activate the roll button
     */
    activateRollButton() {
        if (this.rollButtonManager) {
            this.rollButtonManager.activate();
            this.uiState.rollButtonActive = true;
        }
    }

    /**
     * Deactivate the roll button
     */
    deactivateRollButton() {
        if (this.rollButtonManager) {
            this.rollButtonManager.deactivate();
            this.uiState.rollButtonActive = false;
        }
    }

    /**
     * Check if roll button is active
     * @returns {boolean} True if active
     */
    isRollButtonActive() {
        return this.uiState.rollButtonActive;
    }

    // ===== Timer Methods =====

    /**
     * Start the timer
     */
    startTimer() {
        if (this.timerManager) {
            this.timerManager.startTimer();
            this.uiState.timerRunning = true;
        }
    }

    /**
     * Stop the timer
     */
    stopTimer() {
        if (this.timerManager) {
            this.timerManager.stopTimer();
            this.uiState.timerRunning = false;
        }
    }

    /**
     * Pause the timer
     */
    pauseTimer() {
        if (this.timerManager) {
            this.timerManager.pauseTimer();
        }
    }

    /**
     * Resume the timer
     */
    resumeTimer() {
        if (this.timerManager) {
            this.timerManager.resumeTimer();
        }
    }

    /**
     * Check if timer is running
     * @returns {boolean} True if running
     */
    isTimerRunning() {
        return this.uiState.timerRunning;
    }

    // ===== Modal Methods =====

    /**
     * Show a modal
     * @param {string} modalType - Type of modal (gamePrompt, choice, notification)
     * @param {Object} options - Modal options (title, message, buttons, etc.)
     * @returns {Promise} Resolves when modal is closed with result
     */
    showModal(modalType, options = {}) {
        return new Promise((resolve) => {
            const modal = this.modals[modalType];
            if (!modal) {
                console.warn(`Modal type ${modalType} not found`);
                resolve(null);
                return;
            }

            // Update modal content based on options
            if (options.title) {
                const titleElement = modal.querySelector('.modal-title');
                if (titleElement) titleElement.textContent = options.title;
            }

            if (options.message) {
                const messageElement = modal.querySelector('.modal-message');
                if (messageElement) messageElement.textContent = options.message;
            }

            // Handle buttons if provided
            if (options.buttons) {
                this.setupModalButtons(modal, options.buttons, resolve);
            }

            // Show the modal
            modal.style.display = 'block';
            this.uiState.modalOpen = true;
            this.uiState.currentModal = modalType;

            // Auto-hide if configured
            if (this.config.autoHideModals && options.duration !== undefined) {
                const duration = options.duration || this.config.modalDuration;
                setTimeout(() => {
                    this.hideModal(modalType);
                    resolve(null);
                }, duration);
            }
        });
    }

    /**
     * Hide a modal
     * @param {string} modalType - Type of modal to hide
     */
    hideModal(modalType) {
        const modal = this.modals[modalType];
        if (modal) {
            modal.style.display = 'none';

            if (this.uiState.currentModal === modalType) {
                this.uiState.modalOpen = false;
                this.uiState.currentModal = null;
            }
        }
    }

    /**
     * Hide all modals
     */
    hideAllModals() {
        Object.keys(this.modals).forEach(modalType => {
            this.hideModal(modalType);
        });
    }

    /**
     * Setup modal buttons
     * @param {HTMLElement} modal - Modal element
     * @param {Array} buttons - Button configurations
     * @param {Function} resolve - Promise resolve function
     */
    setupModalButtons(modal, buttons, resolve) {
        const buttonContainer = modal.querySelector('.modal-buttons');
        if (!buttonContainer) return;

        // Clear existing buttons
        buttonContainer.innerHTML = '';

        // Create new buttons
        buttons.forEach(buttonConfig => {
            const button = document.createElement('button');
            button.textContent = buttonConfig.text || 'OK';
            button.className = buttonConfig.className || 'modal-button';

            button.addEventListener('click', () => {
                this.hideModal(this.uiState.currentModal);
                resolve(buttonConfig.value || buttonConfig.text);
            });

            buttonContainer.appendChild(button);
        });
    }

    /**
     * Show a notification message
     * @param {string} message - Message to display
     * @param {number} duration - Duration in ms (0 = manual close)
     */
    showNotification(message, duration = 3000) {
        return this.showModal('notification', {
            message,
            duration: duration > 0 ? duration : undefined
        });
    }

    /**
     * Show a choice modal and wait for user selection
     * @param {string} message - Choice message
     * @param {Array} choices - Array of choice objects {text, value}
     * @returns {Promise} Resolves with selected value
     */
    showChoice(message, choices) {
        return this.showModal('choice', {
            message,
            buttons: choices
        });
    }

    /**
     * Show a game prompt modal
     * @param {string} title - Prompt title
     * @param {string} message - Prompt message
     * @returns {Promise} Resolves when acknowledged
     */
    showGamePrompt(title, message) {
        return this.showModal('gamePrompt', {
            title,
            message,
            buttons: [{ text: 'OK', value: true }]
        });
    }

    /**
     * Check if any modal is open
     * @returns {boolean} True if modal open
     */
    isModalOpen() {
        return this.uiState.modalOpen;
    }

    /**
     * Get current modal type
     * @returns {string|null} Current modal type or null
     */
    getCurrentModal() {
        return this.uiState.currentModal;
    }

    // ===== Space Highlighting Methods =====

    /**
     * Highlight spaces on the board
     * @param {Array} spaces - Array of space objects to highlight
     */
    highlightSpaces(spaces) {
        spaces.forEach(space => {
            const spaceElement = getVisibleElementById(`space-${space.id}`);
            if (spaceElement) {
                spaceElement.classList.add('highlight');
            }
        });
    }

    /**
     * Remove all space highlights
     */
    removeAllHighlights() {
        const highlightedElements = document.querySelectorAll('.highlight');
        highlightedElements.forEach(element => {
            element.classList.remove('highlight');
        });
    }

    /**
     * Setup space click handlers for choice selection
     * @param {Array} spaces - Spaces that can be clicked
     * @param {Function} onSpaceClick - Callback when space is clicked
     */
    setupSpaceClickHandlers(spaces, onSpaceClick) {
        const clickHandlers = new Map();

        spaces.forEach(space => {
            const spaceElement = getVisibleElementById(`space-${space.id}`);
            if (spaceElement) {
                const handler = () => {
                    this.removeAllHighlights();
                    this.removeSpaceClickHandlers(spaces, clickHandlers);
                    onSpaceClick(space);
                };

                spaceElement.addEventListener('click', handler);
                clickHandlers.set(space.id, handler);
            }
        });

        return clickHandlers;
    }

    /**
     * Remove space click handlers
     * @param {Array} spaces - Spaces to remove handlers from
     * @param {Map} clickHandlers - Map of click handlers
     */
    removeSpaceClickHandlers(spaces, clickHandlers) {
        spaces.forEach(space => {
            const handler = clickHandlers.get(space.id);
            if (!handler) {
                return;
            }

            const spaceElement = getVisibleElementById(`space-${space.id}`);
            if (spaceElement) {
                spaceElement.removeEventListener('click', handler);
            }
        });
    }

    // ===== Remaining Moves Methods =====

    /**
     * Update the remaining moves display
     * @param {number} moves - Number of remaining moves
     */
    updateRemainingMoves(moves) {
        // Try to get element if not cached (handles late initialization)
        if (!this.elements.remainingMovesCount) {
            this.elements.remainingMovesCount = document.getElementById('remainingMovesCount');
        }
        if (this.elements.remainingMovesCount) {
            this.elements.remainingMovesCount.textContent = moves;
        }
    }

    /**
     * Show the remaining moves container
     */
    showRemainingMoves() {
        // Try to get element if not cached (handles late initialization)
        if (!this.elements.remainingMovesContainer) {
            this.elements.remainingMovesContainer = document.getElementById('remainingMovesContainer');
        }
        if (this.elements.remainingMovesContainer) {
            this.elements.remainingMovesContainer.style.display = '';
        }
    }

    /**
     * Hide the remaining moves container
     */
    hideRemainingMoves() {
        // Try to get element if not cached (handles late initialization)
        if (!this.elements.remainingMovesContainer) {
            this.elements.remainingMovesContainer = document.getElementById('remainingMovesContainer');
        }
        if (this.elements.remainingMovesContainer) {
            this.elements.remainingMovesContainer.style.display = 'none';
        }
    }

    // ===== State Synchronization =====

    /**
     * Update UI based on game state
     * @param {GameState} gameState - Current game state
     * @param {string} peerId - Current peer ID
     */
    updateFromGameState(gameState, peerId) {
        // Update roll button based on turn phase and current player
        const currentPlayer = gameState.getCurrentPlayer();
        const isClientTurn = currentPlayer && currentPlayer.peerId === peerId;

        // Update remaining moves display
        this.updateRemainingMoves(gameState.remainingMoves);

        // This should be called by the game engine based on phase
        // but we can provide helper logic here

        // Update timer if settings changed
        if (this.timerManager && this.timerManager.gameState !== gameState) {
            this.timerManager.gameState = gameState;
        }
    }

    /**
     * Get UI state snapshot
     * @returns {Object} UI state object
     */
    getState() {
        return { ...this.uiState };
    }

    /**
     * Clean up UI controller resources
     */
    cleanup() {
        // Hide all modals
        this.hideAllModals();

        // Clean up managers
        if (this.rollButtonManager) {
            this.rollButtonManager.cleanup();
        }

        if (this.timerManager) {
            this.timerManager.stopTimer();
        }

        // Remove all highlights
        this.removeAllHighlights();

        // Clear callbacks
        this.callbacks.clear();

        // Reset state
        this.uiState = {
            rollButtonActive: false,
            timerRunning: false,
            modalOpen: false,
            currentModal: null
        };
    }

    /**
     * Serialize UI controller state for debugging
     * @returns {Object} Serialized state
     */
    toJSON() {
        return {
            state: this.uiState,
            config: this.config,
            hasRollButtonManager: !!this.rollButtonManager,
            hasTimerManager: !!this.timerManager,
            callbacks: Array.from(this.callbacks.keys())
        };
    }
}
