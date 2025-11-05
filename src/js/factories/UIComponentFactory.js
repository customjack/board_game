/**
 * UIComponentFactory - Factory for creating UI components
 *
 * Allows plugins to register custom UI component implementations
 * such as custom player lists, timers, game logs, etc.
 */
import RemainingMovesComponent from '../ui/components/RemainingMovesComponent.js';
import PlayerListComponent from '../ui/components/PlayerListComponent.js';
import RollButtonComponent from '../ui/components/RollButtonComponent.js';
import TimerComponent from '../ui/components/TimerComponent.js';
import GameLogComponent from '../ui/components/GameLogComponent.js';
import BoardCanvasComponent from '../ui/components/BoardCanvasComponent.js';

export default class UIComponentFactory {
    constructor() {
        this.registry = new Map();

        // Register default implementations
        this.register('RemainingMovesComponent', RemainingMovesComponent);
        this.register('PlayerListComponent', PlayerListComponent);
        this.register('RollButtonComponent', RollButtonComponent);
        this.register('TimerComponent', TimerComponent);
        this.register('GameLogComponent', GameLogComponent);
        this.register('BoardCanvasComponent', BoardCanvasComponent);
    }

    /**
     * Register a UI component implementation
     * @param {string} type - Type identifier (component name)
     * @param {class} ComponentClass - Component class constructor
     */
    register(type, ComponentClass) {
        if (!type || typeof type !== 'string') {
            throw new Error('Type must be a non-empty string');
        }

        if (typeof ComponentClass !== 'function') {
            throw new Error('ComponentClass must be a constructor function');
        }

        this.registry.set(type, ComponentClass);
        console.log(`Registered UI component type: ${type}`);
    }

    /**
     * Unregister a UI component type
     * @param {string} type - Type to remove
     * @returns {boolean} True if unregistered
     */
    unregister(type) {
        const defaultTypes = [
            'RemainingMovesComponent',
            'PlayerListComponent',
            'RollButtonComponent',
            'TimerComponent',
            'GameLogComponent',
            'BoardCanvasComponent'
        ];

        if (defaultTypes.includes(type)) {
            console.warn(`Cannot unregister default component type: ${type}`);
            return false;
        }

        return this.registry.delete(type);
    }

    /**
     * Create a UI component instance
     * @param {string} type - Type of component to create
     * @param {Object} config - Component configuration
     * @returns {BaseUIComponent} Created component instance
     */
    create(type, config = {}) {
        const ComponentClass = this.registry.get(type);

        if (!ComponentClass) {
            throw new Error(`UI component type '${type}' not found in registry`);
        }

        return new ComponentClass(config);
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
     * @returns {string[]} Array of registered component types
     */
    getRegisteredTypes() {
        return Array.from(this.registry.keys());
    }

    /**
     * Get a component class (for extending)
     * @param {string} type - Component type
     * @returns {class|null} Component class or null
     */
    getComponentClass(type) {
        return this.registry.get(type) || null;
    }
}
