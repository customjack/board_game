import Plugin from '../pluginManagement/Plugin.js';
import ActionTypes from '../enums/ActionTypes.js';

// Import all built-in action classes
import PromptAllPlayersAction from '../models/Actions/PromptAllPlayersAction.js';
import PromptCurrentPlayerAction from '../models/Actions/PromptCurrentPlayerAction.js';
import SetPlayerStateAction from '../models/Actions/SetPlayerStateAction.js';
import DisplacePlayerAction from '../models/Actions/DisplacePlayerAction.js';
import ApplyEffectAction from '../models/Actions/ApplyEffectAction.js';
import SetPlayerSpaceAction from '../models/Actions/SetPlayerSpaceAction.js';
import CustomAction from '../models/Actions/CustomAction.js';

/**
 * DefaultActionsPlugin - Registers all built-in action types
 *
 * This plugin is automatically loaded by the game engine and registers
 * the 7 core action types that come with the game.
 */
export default class DefaultActionsPlugin extends Plugin {
    /**
     * Initialize the plugin and register all action types
     * @param {EventBus} eventBus - The event bus instance
     * @param {RegistryManager} registryManager - The registry manager instance
     * @param {FactoryManager} factoryManager - The factory manager instance
     */
    initialize(eventBus, registryManager, factoryManager) {
        this.eventBus = eventBus;
        this.registryManager = registryManager;
        this.factoryManager = factoryManager;

        // Get or create the ActionFactory
        let actionFactory = factoryManager.getFactory('ActionFactory');

        if (!actionFactory) {
            console.error('ActionFactory not found in FactoryManager. Cannot register actions.');
            return;
        }

        // Register all built-in actions
        const actions = [
            [ActionTypes.PROMPT_ALL_PLAYERS, PromptAllPlayersAction],
            [ActionTypes.PROMPT_CURRENT_PLAYER, PromptCurrentPlayerAction],
            [ActionTypes.SET_PLAYER_STATE, SetPlayerStateAction],
            [ActionTypes.DISPLACE_PLAYER, DisplacePlayerAction],
            [ActionTypes.APPLY_EFFECT, ApplyEffectAction],
            [ActionTypes.SET_PLAYER_SPACE, SetPlayerSpaceAction],
            [ActionTypes.CUSTOM, CustomAction]
        ];

        try {
            actions.forEach(([type, classRef]) => {
                actionFactory.register(type, classRef);
            });
            console.log(`[Plugin] DefaultActions: Registered ${actions.length} built-in actions`);
        } catch (error) {
            console.error('[Plugin] DefaultActions: Failed to register actions', error);
        }
    }

    /**
     * Get all registered action metadata
     * @returns {Object} Map of action types to their metadata
     */
    getActionMetadata() {
        const actionFactory = this.factoryManager?.getFactory('ActionFactory');
        if (actionFactory && typeof actionFactory.getAllMetadata === 'function') {
            return actionFactory.getAllMetadata();
        }
        return {};
    }

    /**
     * Optional cleanup method when the plugin is removed
     */
    cleanup() {
        console.log('Cleaning up DefaultActionsPlugin...');
    }
}
