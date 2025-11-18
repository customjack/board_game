/**
 * UIControllerFactory - Factory for creating UI controllers
 *
 * Allows plugins to register custom UI controller implementations
 */
import UIController from '../../game/components/UIController.js';

export default class UIControllerFactory {
    constructor() {
        this.registry = new Map();
        // Note: Default implementation registered by DefaultCorePlugin
    }

    /**
     * Register a UI controller implementation
     * @param {string} type - Type identifier
     * @param {class} UIControllerClass - UI controller class constructor
     */
    register(type, UIControllerClass) {
        if (!type || typeof type !== 'string') {
            throw new Error('Type must be a non-empty string');
        }

        if (typeof UIControllerClass !== 'function') {
            throw new Error('UIControllerClass must be a constructor function');
        }

        this.registry.set(type, UIControllerClass);
    }

    /**
     * Unregister a UI controller type
     * @param {string} type - Type to remove
     * @returns {boolean} True if unregistered
     */
    unregister(type) {
        if (type === 'default') {
            throw new Error('Cannot unregister default UI controller');
        }
        return this.registry.delete(type);
    }

    /**
     * Create a UI controller instance
     * @param {string} type - Type of UI controller (defaults to 'default')
     * @param {Object} dependencies - Dependencies object
     * @param {Object} config - Configuration object
     * @returns {UIController} Created instance
     */
    create(type = 'default', dependencies, config = {}) {
        const UIControllerClass = this.registry.get(type);

        if (!UIControllerClass) {
            console.warn(`UI controller type '${type}' not found, using default`);
            return new UIController(dependencies, config);
        }

        return new UIControllerClass(dependencies, config);
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
