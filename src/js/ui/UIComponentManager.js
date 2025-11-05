/**
 * UIComponentManager - Central manager for all UI components
 *
 * This manager handles:
 * - Component registration and retrieval
 * - Coordinated lifecycle management (init, update, cleanup)
 * - Component discovery and debugging
 * - Event bus integration
 */
export default class UIComponentManager {
    /**
     * Create a UI component manager
     * @param {EventBus} eventBus - Event bus for component communication
     * @param {Object} config - Manager configuration
     */
    constructor(eventBus, config = {}) {
        this.eventBus = eventBus;
        this.config = {
            autoInit: config.autoInit !== undefined ? config.autoInit : false,
            ...config
        };

        // Component registry
        this.components = new Map();
        this.initialized = false;
    }

    /**
     * Register a UI component
     * @param {string} id - Unique component identifier
     * @param {BaseUIComponent} component - Component instance
     * @returns {boolean} True if registered successfully
     */
    register(id, component) {
        if (!id || typeof id !== 'string') {
            console.error('Component ID must be a non-empty string');
            return false;
        }

        if (this.components.has(id)) {
            console.warn(`Component ${id} is already registered, replacing...`);
        }

        // Validate component has required methods
        if (typeof component.init !== 'function' ||
            typeof component.update !== 'function' ||
            typeof component.cleanup !== 'function') {
            console.error(`Component ${id} must implement init(), update(), and cleanup() methods`);
            return false;
        }

        this.components.set(id, component);
        console.log(`Registered UI component: ${id}`);

        // Auto-initialize if manager is already initialized
        if (this.initialized && this.config.autoInit) {
            component.init();
        }

        return true;
    }

    /**
     * Unregister a component
     * @param {string} id - Component ID to remove
     * @returns {boolean} True if unregistered
     */
    unregister(id) {
        const component = this.components.get(id);
        if (component) {
            // Cleanup before removing
            if (component.initialized) {
                component.cleanup();
            }
            this.components.delete(id);
            console.log(`Unregistered UI component: ${id}`);
            return true;
        }
        return false;
    }

    /**
     * Get a component by ID
     * @param {string} id - Component ID
     * @returns {BaseUIComponent|null} Component instance or null
     */
    get(id) {
        return this.components.get(id) || null;
    }

    /**
     * Check if a component is registered
     * @param {string} id - Component ID
     * @returns {boolean} True if registered
     */
    has(id) {
        return this.components.has(id);
    }

    /**
     * Get all registered component IDs
     * @returns {string[]} Array of component IDs
     */
    getComponentIds() {
        return Array.from(this.components.keys());
    }

    /**
     * Get all components
     * @returns {BaseUIComponent[]} Array of component instances
     */
    getAllComponents() {
        return Array.from(this.components.values());
    }

    /**
     * Initialize all registered components
     * @returns {Promise<void>}
     */
    async initAll() {
        if (this.initialized) {
            console.warn('UIComponentManager already initialized');
            return;
        }

        console.log(`Initializing ${this.components.size} UI components...`);

        for (const [id, component] of this.components) {
            try {
                if (!component.initialized) {
                    component.init();
                    console.log(`Initialized component: ${id}`);
                }
            } catch (error) {
                console.error(`Error initializing component ${id}:`, error);
            }
        }

        this.initialized = true;
        console.log('UI component manager initialized');
    }

    /**
     * Update all components with game state
     * @param {GameState} gameState - Current game state
     * @param {Object} context - Additional context (peerId, etc.)
     */
    updateAll(gameState, context = {}) {
        if (!this.initialized) {
            console.warn('Cannot update components - manager not initialized');
            return;
        }

        for (const [id, component] of this.components) {
            try {
                if (component.initialized) {
                    component.update(gameState, context);
                }
            } catch (error) {
                console.error(`Error updating component ${id}:`, error);
            }
        }
    }

    /**
     * Show all components
     */
    showAll() {
        for (const component of this.components.values()) {
            if (component.initialized && typeof component.show === 'function') {
                component.show();
            }
        }
    }

    /**
     * Hide all components
     */
    hideAll() {
        for (const component of this.components.values()) {
            if (component.initialized && typeof component.hide === 'function') {
                component.hide();
            }
        }
    }

    /**
     * Show specific components by ID
     * @param {string[]} ids - Component IDs to show
     */
    show(...ids) {
        ids.forEach(id => {
            const component = this.get(id);
            if (component && typeof component.show === 'function') {
                component.show();
            }
        });
    }

    /**
     * Hide specific components by ID
     * @param {string[]} ids - Component IDs to hide
     */
    hide(...ids) {
        ids.forEach(id => {
            const component = this.get(id);
            if (component && typeof component.hide === 'function') {
                component.hide();
            }
        });
    }

    /**
     * Cleanup all components
     */
    cleanupAll() {
        console.log('Cleaning up all UI components...');

        for (const [id, component] of this.components) {
            try {
                if (component.initialized) {
                    component.cleanup();
                    console.log(`Cleaned up component: ${id}`);
                }
            } catch (error) {
                console.error(`Error cleaning up component ${id}:`, error);
            }
        }

        this.initialized = false;
        console.log('UI component manager cleaned up');
    }

    /**
     * Get manager state for debugging
     * @returns {Object} Manager state
     */
    getState() {
        const componentStates = {};

        for (const [id, component] of this.components) {
            componentStates[id] = typeof component.getState === 'function'
                ? component.getState()
                : { initialized: component.initialized };
        }

        return {
            initialized: this.initialized,
            componentCount: this.components.size,
            components: componentStates
        };
    }

    /**
     * Serialize manager state for debugging
     * @returns {Object} Serialized state
     */
    toJSON() {
        return {
            initialized: this.initialized,
            componentCount: this.components.size,
            componentIds: this.getComponentIds(),
            config: this.config
        };
    }
}
