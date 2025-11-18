/**
 * TurnManagerFactory - Factory for creating turn managers
 *
 * Allows plugins to register custom turn manager implementations
 */
import TurnManager from '../game/components/TurnManager.js';

export default class TurnManagerFactory {
    constructor() {
        this.registry = new Map();
        // Note: Default implementation registered by DefaultCorePlugin
    }

    /**
     * Register a turn manager implementation
     * @param {string} type - Type identifier
     * @param {class} TurnManagerClass - Turn manager class constructor
     */
    register(type, TurnManagerClass) {
        if (!type || typeof type !== 'string') {
            throw new Error('Type must be a non-empty string');
        }

        if (typeof TurnManagerClass !== 'function') {
            throw new Error('TurnManagerClass must be a constructor function');
        }

        this.registry.set(type, TurnManagerClass);
    }

    /**
     * Unregister a turn manager type
     * @param {string} type - Type to remove
     * @returns {boolean} True if unregistered
     */
    unregister(type) {
        if (type === 'default') {
            throw new Error('Cannot unregister default turn manager');
        }
        return this.registry.delete(type);
    }

    /**
     * Create a turn manager instance
     * @param {string} type - Type of turn manager (defaults to 'default')
     * @param {GameState} gameState - Game state instance
     * @param {Object} config - Configuration object
     * @returns {TurnManager} Created instance
     */
    create(type = 'default', gameState, config = {}) {
        const TurnManagerClass = this.registry.get(type);

        if (!TurnManagerClass) {
            console.warn(`Turn manager type '${type}' not found, using default`);
            return new TurnManager(gameState, config);
        }

        return new TurnManagerClass(gameState, config);
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
