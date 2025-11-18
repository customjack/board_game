import BaseRegistry from './BaseRegistry';

export default class WindowListenerRegistry extends BaseRegistry {
    constructor() {
        super();  // Initialize the BaseRegistry
    }

    // Register a listener for a window event
    registerListener(eventType, callback) {
        window.addEventListener(eventType, callback);
        this.register(`${eventType}_${callback.toString()}`, { eventType, callback });
    }

    // Unregister a listener for a window event
    unregisterListener(eventType, callback) {
        window.removeEventListener(eventType, callback);
        this.unregister(`${eventType}_${callback.toString()}`);
    }

    // Unregister all window event listeners
    unregisterAllListeners() {
        const registry = this.getRegistry();
        Object.keys(registry).forEach(key => {
            const { eventType, callback } = registry[key];
            window.removeEventListener(eventType, callback);
        });
        this.clear();  // Clear the registry
    }
}
