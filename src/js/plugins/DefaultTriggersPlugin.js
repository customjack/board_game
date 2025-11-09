import Plugin from '../pluginManagement/Plugin.js';
import TriggerTypes from '../enums/TriggerTypes.js';

// Import all built-in trigger classes
import OnEnterTrigger from '../models/Triggers/OnEnterTrigger.js';
import OnLandTrigger from '../models/Triggers/OnLandTrigger.js';
import OnExitTrigger from '../models/Triggers/OnExitTrigger.js';
import CodeTrigger from '../models/Triggers/CodeTrigger.js';

/**
 * DefaultTriggersPlugin - Registers all built-in trigger types
 *
 * This plugin is automatically loaded by the game engine and registers
 * the 4 core trigger types that come with the game.
 */
export default class DefaultTriggersPlugin extends Plugin {
    /**
     * Initialize the plugin and register all trigger types
     * @param {EventBus} eventBus - The event bus instance
     * @param {RegistryManager} registryManager - The registry manager instance
     * @param {FactoryManager} factoryManager - The factory manager instance
     */
    initialize(eventBus, registryManager, factoryManager) {
        this.eventBus = eventBus;
        this.registryManager = registryManager;
        this.factoryManager = factoryManager;

        // Get the TriggerFactory
        let triggerFactory = factoryManager.getFactory('TriggerFactory');

        if (!triggerFactory) {
            console.error('TriggerFactory not found in FactoryManager. Cannot register triggers.');
            return;
        }

        // Register all built-in triggers
        try {
            triggerFactory.register(TriggerTypes.ON_ENTER, OnEnterTrigger);
            console.log('Registered trigger: ON_ENTER');

            triggerFactory.register(TriggerTypes.ON_LAND, OnLandTrigger);
            console.log('Registered trigger: ON_LAND');

            triggerFactory.register(TriggerTypes.ON_EXIT, OnExitTrigger);
            console.log('Registered trigger: ON_EXIT');

            triggerFactory.register(TriggerTypes.CODE, CodeTrigger);
            console.log('Registered trigger: CODE');

            console.log('DefaultTriggersPlugin: All 4 built-in triggers registered successfully');
        } catch (error) {
            console.error('Failed to register triggers in DefaultTriggersPlugin:', error);
        }
    }

    /**
     * Get all registered trigger metadata
     * @returns {Object} Map of trigger types to their metadata
     */
    getTriggerMetadata() {
        const triggerFactory = this.factoryManager?.getFactory('TriggerFactory');
        if (triggerFactory && typeof triggerFactory.getAllMetadata === 'function') {
            return triggerFactory.getAllMetadata();
        }
        return {};
    }

    /**
     * Optional cleanup method when the plugin is removed
     */
    cleanup() {
        console.log('Cleaning up DefaultTriggersPlugin...');
    }
}
