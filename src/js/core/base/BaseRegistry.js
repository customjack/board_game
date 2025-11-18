export default class BaseRegistry {
    constructor() {
        this.registry = {};  // General-purpose registry for derived classes
    }

    // Register an item (e.g., page, listener) by ID
    register(id, item) {
        if (item) {
            this.registry[id] = item;
        } else {
            console.warn(`Item with ID ${id} could not be registered.`);
        }
    }

    // Unregister (remove) an item by ID
    unregister(id) {
        if (this.registry[id]) {
            delete this.registry[id];
            //console.log(`Item with ID ${id} unregistered.`);
        } else {
            console.warn(`Item with ID ${id} not found.`);
        }
    }

    // Clear all registered items
    clear() {
        this.registry = {};
        console.log('All items have been unregistered.');
    }

    // Retrieve an item by ID
    get(id) {
        return this.registry[id] || null;
    }

    // Get the entire registry of listeners
    getRegistry() {
        return this.registry;
    }
}
