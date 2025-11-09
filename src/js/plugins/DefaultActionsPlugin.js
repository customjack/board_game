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
    constructor() {
        super('DefaultActionsPlugin', '1.0.0');
        this.description = 'Provides all built-in action types for the game';
    }

    /**
     * Initialize the plugin and register all action types
     * @param {Object} context - Plugin context with eventBus, registryManager, factoryManager
     */
    initialize(context) {
        super.initialize(context);

        const { factoryManager } = context;

        // Get or create the ActionFactory
        let actionFactory = factoryManager.getFactory('ActionFactory');

        if (!actionFactory) {
            console.error('ActionFactory not found in FactoryManager. Cannot register actions.');
            return;
        }

        // Register all built-in actions
        try {
            actionFactory.register(ActionTypes.PROMPT_ALL_PLAYERS, PromptAllPlayersAction);
            console.log('Registered action: PROMPT_ALL_PLAYERS');

            actionFactory.register(ActionTypes.PROMPT_CURRENT_PLAYER, PromptCurrentPlayerAction);
            console.log('Registered action: PROMPT_CURRENT_PLAYER');

            actionFactory.register(ActionTypes.SET_PLAYER_STATE, SetPlayerStateAction);
            console.log('Registered action: SET_PLAYER_STATE');

            actionFactory.register(ActionTypes.DISPLACE_PLAYER, DisplacePlayerAction);
            console.log('Registered action: DISPLACE_PLAYER');

            actionFactory.register(ActionTypes.APPLY_EFFECT, ApplyEffectAction);
            console.log('Registered action: APPLY_EFFECT');

            actionFactory.register(ActionTypes.SET_PLAYER_SPACE, SetPlayerSpaceAction);
            console.log('Registered action: SET_PLAYER_SPACE');

            actionFactory.register(ActionTypes.CUSTOM, CustomAction);
            console.log('Registered action: CUSTOM');

            console.log('DefaultActionsPlugin: All 7 built-in actions registered successfully');
        } catch (error) {
            console.error('Failed to register actions in DefaultActionsPlugin:', error);
        }
    }

    /**
     * Get all registered action metadata
     * @returns {Object} Map of action types to their metadata
     */
    getActionMetadata() {
        const actionFactory = this.context?.factoryManager?.getFactory('ActionFactory');
        if (actionFactory && typeof actionFactory.getAllMetadata === 'function') {
            return actionFactory.getAllMetadata();
        }
        return {};
    }
}
