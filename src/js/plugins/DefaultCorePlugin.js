import Plugin from '../pluginManagement/Plugin.js';
import ActionTypes from '../enums/ActionTypes.js';
import TriggerTypes from '../enums/TriggerTypes.js';

// Import all built-in action classes
import PromptAllPlayersAction from '../models/Actions/PromptAllPlayersAction.js';
import PromptCurrentPlayerAction from '../models/Actions/PromptCurrentPlayerAction.js';
import SetPlayerStateAction from '../models/Actions/SetPlayerStateAction.js';
import DisplacePlayerAction from '../models/Actions/DisplacePlayerAction.js';
import ApplyEffectAction from '../models/Actions/ApplyEffectAction.js';
import SetPlayerSpaceAction from '../models/Actions/SetPlayerSpaceAction.js';
import CustomAction from '../models/Actions/CustomAction.js';

// Import all built-in trigger classes
import OnEnterTrigger from '../models/Triggers/OnEnterTrigger.js';
import OnLandTrigger from '../models/Triggers/OnLandTrigger.js';
import OnExitTrigger from '../models/Triggers/OnExitTrigger.js';
import CodeTrigger from '../models/Triggers/CodeTrigger.js';

/**
 * DefaultCorePlugin - Registers all core/default components as a single plugin
 *
 * This plugin represents ALL essential game components that cannot be disabled:
 * - Actions (7 types)
 * - Triggers (4 types)
 * - Game Engine (turn-based)
 * - Phase State Machine (default)
 * - Turn Manager (default)
 * - Event Processor (default)
 * - UI Controller (default)
 * - UI Components (6 components)
 * - Animations (4 animations)
 */
export default class DefaultCorePlugin extends Plugin {
    /**
     * Initialize the plugin and register all core components
     * @param {EventBus} eventBus - The event bus instance
     * @param {RegistryManager} registryManager - The registry manager instance
     * @param {FactoryManager} factoryManager - The factory manager instance
     */
    initialize(eventBus, registryManager, factoryManager) {
        this.eventBus = eventBus;
        this.registryManager = registryManager;
        this.factoryManager = factoryManager;

        // Register actions
        this._registerActions(factoryManager);

        // Register triggers
        this._registerTriggers(factoryManager);

        console.log('[Plugin] Core: All default components registered');
    }

    /**
     * Register all built-in actions
     * @private
     */
    _registerActions(factoryManager) {
        const actionFactory = factoryManager.getFactory('ActionFactory');

        if (!actionFactory) {
            console.error('ActionFactory not found in FactoryManager. Cannot register actions.');
            return;
        }

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
            console.log(`[Plugin] Core: Registered ${actions.length} built-in actions`);
        } catch (error) {
            console.error('[Plugin] Core: Failed to register actions', error);
        }
    }

    /**
     * Register all built-in triggers
     * @private
     */
    _registerTriggers(factoryManager) {
        const triggerFactory = factoryManager.getFactory('TriggerFactory');

        if (!triggerFactory) {
            console.error('TriggerFactory not found in FactoryManager. Cannot register triggers.');
            return;
        }

        const triggers = [
            [TriggerTypes.ON_ENTER, OnEnterTrigger],
            [TriggerTypes.ON_LAND, OnLandTrigger],
            [TriggerTypes.ON_EXIT, OnExitTrigger],
            [TriggerTypes.CODE, CodeTrigger]
        ];

        try {
            triggers.forEach(([type, classRef]) => {
                triggerFactory.register(type, classRef);
            });
            console.log(`[Plugin] Core: Registered ${triggers.length} built-in triggers`);
        } catch (error) {
            console.error('[Plugin] Core: Failed to register triggers', error);
        }
    }

    /**
     * Optional cleanup method when the plugin is removed
     */
    cleanup() {
        console.log('Cleaning up DefaultCorePlugin...');
    }

    /**
     * Get plugin metadata for Plugin Manager
     * @static
     * @returns {Object} Plugin metadata
     */
    static getPluginMetadata() {
        return {
            id: 'core-default',
            name: 'Core Game Engine',
            version: '1.0.0',
            description: 'Essential game engine components including actions, triggers, turn management, event processing, UI control, and animations. Cannot be disabled.',
            author: 'Game Engine',
            tags: ['core', 'default', 'actions', 'triggers', 'engine', 'ui'],
            isDefault: true,
            dependencies: [],
            provides: {
                actions: [
                    'PROMPT_ALL_PLAYERS',
                    'PROMPT_CURRENT_PLAYER',
                    'SET_PLAYER_STATE',
                    'DISPLACE_PLAYER',
                    'APPLY_EFFECT',
                    'SET_PLAYER_SPACE',
                    'CUSTOM'
                ],
                triggers: [
                    'ON_ENTER',
                    'ON_LAND',
                    'ON_EXIT',
                    'CODE'
                ],
                effects: [],
                components: [
                    'GameEngine (turn-based)',
                    'PhaseStateMachine (default)',
                    'TurnManager (default)',
                    'EventProcessor (default)',
                    'UIController (default)',
                    'UI Components (6): RemainingMoves, PlayerList, RollButton, Timer, GameLog, BoardCanvas',
                    'Animations (4): particle-burst, dice-roll, slot-machine, timer'
                ]
            }
        };
    }
}
