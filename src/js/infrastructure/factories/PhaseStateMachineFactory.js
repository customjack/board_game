/**
 * PhaseStateMachineFactory - Factory for creating phase state machines
 *
 * Allows plugins to register custom phase state machine implementations
 */
import PhaseStateMachine from '../../game/engine_types/turn_based/components/PhaseStateMachine.js';

export default class PhaseStateMachineFactory {
    constructor() {
        this.registry = new Map();
        // Note: Default implementation registered by DefaultCorePlugin
    }

    /**
     * Register a phase state machine implementation
     * @param {string} type - Type identifier
     * @param {class} StateMachineClass - State machine class constructor
     */
    register(type, StateMachineClass) {
        if (!type || typeof type !== 'string') {
            throw new Error('Type must be a non-empty string');
        }

        if (typeof StateMachineClass !== 'function') {
            throw new Error('StateMachineClass must be a constructor function');
        }

        this.registry.set(type, StateMachineClass);
    }

    /**
     * Unregister a phase state machine type
     * @param {string} type - Type to remove
     * @returns {boolean} True if unregistered
     */
    unregister(type) {
        if (type === 'default') {
            throw new Error('Cannot unregister default phase state machine');
        }
        return this.registry.delete(type);
    }

    /**
     * Create a phase state machine instance
     * @param {Object} config - Configuration object
     * @param {string} config.type - Type of state machine (defaults to 'default')
     * @param {Object} config.phases - Phase configuration
     * @param {EventBus} eventBus - Event bus instance
     * @returns {PhaseStateMachine} Created instance
     */
    create(config, eventBus) {
        const type = config?.type || 'default';
        const StateMachineClass = this.registry.get(type);

        if (!StateMachineClass) {
            console.warn(`Phase state machine type '${type}' not found, using default`);
            return new PhaseStateMachine(config.phases, eventBus);
        }

        return new StateMachineClass(config.phases, eventBus);
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
