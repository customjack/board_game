import Plugin from './Plugin.js';
import ActionTypes from '../../infrastructure/utils/ActionTypes.js';
import TriggerTypes from '../../infrastructure/utils/TriggerTypes.js';

// Import all built-in action classes
import PromptAllPlayersAction from '../../elements/actions/PromptAllPlayersAction.js';
import PromptCurrentPlayerAction from '../../elements/actions/PromptCurrentPlayerAction.js';
import SetPlayerStateAction from '../../elements/actions/SetPlayerStateAction.js';
import DisplacePlayerAction from '../../elements/actions/DisplacePlayerAction.js';
import ApplyEffectAction from '../../elements/actions/ApplyEffectAction.js';
import SetPlayerSpaceAction from '../../elements/actions/SetPlayerSpaceAction.js';
import ForceStopAction from '../../elements/actions/ForceStopAction.js';
import SwapPlacesAction from '../../elements/actions/SwapPlacesAction.js';
import SetStatAction from '../../elements/actions/SetStatAction.js';
import ChangeStatAction from '../../elements/actions/ChangeStatAction.js';
import CustomAction from '../../elements/actions/CustomAction.js';

// Import all built-in trigger classes
import OnEnterTrigger from '../../elements/triggers/OnEnterTrigger.js';
import OnLandTrigger from '../../elements/triggers/OnLandTrigger.js';
import OnExitTrigger from '../../elements/triggers/OnExitTrigger.js';
import CodeTrigger from '../../elements/triggers/CodeTrigger.js';

// Import all built-in effect classes
import SkipTurnEffect from '../../elements/effects/SkipTurnEffect.js';
import DoubleTurnEffect from '../../elements/effects/DoubleTurnEffect.js';
import ChangeDirectionEffect from '../../elements/effects/ChangeDirectionEffect.js';
import SkipTurnsEffect from '../../elements/effects/SkipTurnsEffect.js';
import RepeatTurnsEffect from '../../elements/effects/RepeatTurnsEffect.js';

// Import all built-in stat classes
import ScoreStat from '../../elements/stats/ScoreStat.js';

// Import game engine and component classes
import TurnBasedGameEngine from '../../game/engines/TurnBasedGameEngine.js';
import GameEngineFactory from '../../infrastructure/factories/GameEngineFactory.js';
import TurnBasedGameState from '../../game/state/TurnBasedGameState.js';
import GameStateFactory from '../../infrastructure/factories/GameStateFactory.js';
import PhaseStateMachine from '../../game/components/PhaseStateMachine.js';
import TurnManager from '../../game/components/TurnManager.js';
import EventProcessor from '../../game/components/EventProcessor.js';
import UIController from '../../game/components/UIController.js';
import RemainingMovesComponent from '../../ui/components/RemainingMovesComponent.js';
import PlayerListComponent from '../../ui/components/PlayerListComponent.js';
import RollButtonComponent from '../../ui/components/RollButtonComponent.js';
import TimerComponent from '../../ui/components/TimerComponent.js';
import GameLogComponent from '../../ui/components/GameLogComponent.js';
import BoardCanvasComponent from '../../ui/components/BoardCanvasComponent.js';
import ParticleAnimation from '../../animations/ParticleAnimation.js';
import DiceRollAnimation from '../../animations/DiceRollAnimation.js';
import SlotMachineAnimation from '../../animations/SlotMachineAnimation.js';
import TimerAnimation from '../../animations/TimerAnimation.js';
import PieceManager from '../../infrastructure/managers/PieceManager.js';

/**
 * DefaultCorePlugin - Registers all core/default components as a single plugin
 *
 * This plugin represents ALL essential game components that cannot be disabled:
 * - Actions (11 types)
 * - Triggers (4 types)
 * - Effects (5 types)
 * - Stats (1 type)
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

        // Track counts for logging
        const counts = {
            gameEngines: 0,
            gameStates: 0,
            phaseStateMachines: 0,
            turnManagers: 0,
            eventProcessors: 0,
            uiControllers: 0,
            uiComponents: 0,
            animations: 0,
            actions: 0,
            triggers: 0,
            effects: 0,
            stats: 0,
            pieceManagers: 0
        };

        // Register all components
        counts.gameStates += this._registerGameStates();
        counts.gameEngines += this._registerGameEngines();
        counts.phaseStateMachines += this._registerPhaseStateMachines(factoryManager);
        counts.turnManagers += this._registerTurnManagers(factoryManager);
        counts.eventProcessors += this._registerEventProcessors(factoryManager);
        counts.uiControllers += this._registerUIControllers(factoryManager);
        counts.uiComponents += this._registerUIComponents(factoryManager);
        counts.animations += this._registerAnimations(factoryManager);
        counts.actions += this._registerActions(factoryManager);
        counts.triggers += this._registerTriggers(factoryManager);
        counts.effects += this._registerEffects(factoryManager);
        counts.stats += this._registerStats(factoryManager);
        counts.pieceManagers += this._registerPieceManagers(registryManager);

        // Output single consolidated message
        console.log(
            `[Plugin] Core: Registered ${counts.gameStates} game state, ` +
            `${counts.gameEngines} game engine, ` +
            `${counts.phaseStateMachines} phase state machine, ` +
            `${counts.turnManagers} turn manager, ` +
            `${counts.eventProcessors} event processor, ` +
            `${counts.uiControllers} UI controller, ` +
            `${counts.uiComponents} UI components, ` +
            `${counts.animations} animations, ` +
            `${counts.actions} actions, ` +
            `${counts.triggers} triggers, ` +
            `${counts.effects} effects, ` +
            `${counts.stats} stats, ` +
            `${counts.pieceManagers} piece manager`
        );
    }

    /**
     * Register game engine
     * @private
     * @returns {number} Count of registered engines
     */
    _registerGameStates() {
        try {
            GameStateFactory.register('turn-based', TurnBasedGameState);
            return 1;
        } catch (error) {
            console.error('[Plugin] Core: Failed to register game state', error);
            return 0;
        }
    }

    _registerGameEngines() {
        try {
            GameEngineFactory.register('turn-based', TurnBasedGameEngine);
            return 1;
        } catch (error) {
            console.error('[Plugin] Core: Failed to register game engine', error);
            return 0;
        }
    }

    /**
     * Register phase state machines
     * @private
     * @param {FactoryManager} factoryManager
     * @returns {number} Count of registered machines
     */
    _registerPhaseStateMachines(factoryManager) {
        const factory = factoryManager.getFactory('PhaseStateMachineFactory');
        if (!factory) return 0;

        try {
            factory.register('default', PhaseStateMachine);
            return 1;
        } catch (error) {
            console.error('[Plugin] Core: Failed to register phase state machine', error);
            return 0;
        }
    }

    /**
     * Register turn managers
     * @private
     * @param {FactoryManager} factoryManager
     * @returns {number} Count of registered managers
     */
    _registerTurnManagers(factoryManager) {
        const factory = factoryManager.getFactory('TurnManagerFactory');
        if (!factory) return 0;

        try {
            factory.register('default', TurnManager);
            return 1;
        } catch (error) {
            console.error('[Plugin] Core: Failed to register turn manager', error);
            return 0;
        }
    }

    /**
     * Register event processors
     * @private
     * @param {FactoryManager} factoryManager
     * @returns {number} Count of registered processors
     */
    _registerEventProcessors(factoryManager) {
        const factory = factoryManager.getFactory('EventProcessorFactory');
        if (!factory) return 0;

        try {
            factory.register('default', EventProcessor);
            return 1;
        } catch (error) {
            console.error('[Plugin] Core: Failed to register event processor', error);
            return 0;
        }
    }

    /**
     * Register UI controllers
     * @private
     * @param {FactoryManager} factoryManager
     * @returns {number} Count of registered controllers
     */
    _registerUIControllers(factoryManager) {
        const factory = factoryManager.getFactory('UIControllerFactory');
        if (!factory) return 0;

        try {
            factory.register('default', UIController);
            return 1;
        } catch (error) {
            console.error('[Plugin] Core: Failed to register UI controller', error);
            return 0;
        }
    }

    /**
     * Register UI components
     * @private
     * @param {FactoryManager} factoryManager
     * @returns {number} Count of registered components
     */
    _registerUIComponents(factoryManager) {
        const factory = factoryManager.getFactory('UIComponentFactory');
        if (!factory) return 0;

        const components = [
            ['RemainingMovesComponent', RemainingMovesComponent],
            ['PlayerListComponent', PlayerListComponent],
            ['RollButtonComponent', RollButtonComponent],
            ['TimerComponent', TimerComponent],
            ['GameLogComponent', GameLogComponent],
            ['BoardCanvasComponent', BoardCanvasComponent]
        ];

        try {
            components.forEach(([name, classRef]) => {
                factory.register(name, classRef);
            });
            return components.length;
        } catch (error) {
            console.error('[Plugin] Core: Failed to register UI components', error);
            return 0;
        }
    }

    /**
     * Register animations
     * @private
     * @param {FactoryManager} factoryManager
     * @returns {number} Count of registered animations
     */
    _registerAnimations(factoryManager) {
        const factory = factoryManager.getFactory('AnimationFactory');
        if (!factory) return 0;

        const animations = [
            ['particle-burst', ParticleAnimation, {
                displayName: 'Particle Burst',
                description: 'Colorful particle explosion with result display',
                category: 'roll',
                isDefault: false,
                preview: 'Fireworks-style particle explosion'
            }],
            ['dice-roll', DiceRollAnimation, {
                displayName: 'Dice Roll',
                description: 'Simple animated dice rolling',
                category: 'roll',
                isDefault: true,
                preview: 'Classic dice animation'
            }],
            ['slot-machine', SlotMachineAnimation, {
                displayName: 'Slot Machine',
                description: 'Numbers scroll like a slot machine reel',
                category: 'roll',
                isDefault: false,
                preview: 'Vegas-style slot machine rolling'
            }],
            ['timer', TimerAnimation, {
                displayName: 'Timer',
                description: 'Countdown timer animation',
                category: 'timer',
                isDefault: true,
                preview: 'Circular countdown timer'
            }]
        ];

        try {
            animations.forEach(([name, classRef, metadata]) => {
                factory.register(name, classRef, metadata);
            });
            return animations.length;
        } catch (error) {
            console.error('[Plugin] Core: Failed to register animations', error);
            return 0;
        }
    }

    /**
     * Register all built-in actions
     * @private
     * @param {FactoryManager} factoryManager
     * @returns {number} Count of registered actions
     */
    _registerActions(factoryManager) {
        const actionFactory = factoryManager.getFactory('ActionFactory');
        if (!actionFactory) return 0;

        const actions = [
            [ActionTypes.PROMPT_ALL_PLAYERS, PromptAllPlayersAction],
            [ActionTypes.PROMPT_CURRENT_PLAYER, PromptCurrentPlayerAction],
            [ActionTypes.SET_PLAYER_STATE, SetPlayerStateAction],
            [ActionTypes.DISPLACE_PLAYER, DisplacePlayerAction],
            [ActionTypes.APPLY_EFFECT, ApplyEffectAction],
            [ActionTypes.SET_PLAYER_SPACE, SetPlayerSpaceAction],
            [ActionTypes.FORCE_STOP, ForceStopAction],
            [ActionTypes.SWAP_PLACES, SwapPlacesAction],
            [ActionTypes.SET_STAT, SetStatAction],
            [ActionTypes.CHANGE_STAT, ChangeStatAction],
            [ActionTypes.CUSTOM, CustomAction]
        ];

        try {
            actions.forEach(([type, classRef]) => {
                actionFactory.register(type, classRef);
            });
            return actions.length;
        } catch (error) {
            console.error('[Plugin] Core: Failed to register actions', error);
            return 0;
        }
    }

    /**
     * Register all built-in triggers
     * @private
     * @param {FactoryManager} factoryManager
     * @returns {number} Count of registered triggers
     */
    _registerTriggers(factoryManager) {
        const triggerFactory = factoryManager.getFactory('TriggerFactory');
        if (!triggerFactory) return 0;

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
            return triggers.length;
        } catch (error) {
            console.error('[Plugin] Core: Failed to register triggers', error);
            return 0;
        }
    }

    /**
     * Register all built-in effects
     * @private
     * @param {FactoryManager} factoryManager
     * @returns {number} Count of registered effects
     */
    _registerEffects(factoryManager) {
        const effectFactory = factoryManager.getFactory('EffectFactory');
        if (!effectFactory) return 0;

        const effects = [
            ['SkipTurnEffect', SkipTurnEffect],
            ['DoubleTurnEffect', DoubleTurnEffect],
            ['ChangeDirectionEffect', ChangeDirectionEffect],
            ['SkipTurnsEffect', SkipTurnsEffect],
            ['RepeatTurnsEffect', RepeatTurnsEffect]
        ];

        try {
            effects.forEach(([type, classRef]) => {
                effectFactory.register(type, classRef);
            });
            return effects.length;
        } catch (error) {
            console.error('[Plugin] Core: Failed to register effects', error);
            return 0;
        }
    }

    /**
     * Register all built-in stats
     * @private
     * @param {FactoryManager} factoryManager
     * @returns {number} Count of registered stats
     */
    _registerStats(factoryManager) {
        const statFactory = factoryManager.getFactory('StatFactory');
        if (!statFactory) return 0;

        const stats = [
            ['ScoreStat', ScoreStat]
        ];

        try {
            stats.forEach(([type, classRef]) => {
                statFactory.register(type, classRef);
            });
            return stats.length;
        } catch (error) {
            console.error('[Plugin] Core: Failed to register stats', error);
            return 0;
        }
    }

    _registerPieceManagers(registryManager) {
        const pieceRegistry = registryManager.getPieceManagerRegistry?.();
        if (!pieceRegistry) return 0;
        try {
            pieceRegistry.register('standard', PieceManager);
            return 1;
        } catch (error) {
            console.error('[Plugin] Core: Failed to register piece manager', error);
            return 0;
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
            description: 'Essential game engine components including actions, triggers, effects, turn management, event processing, UI control, and animations. Cannot be disabled.',
            author: 'Game Engine',
            tags: ['core', 'default', 'actions', 'triggers', 'effects', 'engine', 'ui'],
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
                    'FORCE_STOP',
                    'SWAP_PLACES',
                    'CUSTOM'
                ],
                triggers: [
                    'ON_ENTER',
                    'ON_LAND',
                    'ON_EXIT',
                    'CODE'
                ],
                effects: [
                    'SkipTurnEffect',
                    'DoubleTurnEffect',
                    'ChangeDirectionEffect',
                    'SkipTurnsEffect',
                    'RepeatTurnsEffect'
                ],
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
