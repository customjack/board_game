/**
 * EventProcessorFactory - Factory for creating event processors
 *
 * Allows plugins to register custom event processor implementations
 */
import EventProcessor from '../engines/components/EventProcessor.js';

export default class EventProcessorFactory {
    constructor() {
        this.registry = new Map();
        // Register default implementation
        this.register('default', EventProcessor);
    }

    /**
     * Register an event processor implementation
     * @param {string} type - Type identifier
     * @param {class} EventProcessorClass - Event processor class constructor
     */
    register(type, EventProcessorClass) {
        if (!type || typeof type !== 'string') {
            throw new Error('Type must be a non-empty string');
        }

        if (typeof EventProcessorClass !== 'function') {
            throw new Error('EventProcessorClass must be a constructor function');
        }

        this.registry.set(type, EventProcessorClass);
        console.log(`Registered event processor type: ${type}`);
    }

    /**
     * Unregister an event processor type
     * @param {string} type - Type to remove
     * @returns {boolean} True if unregistered
     */
    unregister(type) {
        if (type === 'default') {
            throw new Error('Cannot unregister default event processor');
        }
        return this.registry.delete(type);
    }

    /**
     * Create an event processor instance
     * @param {string} type - Type of event processor (defaults to 'default')
     * @param {GameState} gameState - Game state instance
     * @param {EventBus} eventBus - Event bus instance
     * @param {Object} config - Configuration object
     * @returns {EventProcessor} Created instance
     */
    create(type = 'default', gameState, eventBus, config = {}) {
        const EventProcessorClass = this.registry.get(type);

        if (!EventProcessorClass) {
            console.warn(`Event processor type '${type}' not found, using default`);
            return new EventProcessor(gameState, eventBus, config);
        }

        return new EventProcessorClass(gameState, eventBus, config);
    }

    /**
     * Check if a type is registered
     * @param {string} type - Type to check
     * @returns {boolean} True if registered
     */
    isRegistered(type) {
        return this.registry.has(type);
    }

    /**
     * Get all registered types
     * @returns {string[]} Array of registered types
     */
    getRegisteredTypes() {
        return Array.from(this.registry.keys());
    }
}
