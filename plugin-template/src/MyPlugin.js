/**
 * MyPlugin
 * A sample plugin for the Drinking Board Game.
 */
export default class MyPlugin {
    /**
     * Required: Get metadata about the plugin.
     */
    static getPluginMetadata() {
        return {
            id: 'my-plugin-id', // Unique ID
            name: 'My Cool Plugin',
            version: '1.0.0',
            description: 'A brief description of what this plugin does.',
            author: 'Your Name',
            tags: ['gameplay', 'example'],
            isDefault: false,
            dependencies: [], // IDs of other plugins this depends on
            provides: {
                actions: [],
                triggers: [],
                effects: [],
                components: []
            }
        };
    }

    /**
     * Required: Initialize the plugin.
     * @param {EventBus} eventBus - The game's event bus.
     * @param {RegistryManager} registryManager - Access to game registries.
     * @param {FactoryManager} factoryManager - Access to game factories.
     */
    initialize(eventBus, registryManager, factoryManager) {
        console.log('MyPlugin initialized!');

        // Example: Register a custom action
        // const actionFactory = factoryManager.getFactory('ActionFactory');
        // actionFactory.register('myCustomAction', MyCustomActionClass);

        // Example: Listen for an event
        // eventBus.subscribe('playerMoved', (data) => {
        //     console.log('Player moved:', data);
        // });
    }

    /**
     * Optional: Cleanup when the plugin is disabled/removed.
     */
    cleanup() {
        console.log('MyPlugin cleaned up!');
    }
}
