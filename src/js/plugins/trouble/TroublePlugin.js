import Plugin from '../../systems/plugins/Plugin.js';
import GameEngineFactory from '../../infrastructure/factories/GameEngineFactory.js';
import TroubleGameEngine from './engine/TroubleGameEngine.js';

export default class TroublePlugin extends Plugin {
    /**
     * Initialize the plugin
     * @param {EventBus} eventBus - The event bus instance
     * @param {RegistryManager} registryManager - The registry manager instance
     * @param {FactoryManager} factoryManager - The factory manager instance
     */
    initialize(eventBus, registryManager, factoryManager) {
        this.eventBus = eventBus;
        this.registryManager = registryManager;
        this.factoryManager = factoryManager;

        // Register Trouble game engine
        if (!GameEngineFactory.isRegistered('trouble')) {
            GameEngineFactory.register('trouble', TroubleGameEngine);
            console.log('[TroublePlugin] Registered TroubleGameEngine');
        }
    }

    /**
     * Cleanup when plugin is disabled/removed
     */
    cleanup() {
        // Optional: Unregister engine if supported by factory
        console.log('[TroublePlugin] Cleanup complete');
    }

    /**
     * Get plugin metadata
     * @static
     * @returns {Object} Plugin metadata
     */
    static getPluginMetadata() {
        return {
            id: 'trouble-plugin',
            name: 'Trouble Game Engine',
            version: '1.0.0',
            description: 'Adds support for the classic Trouble/Pop-O-Matic ruleset.',
            author: 'Antigravity',
            tags: ['trouble', 'pop-o-matic', 'engine'],
            isDefault: false,
            dependencies: [],
            provides: {
                actions: [],
                triggers: [],
                effects: [],
                components: []
            }
        };
    }
}
