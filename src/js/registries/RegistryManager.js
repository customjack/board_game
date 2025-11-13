// RegistryManager.js

export default class RegistryManager {
    constructor() {
        this.registries = {};
    }

    // Add a registry (e.g., PageRegistry, ListenerRegistry)
    addRegistry(name, registryInstance) {
        this.registries[name] = registryInstance;
    }

    // Get a registry by name
    getRegistry(name) {
        return this.registries[name];
    }

    // Shortcuts for common registries
    getPageRegistry() {
        return this.getRegistry('pageRegistry');
    }

    getListenerRegistry() {
        return this.getRegistry('listenerRegistry');
    }

    getPieceManagerRegistry() {
        return this.getRegistry('pieceManagerRegistry');
    }

    // Add more shortcuts as needed for new registries
}
