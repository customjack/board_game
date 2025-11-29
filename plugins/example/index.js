/**
 * Example Everything Plugin - Entry point for CDN loading
 *
 * Demonstrates registering every supported extension point. The plugin is
 * self-contained and built via the local rollup config for CDN hosting.
 */

// Factories for demo classes
import { createDemoAction } from './actions/demo-action.js';
import { createDemoTrigger } from './triggers/demo-trigger.js';
import { createDemoEffect } from './effects/demo-effect.js';
import { createDemoStat } from './stats/demo-stat.js';
import { createDemoState } from './engine/demo-state.js';
import { createDemoEngine } from './engine/demo-engine.js';
import { createDemoPhaseStateMachine } from './machines/demo-phase-machine.js';
import { createDemoTurnManager } from './managers/demo-turn-manager.js';
import { createDemoEventProcessor } from './processors/demo-event-processor.js';
import { createDemoUIController } from './ui/demo-ui-controller.js';
import { createDemoUIComponent } from './ui/demo-ui-component.js';
import { createDemoAnimation } from './animations/demo-animation.js';
import { createDemoPieceManager } from './pieces/demo-piece-manager.js';
import { demoBoard } from './maps/demo-board.js';
import { EXAMPLE_PLUGIN_VERSION } from './version.js';

const PLUGIN_ID = 'example-everything-plugin';

/**
 * Factory function that receives dependencies and returns the plugin class
 * @param {Object} bundle - Dependency injection bundle from host
 * @returns {Class} Example plugin class
 */
export default function createExampleEverythingPlugin(bundle) {
    const {
        Plugin,
        BaseAction,
        BaseTrigger,
        PlayerEffect,
        BaseStat,
        BaseGameEngine,
        BaseGameState,
        BasePieceManager,
        GameEngineFactory,
        GameStateFactory,
        PhaseStateMachine,
        TurnPhases,
        GamePhases,
        PluginMapProvider,
        MapStorageManager,
        createMapProvider
    } = bundle;

    const DemoAction = createDemoAction(BaseAction);
    const DemoTrigger = createDemoTrigger(BaseTrigger);
    const DemoEffect = createDemoEffect(PlayerEffect);
    const DemoStat = createDemoStat(BaseStat);
    const DemoGameState = createDemoState(BaseGameState);
    const DemoGameEngine = createDemoEngine(BaseGameEngine);
    const DemoPhaseStateMachine = createDemoPhaseStateMachine(PhaseStateMachine, GamePhases, TurnPhases);
    const DemoTurnManager = createDemoTurnManager();
    const DemoEventProcessor = createDemoEventProcessor();
    const DemoUIController = createDemoUIController();
    const DemoUIComponent = createDemoUIComponent();
    const DemoAnimation = createDemoAnimation();
    const DemoPieceManager = createDemoPieceManager(BasePieceManager);

    return class ExamplePlugin extends Plugin {
        initialize(eventBus, registryManager, factoryManager) {
            this.eventBus = eventBus;
            this.registryManager = registryManager;
            this.factoryManager = factoryManager;
            this.placeholderKeys = [];

            this.registerGameBits();
            this.registerFactories();
            this.registerPlaceholders();
            this.registerMap();
        }

        registerGameBits() {
            if (!GameStateFactory.isRegistered('demo-state')) {
                GameStateFactory.register('demo-state', DemoGameState);
            }
            if (!GameEngineFactory.isRegistered('demo-engine')) {
                GameEngineFactory.register('demo-engine', DemoGameEngine);
            }

            const pieceRegistry = this.registryManager.getPieceManagerRegistry?.();
            if (pieceRegistry && !pieceRegistry.get?.('demo-piece-manager')) {
                pieceRegistry.register('demo-piece-manager', DemoPieceManager);
            }
        }

        registerFactories() {
            const phaseFactory = this.factoryManager.getFactory('PhaseStateMachineFactory');
            phaseFactory?.register?.('demo-phase-machine', DemoPhaseStateMachine);

            const turnFactory = this.factoryManager.getFactory('TurnManagerFactory');
            turnFactory?.register?.('demo-turn-manager', DemoTurnManager);

            const eventProcessorFactory = this.factoryManager.getFactory('EventProcessorFactory');
            eventProcessorFactory?.register?.('demo-event-processor', DemoEventProcessor);

            const uiControllerFactory = this.factoryManager.getFactory('UIControllerFactory');
            uiControllerFactory?.register?.('demo-ui-controller', DemoUIController);

            const uiComponentFactory = this.factoryManager.getFactory('UIComponentFactory');
            uiComponentFactory?.register?.('demo-ui', DemoUIComponent);

            const animationFactory = this.factoryManager.getFactory('AnimationFactory');
            animationFactory?.register?.('demo-animation', DemoAnimation, {
                displayName: 'Demo Animation',
                description: 'Resolves immediately for testing',
                category: 'demo',
                duration: 'instant'
            });

            const actionFactory = this.factoryManager.getFactory('ActionFactory');
            actionFactory?.register?.('DEMO_ACTION', DemoAction);

            const triggerFactory = this.factoryManager.getFactory('TriggerFactory');
            triggerFactory?.register?.('DEMO_TRIGGER', DemoTrigger);

            const effectFactory = this.factoryManager.getFactory('EffectFactory');
            effectFactory?.register?.('DemoEffect', DemoEffect);

            const statFactory = this.factoryManager.getFactory('StatFactory');
            statFactory?.register?.('DemoStat', DemoStat);
        }

        registerPlaceholders() {
            const placeholderRegistry = this.registryManager.getRegistry?.('placeholderRegistry');
            if (!placeholderRegistry) return;

            placeholderRegistry.register('DEMO_PHRASE', () => 'Hello from the plugin!');
            this.placeholderKeys.push('DEMO_PHRASE');

            placeholderRegistry.register('DEMO_COUNTER', (_min = 0, _max = 10, context = {}) => {
                const counter = context?.gameState?.demoCounter ?? 0;
                return `Demo counter is ${counter}`;
            });
            this.placeholderKeys.push('DEMO_COUNTER');
        }

        registerMap() {
            const providerFactory = createMapProvider
                ? () => createMapProvider(PLUGIN_ID)
                : PluginMapProvider
                    ? () => new PluginMapProvider(PLUGIN_ID, MapStorageManager || null)
                    : null;

            if (!providerFactory) {
                console.warn('[ExamplePlugin] Map provider unavailable in bundle');
                return;
            }

            try {
                this.mapProvider = providerFactory();
                this.mapProvider.registerMap(demoBoard, {
                    id: demoBoard.metadata.id,
                    name: demoBoard.metadata.name,
                    description: demoBoard.metadata.description
                });
            } catch (error) {
                console.warn('[ExamplePlugin] Failed to register demo map', error);
            }
        }

        setEventHandler(eventHandler) {
            super.setEventHandler(eventHandler);
            if (eventHandler?.registerPluginEventHandler) {
                eventHandler.registerPluginEventHandler('demo:ping', ({ playerId }) => {
                    eventHandler.handlePlayerAction({
                        playerId,
                        actionType: 'DEMO_ACTION',
                        actionData: { note: 'ping from plugin' }
                    });
                });
            }
        }

        cleanup() {
            const placeholderRegistry = this.registryManager.getRegistry?.('placeholderRegistry');
            this.placeholderKeys.forEach((key) => {
                placeholderRegistry?.unregister?.(key);
            });
            this.placeholderKeys = [];
            this.mapProvider?.unregisterAllMaps();
            this.mapProvider = null;
        }

        static getPluginMetadata() {
            return {
                id: PLUGIN_ID,
                name: 'Example Everything Plugin',
                version: EXAMPLE_PLUGIN_VERSION,
                description: 'Registers dummy implementations for every extension point.',
                author: 'Example',
                tags: ['example', 'demo', 'plugin'],
                isDefault: false,
                dependencies: ['core'],
                provides: {
                    actions: ['DEMO_ACTION'],
                    triggers: ['DEMO_TRIGGER'],
                    effects: ['DemoEffect'],
                    components: [
                        'demo-engine',
                        'demo-state',
                        'demo-phase-machine',
                        'demo-turn-manager',
                        'demo-event-processor',
                        'demo-ui-controller',
                        'demo-ui',
                        'demo-animation',
                        'demo-stat',
                        'demo-map'
                    ]
                }
            };
        }
    };
}
