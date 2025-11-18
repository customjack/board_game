// Plugin.js
export default class Plugin {
    /**
     * Initialize the plugin.
     * @param {EventBus} eventBus - The event bus instance.
     * @param {RegistryManager} registryManager - The registry manager instance.
     * @param {FactoryManager} factoryManager - The factory manager instance.
     */
    initialize(eventBus, registryManager, factoryManager) {
        throw new Error('initialize() method must be implemented by the plugin.');
    }

    /**
     * Set the Peer instance for the plugin.
     * @param {Peer} peer - The PeerJS instance.
     */
    setPeer(peer) {
        this.peer = peer;
    }

    /**
     * Set the host status for the plugin.
     * @param {Boolean} isHost - Whether this instance is a host.
     */
    setHost(isHost) {
        this.isHost = isHost;
    }

    /**
     * Set the event handler (Host/Client EventHandler) for the plugin.
     * This allows plugins to register custom event handlers.
     * @param {BaseEventHandler} eventHandler - The event handler instance.
     */
    setEventHandler(eventHandler) {
        this.eventHandler = eventHandler;
    }

    /**
     * Optional cleanup method when the plugin is removed.
     */
    cleanup() {
        // Can be overridden by the plugin for cleanup logic
    }

    /**
     * Get plugin metadata (should be implemented as static method)
     * @static
     * @returns {Object} Plugin metadata including dependencies
     */
    static getPluginMetadata() {
        return {
            id: 'unknown',
            name: 'Unknown Plugin',
            version: '1.0.0',
            description: '',
            author: '',
            tags: [],
            isDefault: false,
            dependencies: [], // Array of plugin IDs this depends on
            provides: {
                actions: [],
                triggers: [],
                effects: [],
                components: []
            }
        };
    }
}
