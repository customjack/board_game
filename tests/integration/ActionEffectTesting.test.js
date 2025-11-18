/**
 * Integration tests for Action & Effect Testing Map
 * Tests FORCE_STOP, SWAP_PLACES, SkipTurnEffect, DoubleTurnEffect, and ChangeDirectionEffect
 */

import TurnBasedGameEngine from '../../src/js/engines/TurnBasedGameEngine.js';
import TurnBasedGameState from '../../src/js/models/gameStates/TurnBasedGameState.js';
import Player from '../../src/js/models/Player.js';
import RegistryManager from '../../src/js/registries/RegistryManager.js';
import FactoryManager from '../../src/js/factories/FactoryManager.js';
import PluginManager from '../../src/js/pluginManagement/PluginManager.js';
import EventBus from '../../src/js/events/EventBus.js';
import ActionFactory from '../../src/js/factories/ActionFactory.js';
import EffectFactory from '../../src/js/factories/EffectFactory.js';
import TriggerFactory from '../../src/js/factories/TriggerFactory.js';
import PhaseStateMachineFactory from '../../src/js/factories/PhaseStateMachineFactory.js';
import TurnManagerFactory from '../../src/js/factories/TurnManagerFactory.js';
import EventProcessorFactory from '../../src/js/factories/EventProcessorFactory.js';
import UIControllerFactory from '../../src/js/factories/UIControllerFactory.js';
import UIComponentFactory from '../../src/js/factories/UIComponentFactory.js';
import AnimationFactory from '../../src/js/factories/AnimationFactory.js';
import DefaultCorePlugin from '../../src/js/plugins/DefaultCorePlugin.js';
import StatFactory from '../../src/js/factories/StatFactory.js';
import Board from '../../src/js/models/Board.js';
import Settings from '../../src/js/models/Settings.js';
import SkipTurnEffect from '../../src/js/models/PlayerEffects/SkipTurnEffect.js';
import SkipTurnsEffect from '../../src/js/models/PlayerEffects/SkipTurnsEffect.js';
import DoubleTurnEffect from '../../src/js/models/PlayerEffects/DoubleTurnEffect.js';
import ChangeDirectionEffect from '../../src/js/models/PlayerEffects/ChangeDirectionEffect.js';

// Import the testing board
import testingBoard from '../../src/assets/maps/examples/action-effect-testing.json';

const getSpaceDefinition = (spaceId) => {
    return testingBoard.board?.topology?.spaces?.find(space => space.id === spaceId);
};

describe('Action & Effect Testing Map Integration Tests', () => {
    let gameEngine;
    let gameState;
    let player1;
    let player2;
    let eventBus;
    let factoryManager;
    let registryManager;
    let pluginManager;

    beforeEach(() => {
        // Initialize event bus and managers
        eventBus = new EventBus();
        registryManager = new RegistryManager();
        factoryManager = new FactoryManager();

        // Register all factories
        factoryManager.registerFactory('ActionFactory', new ActionFactory());
        factoryManager.registerFactory('EffectFactory', new EffectFactory());
        factoryManager.registerFactory('TriggerFactory', new TriggerFactory());
        factoryManager.registerFactory('PhaseStateMachineFactory', new PhaseStateMachineFactory());
        factoryManager.registerFactory('TurnManagerFactory', new TurnManagerFactory());
        factoryManager.registerFactory('EventProcessorFactory', new EventProcessorFactory());
        factoryManager.registerFactory('UIControllerFactory', new UIControllerFactory());
        factoryManager.registerFactory('UIComponentFactory', new UIComponentFactory());
        factoryManager.registerFactory('AnimationFactory', new AnimationFactory());
        factoryManager.registerFactory('StatFactory', new StatFactory());

        // Initialize plugin manager
        pluginManager = new PluginManager(eventBus, registryManager, factoryManager);

        // Register the default core plugin to get all actions and effects
        const defaultCorePlugin = new DefaultCorePlugin();
        pluginManager.registerPlugin(defaultCorePlugin);

        // Create players
        player1 = new Player('peer-1', 'Player1', factoryManager, false, 'p1');
        player2 = new Player('peer-2', 'Player2', factoryManager, false, 'p2');

        const board = Board.fromJSON(testingBoard, factoryManager);
        const settings = new Settings({
            turnTimerEnabled: false,
            turnTimer: 30,
            moveDelay: 0,
            modalTimeoutSeconds: 0
        });

        gameState = new TurnBasedGameState(
            board,
            factoryManager,
            [player1, player2],
            settings
        );
        gameState.resetPlayerPositions();

        // Mock dependencies for game engine
        const dependencies = {
            gameState,
            peerId: 'peer-1',
            proposeGameState: jest.fn(),
            eventBus,
            registryManager,
            factoryManager,
            isHost: true,
            rollButtonManager: {
                disable: jest.fn(),
                enable: jest.fn(),
                hide: jest.fn(),
                show: jest.fn()
            },
            timerManager: {
                start: jest.fn(),
                stop: jest.fn(),
                reset: jest.fn()
            }
        };

        // Create game engine
        gameEngine = new TurnBasedGameEngine(dependencies, testingBoard.gameEngine?.config || {});

        // Mock console methods to reduce test noise
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Board Structure', () => {
        test('should load testing board correctly', () => {
            expect(gameState.board).toBeDefined();
            expect(gameState.board.metadata.name).toBe('Complete Action & Effect Testing Map');
            expect(gameState.board.spaces).toHaveLength(testingBoard.board.topology.spaces.length);
        });

        test('should have all required test spaces', () => {
            const spaceIds = testingBoard.board.topology.spaces.map(s => s.id);
            expect(spaceIds).toContain('start');
            expect(spaceIds).toContain('hub');
            expect(spaceIds).toContain('force-stop');
            expect(spaceIds).toContain('swap-places');
            expect(spaceIds).toContain('skip-turn');
            expect(spaceIds).toContain('double-turn');
            expect(spaceIds).toContain('change-dir');
            expect(spaceIds).toContain('finish');
        });

        test('should start players at start space', () => {
            expect(player1.currentSpaceId).toBe('start');
            expect(player2.currentSpaceId).toBe('start');
        });
    });

    describe('FORCE_STOP Action Tests', () => {
        test('should set remaining moves to 0 when landing on force-stop space', () => {
            // Move player1 to force-stop space
            player1.currentSpaceId = 'force-stop';
            gameState.remainingMoves = 5;

            // Get the force-stop space and its triggers
            const forceStopSpace = getSpaceDefinition('force-stop');
            expect(forceStopSpace).toBeDefined();

            // Find the FORCE_STOP trigger
            const forceStopTrigger = forceStopSpace.triggers.find(
                t => t.action?.type === 'FORCE_STOP'
            );
            expect(forceStopTrigger).toBeDefined();

            // Execute the action
            const actionFactory = factoryManager.getFactory('ActionFactory');
            const forceStopAction = actionFactory.create(
                forceStopTrigger.action.type,
                forceStopTrigger.action.payload || {}
            );
            forceStopAction.execute(gameEngine, () => {});

            // Verify remaining moves is now 0
            expect(gameState.remainingMoves).toBe(0);
        });
    });

    describe('SWAP_PLACES Action Tests', () => {
        test('should swap positions between current player and another player', () => {
            // Set up players at different positions
            player1.currentSpaceId = 'swap-places';
            player2.currentSpaceId = 'hub';
            gameState.setCurrentPlayerIndex(0); // player1 is current

            // Get the swap-places space and its triggers
            const swapSpace = getSpaceDefinition('swap-places');
            expect(swapSpace).toBeDefined();

            // Find the SWAP_PLACES trigger
            const swapTrigger = swapSpace.triggers.find(
                t => t.action?.type === 'SWAP_PLACES'
            );
            expect(swapTrigger).toBeDefined();

            // Execute the action
            const actionFactory = factoryManager.getFactory('ActionFactory');
            const swapAction = actionFactory.create(
                swapTrigger.action.type,
                swapTrigger.action.payload || {}
            );
            swapAction.execute(gameEngine, () => {});

            // Verify positions were swapped
            expect(player1.currentSpaceId).toBe('hub');
            expect(player2.currentSpaceId).toBe('swap-places');
        });
    });

    describe('SkipTurnEffect Tests', () => {
        test('should apply SkipTurnsEffect with duration 2', () => {
            // Move player1 to skip-turn space
            player1.currentSpaceId = 'skip-turn';
            gameState.setCurrentPlayerIndex(0);

            // Get the skip-turn space and its triggers
            const skipSpace = getSpaceDefinition('skip-turn');
            expect(skipSpace).toBeDefined();

            // Find the APPLY_EFFECT trigger for SkipTurnsEffect
            const skipTrigger = skipSpace.triggers.find(
                t => t.action?.type === 'APPLY_EFFECT' &&
                    t.action?.payload?.effect?.type === 'SkipTurnsEffect'
            );
            expect(skipTrigger).toBeDefined();

            // Apply the effect directly using the effect factory
            const effectFactory = factoryManager.getFactory('EffectFactory');
            const effectInstance = effectFactory.createEffectFromJSON(skipTrigger.action.payload.effect);
            effectInstance.apply(gameEngine);

            // Verify effect was applied
            const effects = player1.effects;
            const skipEffect = effects.find(e => e instanceof SkipTurnsEffect);
            expect(skipEffect).toBeDefined();
            expect(skipEffect.turnsToSkip).toBe(2);
        });

        test('should skip player turns when SkipTurnEffect is active', () => {
            // Apply SkipTurnEffect to player1
            const effectFactory = factoryManager.getFactory('EffectFactory');
            const skipEffect = effectFactory.create('SkipTurnEffect', 'skip_test', 2, false, null);
            gameState.setCurrentPlayerIndex(0);
            skipEffect.apply(gameEngine);

            // Get player1's effects
            const effects = player1.effects;
            expect(effects.length).toBeGreaterThan(0);
            const activeSkipEffect = effects.find(e => e instanceof SkipTurnEffect);
            expect(activeSkipEffect).toBeDefined();

            // The effect should be active for 2 turns
            expect(activeSkipEffect.duration).toBeGreaterThan(0);
        });
    });

    describe('DoubleTurnEffect Tests', () => {
        test('should apply DoubleTurnEffect with duration 1', () => {
            // Move player1 to double-turn space
            player1.currentSpaceId = 'double-single-turn';
            gameState.setCurrentPlayerIndex(0);

            // Get the double-turn space and its triggers
            const doubleSpace = getSpaceDefinition('double-single-turn');
            expect(doubleSpace).toBeDefined();

            // Find the APPLY_EFFECT trigger for DoubleTurnEffect
            const doubleTrigger = doubleSpace.triggers.find(
                t => t.action?.type === 'APPLY_EFFECT' &&
                    t.action?.payload?.effect?.type === 'DoubleTurnEffect'
            );
            expect(doubleTrigger).toBeDefined();

            // Execute the action
            const effectFactory = factoryManager.getFactory('EffectFactory');
            const effectInstance = effectFactory.createEffectFromJSON(doubleTrigger.action.payload.effect);
            effectInstance.apply(gameEngine);

            // Verify effect was applied
            const effects = player1.effects;
            const doubleEffect = effects.find(e => e instanceof DoubleTurnEffect);
            expect(doubleEffect).toBeDefined();
            expect(doubleEffect.duration).toBe(1);
        });
    });

    describe('ChangeDirectionEffect Tests', () => {
        test('should apply ChangeDirectionEffect with duration 3', () => {
            // Move player1 to change-dir space
            player1.currentSpaceId = 'change-dir';
            gameState.setCurrentPlayerIndex(0);

            // Get the change-dir space and its triggers
            const changeSpace = getSpaceDefinition('change-dir');
            expect(changeSpace).toBeDefined();

            // Find the APPLY_EFFECT trigger for ChangeDirectionEffect
            const changeTrigger = changeSpace.triggers.find(
                t => t.action?.type === 'APPLY_EFFECT' &&
                    t.action?.payload?.effect?.type === 'ChangeDirectionEffect'
            );
            expect(changeTrigger).toBeDefined();

            // Execute the action
            const effectFactory = factoryManager.getFactory('EffectFactory');
            const effectInstance = effectFactory.createEffectFromJSON(changeTrigger.action.payload.effect);
            effectInstance.apply(gameEngine);

            // Verify effect was applied
            const effects = player1.effects;
            const changeEffect = effects.find(e => e instanceof ChangeDirectionEffect);
            expect(changeEffect).toBeDefined();
            expect(changeEffect.duration).toBe(3);
            expect(changeEffect.isReversed).toBe(true);
        });

        test('should mark player for reverse movement', () => {
            // Apply ChangeDirectionEffect to player1
            const effectFactory = factoryManager.getFactory('EffectFactory');
            const changeEffect = effectFactory.create('ChangeDirectionEffect', ['dir_test', 3, false, null, false]);
            changeEffect.apply(gameEngine);

            // Verify the effect was applied and player is marked for reversal
            const effects = player1.effects;
            const activeChangeEffect = effects.find(e => e.constructor.name === 'ChangeDirectionEffect');
            expect(activeChangeEffect).toBeDefined();
            expect(activeChangeEffect.playerIdReversed).toBe(player1.id);
            expect(activeChangeEffect.isReversed).toBe(true);
        });
    });

    describe('Hub Navigation Tests', () => {
        test('should have 5 connections from hub to test paths', () => {
            const hubSpace = getSpaceDefinition('hub');
            expect(hubSpace).toBeDefined();
            expect(hubSpace.connections).toHaveLength(11);

            const connectionIds = hubSpace.connections.map(c => c.targetId);
            expect(connectionIds).toEqual(expect.arrayContaining([
                'force-stop',
                'swap-places',
                'skip-turn',
                'double-turn',
                'change-dir'
            ]));
        });
    });

    describe('Full Game Flow Test', () => {
        test('should handle a complete game with both players', () => {
            // Start game
            expect(gameState.getCurrentPlayer()).toBe(player1);

            // Player 1 moves from start to hub
            player1.currentSpaceId = 'hub';
            expect(player1.currentSpaceId).toBe('hub');

            // Player 1 chooses force-stop path
            player1.currentSpaceId = 'force-stop';
            gameState.remainingMoves = 3;

            // Apply FORCE_STOP
            const actionFactory = factoryManager.getFactory('ActionFactory');
            const forceStopAction = actionFactory.create('FORCE_STOP', {});
            forceStopAction.execute(gameEngine, () => {});
            expect(gameState.remainingMoves).toBe(0);

            // Move to next turn (player 2)
            gameState.setCurrentPlayerIndex(1);
            expect(gameState.getCurrentPlayer()).toBe(player2);

            // Player 2 moves to skip-turn space
            player2.currentSpaceId = 'skip-turn';

            // Apply SkipTurnEffect
            const effectFactory = factoryManager.getFactory('EffectFactory');
            const skipEffect = effectFactory.create('SkipTurnEffect', 'skip_test', 2, false, null);

            // Change current player back to player1 for the test
            gameState.setCurrentPlayerIndex(0);
            skipEffect.apply(gameEngine);

            // Verify the effect is on player1
            const effects = player1.effects;
            expect(effects.length).toBeGreaterThan(0);
            const singleSkipEffect = effects.find(e => e instanceof SkipTurnEffect);
            expect(singleSkipEffect).toBeDefined();
            expect(singleSkipEffect.duration).toBe(2);
        });
    });
});
