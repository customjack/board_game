/**
 * BaseUIComponent - Abstract base class for all UI components
 *
 * Provides common functionality for UI components:
 * - Lifecycle management (init, update, cleanup)
 * - Element management and caching
 * - Visibility controls
 * - State management
 * - Event handling
 */
export default class BaseUIComponent {
    /**
     * Create a UI component
     * @param {Object} config - Component configuration
     * @param {string} config.id - Unique component identifier
     * @param {string} config.containerId - DOM container element ID
     * @param {EventBus} config.eventBus - Event bus for communication
     * @param {FactoryManager} config.factoryManager - Factory manager for creating game objects
     */
    constructor(config = {}) {
        if (new.target === BaseUIComponent) {
            throw new TypeError('Cannot construct BaseUIComponent instances directly - must be extended');
        }

        this.id = config.id || this.constructor.name;
        this.containerId = config.containerId || null;
        this.eventBus = config.eventBus || null;
        this.factoryManager = config.factoryManager || null;
        this.config = { ...config };

        // Component state
        this.initialized = false;
        this.visible = false;
        this.enabled = true;

        // DOM element references
        this.container = null;
        this.elements = {};

        // Event listeners tracking for cleanup
        this.listeners = [];
    }

    /**
     * Initialize the component
     * Must be implemented by subclasses
     * @abstract
     */
    init() {
        if (this.initialized) {
            console.warn(`Component ${this.id} already initialized`);
            return;
        }

        // Get container element
        if (this.containerId) {
            this.container = this.getElement(this.containerId);
            if (!this.container) {
                console.warn(`Container element ${this.containerId} not found for component ${this.id}`);
            }
        }

        this.initialized = true;
    }

    /**
     * Update component based on game state
     * @param {GameState} gameState - Current game state
     * @param {Object} context - Additional context (peerId, etc.)
     */
    update(gameState, context = {}) {
        // To be overridden by subclasses
    }

    /**
     * Show the component
     */
    show() {
        if (this.container) {
            this.container.style.display = '';
            this.visible = true;
            this.onShow();
        }
    }

    /**
     * Hide the component
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            this.visible = false;
            this.onHide();
        }
    }

    /**
     * Enable the component
     */
    enable() {
        this.enabled = true;
        this.onEnable();
    }

    /**
     * Disable the component
     */
    disable() {
        this.enabled = false;
        this.onDisable();
    }

    /**
     * Get a DOM element by ID with caching
     * @param {string} elementId - Element ID
     * @param {boolean} cache - Whether to cache the element (default: true)
     * @returns {HTMLElement|null} The element or null
     */
    getElement(elementId, cache = true) {
        // Check cache first
        if (cache && this.elements[elementId]) {
            return this.elements[elementId];
        }

        const element = document.getElementById(elementId);

        if (cache && element) {
            this.elements[elementId] = element;
        }

        return element;
    }

    /**
     * Add an event listener and track it for cleanup
     * @param {HTMLElement} element - Element to attach listener to
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} options - Event listener options
     */
    addEventListener(element, event, handler, options = {}) {
        if (!element) return;

        element.addEventListener(event, handler, options);
        this.listeners.push({ element, event, handler, options });
    }

    /**
     * Remove all tracked event listeners
     */
    removeAllEventListeners() {
        this.listeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        this.listeners = [];
    }

    /**
     * Emit an event through the event bus
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    emit(eventName, data = {}) {
        if (this.eventBus) {
            this.eventBus.emit(eventName, {
                ...data,
                source: this.id
            });
        }
    }

    /**
     * Subscribe to an event through the event bus
     * @param {string} eventName - Event name
     * @param {Function} handler - Event handler
     */
    on(eventName, handler) {
        if (this.eventBus) {
            this.eventBus.on(eventName, handler);
        }
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName - Event name
     * @param {Function} handler - Event handler
     */
    off(eventName, handler) {
        if (this.eventBus) {
            this.eventBus.off(eventName, handler);
        }
    }

    /**
     * Clean up component resources
     */
    cleanup() {
        this.removeAllEventListeners();
        this.elements = {};
        this.container = null;
        this.initialized = false;
        this.visible = false;
    }

    /**
     * Lifecycle hook: called when component is shown
     * @protected
     */
    onShow() {
        // Override in subclasses if needed
    }

    /**
     * Lifecycle hook: called when component is hidden
     * @protected
     */
    onHide() {
        // Override in subclasses if needed
    }

    /**
     * Lifecycle hook: called when component is enabled
     * @protected
     */
    onEnable() {
        // Override in subclasses if needed
    }

    /**
     * Lifecycle hook: called when component is disabled
     * @protected
     */
    onDisable() {
        // Override in subclasses if needed
    }

    /**
     * Get component state for debugging
     * @returns {Object} Component state
     */
    getState() {
        return {
            id: this.id,
            initialized: this.initialized,
            visible: this.visible,
            enabled: this.enabled,
            hasContainer: !!this.container,
            elementCount: Object.keys(this.elements).length,
            listenerCount: this.listeners.length
        };
    }
}
