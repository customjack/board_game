/**
 * GameLogComponent - Draggable game log popup
 *
 * Displays game events in a resizable, draggable popup window
 */
import BaseUIComponent from '../BaseUIComponent.js';

export default class GameLogComponent extends BaseUIComponent {
    /**
     * Create a game log component
     * @param {Object} config - Component configuration
     * @param {GameLogManager} config.gameLogManager - Game log manager instance
     */
    constructor(config = {}) {
        super({
            id: 'gameLog',
            containerId: 'gameLogPopup',
            ...config
        });

        this.gameLogManager = config.gameLogManager || null;
        this.header = null;
        this.closeButton = null;
        this.logContainer = null;

        // Drag state
        this.isDragging = false;
        this.currentX = 0;
        this.currentY = 0;
        this.initialX = 0;
        this.initialY = 0;
        this.xOffset = 0;
        this.yOffset = 0;

        // Bind drag methods
        this.dragStart = this.dragStart.bind(this);
        this.drag = this.drag.bind(this);
        this.dragEnd = this.dragEnd.bind(this);
        this.handleClose = this.handleClose.bind(this);
    }

    /**
     * Initialize the component
     */
    init() {
        super.init();

        if (!this.container) {
            console.warn('Game log popup element not found');
            return;
        }

        // Get sub-elements
        this.header = this.getElement('gameLogPopupHeader');
        this.closeButton = this.getElement('closeGameLogButton');
        this.logContainer = this.getElement('gameLogContainer');

        // Setup drag functionality
        if (this.header) {
            this.addEventListener(this.header, 'mousedown', this.dragStart);
            this.addEventListener(this.header, 'touchstart', this.dragStart);
        }

        // Setup close button
        if (this.closeButton) {
            this.addEventListener(this.closeButton, 'click', this.handleClose);
        }

        // Hide by default
        this.hide();
    }

    /**
     * Handle drag start
     * @param {Event} e - Mouse or touch event
     */
    dragStart(e) {
        // Don't drag if clicking close button
        if (e.target === this.closeButton || this.closeButton?.contains(e.target)) {
            return;
        }

        if (e.type === 'touchstart') {
            this.initialX = e.touches[0].clientX - this.xOffset;
            this.initialY = e.touches[0].clientY - this.yOffset;
        } else {
            this.initialX = e.clientX - this.xOffset;
            this.initialY = e.clientY - this.yOffset;
        }

        this.isDragging = true;

        // Add move and end listeners
        document.addEventListener('mousemove', this.drag);
        document.addEventListener('mouseup', this.dragEnd);
        document.addEventListener('touchmove', this.drag);
        document.addEventListener('touchend', this.dragEnd);
    }

    /**
     * Handle drag
     * @param {Event} e - Mouse or touch event
     */
    drag(e) {
        if (!this.isDragging) return;

        e.preventDefault();

        if (e.type === 'touchmove') {
            this.currentX = e.touches[0].clientX - this.initialX;
            this.currentY = e.touches[0].clientY - this.initialY;
        } else {
            this.currentX = e.clientX - this.initialX;
            this.currentY = e.clientY - this.initialY;
        }

        this.xOffset = this.currentX;
        this.yOffset = this.currentY;

        this.setTranslate(this.currentX, this.currentY, this.container);
    }

    /**
     * Handle drag end
     */
    dragEnd() {
        this.isDragging = false;

        // Remove listeners
        document.removeEventListener('mousemove', this.drag);
        document.removeEventListener('mouseup', this.dragEnd);
        document.removeEventListener('touchmove', this.drag);
        document.removeEventListener('touchend', this.dragEnd);
    }

    /**
     * Set element transform for dragging
     * @param {number} xPos - X position
     * @param {number} yPos - Y position
     * @param {HTMLElement} el - Element to transform
     */
    setTranslate(xPos, yPos, el) {
        el.style.transform = `translate(calc(-50% + ${xPos}px), calc(-50% + ${yPos}px))`;
    }

    /**
     * Handle close button click
     */
    handleClose() {
        this.hide();
        this.emit('gameLogClosed');
    }

    /**
     * Update component based on game state
     * @param {GameState} gameState - Current game state
     * @param {Object} context - Additional context
     */
    update(gameState, context = {}) {
        // Game log manager handles the actual log updates
        // This component just manages the popup display
    }

    /**
     * Render log entries
     */
    render() {
        if (!this.logContainer || !this.gameLogManager) {
            return;
        }

        // Clear existing entries
        this.logContainer.innerHTML = '';

        // Get entries from game log manager
        const entries = this.gameLogManager.getEntries();

        // Render each entry
        entries.forEach(entry => {
            const entryHtml = this.gameLogManager.formatEntryHtml(entry);
            const entryElement = document.createElement('div');
            entryElement.innerHTML = entryHtml;
            this.logContainer.appendChild(entryElement.firstChild);
        });

        // Scroll to bottom
        this.scrollToBottom();
    }

    /**
     * Scroll log to bottom
     */
    scrollToBottom() {
        if (this.logContainer) {
            this.logContainer.scrollTop = this.logContainer.scrollHeight;
        }
    }

    /**
     * Clear the log
     */
    clear() {
        if (this.logContainer) {
            this.logContainer.innerHTML = '';
        }
        if (this.gameLogManager) {
            this.gameLogManager.clearEntries();
        }
    }

    /**
     * Show the game log
     */
    show() {
        super.show();
        this.render(); // Refresh display
        this.emit('gameLogShown');
    }

    /**
     * Hide the game log
     */
    hide() {
        super.hide();
        this.emit('gameLogHidden');
    }

    /**
     * Reset drag position
     */
    resetPosition() {
        this.xOffset = 0;
        this.yOffset = 0;
        this.currentX = 0;
        this.currentY = 0;
        if (this.container) {
            this.container.style.transform = 'translate(-50%, -50%)';
        }
    }

    /**
     * Get component state
     * @returns {Object} Component state
     */
    getState() {
        return {
            ...super.getState(),
            isDragging: this.isDragging,
            position: { x: this.xOffset, y: this.yOffset },
            hasGameLogManager: !!this.gameLogManager,
            entryCount: this.gameLogManager ? this.gameLogManager.getEntries().length : 0
        };
    }

    /**
     * Cleanup component
     */
    cleanup() {
        // End any active drag
        if (this.isDragging) {
            this.dragEnd();
        }

        this.resetPosition();
        this.gameLogManager = null;

        super.cleanup();
    }
}
