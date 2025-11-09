import GameEvent from '../GameEvent';
import GameEventState from '../../enums/GameEventState';
import { PriorityLevels } from '../../enums/PriorityLevels';
import TriggerTypes from '../../enums/TriggerTypes';
import ActionTypes from '../../enums/ActionTypes';
import FactoryManager from '../../factories/FactoryManager';
import TriggerFactory from '../../factories/TriggerFactory';
import ActionFactory from '../../factories/ActionFactory';
import OnEnterTrigger from '../Triggers/OnEnterTrigger';
import PromptAllPlayersAction from '../Actions/PromptAllPlayersAction';

describe('GameEvent', () => {
    let factoryManager;
    let triggerFactory;
    let actionFactory;

    beforeEach(() => {
        // Set up factories
        factoryManager = new FactoryManager();

        triggerFactory = new TriggerFactory();
        triggerFactory.register(TriggerTypes.ON_ENTER, OnEnterTrigger);
        factoryManager.registerFactory('TriggerFactory', triggerFactory);

        actionFactory = new ActionFactory();
        actionFactory.register(ActionTypes.PROMPT_ALL_PLAYERS, PromptAllPlayersAction);
        factoryManager.registerFactory('ActionFactory', actionFactory);
    });

    describe('fromJSON', () => {
        test('should throw error if factoryManager is not provided', () => {
            const json = {
                trigger: { type: TriggerTypes.ON_ENTER },
                action: { type: ActionTypes.PROMPT_ALL_PLAYERS, payload: { message: 'Test' } },
                priority: 'MID'
            };

            expect(() => {
                GameEvent.fromJSON(json, null);
            }).toThrow('FactoryManager is required for GameEvent.fromJSON');

            expect(() => {
                GameEvent.fromJSON(json, undefined);
            }).toThrow('FactoryManager is required for GameEvent.fromJSON');
        });

        test('should throw error if TriggerFactory is not found', () => {
            const badFactoryManager = new FactoryManager();
            // Don't register TriggerFactory
            badFactoryManager.registerFactory('ActionFactory', actionFactory);

            const json = {
                trigger: { type: TriggerTypes.ON_ENTER },
                action: { type: ActionTypes.PROMPT_ALL_PLAYERS, payload: { message: 'Test' } },
                priority: 'MID'
            };

            expect(() => {
                GameEvent.fromJSON(json, badFactoryManager);
            }).toThrow('TriggerFactory');
        });

        test('should throw error if ActionFactory is not found', () => {
            const badFactoryManager = new FactoryManager();
            badFactoryManager.registerFactory('TriggerFactory', triggerFactory);
            // Don't register ActionFactory

            const json = {
                trigger: { type: TriggerTypes.ON_ENTER },
                action: { type: ActionTypes.PROMPT_ALL_PLAYERS, payload: { message: 'Test' } },
                priority: 'MID'
            };

            expect(() => {
                GameEvent.fromJSON(json, badFactoryManager);
            }).toThrow('ActionFactory');
        });

        test('should deserialize valid game event JSON', () => {
            const json = {
                trigger: { type: TriggerTypes.ON_ENTER },
                action: { type: ActionTypes.PROMPT_ALL_PLAYERS, payload: { message: 'Test' } },
                priority: 'MID'
            };

            const gameEvent = GameEvent.fromJSON(json, factoryManager);

            expect(gameEvent).toBeInstanceOf(GameEvent);
            expect(gameEvent.trigger).toBeInstanceOf(OnEnterTrigger);
            expect(gameEvent.action).toBeInstanceOf(PromptAllPlayersAction);
            expect(gameEvent.priority).toBe(PriorityLevels.MID);
            expect(gameEvent.state).toBe(GameEventState.READY);
        });

        test('should handle priority as string', () => {
            const json = {
                trigger: { type: TriggerTypes.ON_ENTER },
                action: { type: ActionTypes.PROMPT_ALL_PLAYERS, payload: { message: 'Test' } },
                priority: 'HIGH'
            };

            const gameEvent = GameEvent.fromJSON(json, factoryManager);
            expect(gameEvent.priority).toBe(PriorityLevels.HIGH);
        });

        test('should handle priority as object with name', () => {
            const json = {
                trigger: { type: TriggerTypes.ON_ENTER },
                action: { type: ActionTypes.PROMPT_ALL_PLAYERS, payload: { message: 'Test' } },
                priority: { name: 'CRITICAL' }
            };

            const gameEvent = GameEvent.fromJSON(json, factoryManager);
            expect(gameEvent.priority).toBe(PriorityLevels.CRITICAL);
        });

        test('should default to MID priority if not provided', () => {
            const json = {
                trigger: { type: TriggerTypes.ON_ENTER },
                action: { type: ActionTypes.PROMPT_ALL_PLAYERS, payload: { message: 'Test' } }
            };

            const gameEvent = GameEvent.fromJSON(json, factoryManager);
            expect(gameEvent.priority).toBe(PriorityLevels.MID);
        });

        test('should preserve state from JSON', () => {
            const json = {
                trigger: { type: TriggerTypes.ON_ENTER },
                action: { type: ActionTypes.PROMPT_ALL_PLAYERS, payload: { message: 'Test' } },
                priority: 'MID',
                state: GameEventState.TRIGGERED
            };

            const gameEvent = GameEvent.fromJSON(json, factoryManager);
            expect(gameEvent.state).toBe(GameEventState.TRIGGERED);
        });
    });

    describe('toJSON', () => {
        test('should serialize game event to JSON', () => {
            const trigger = new OnEnterTrigger(TriggerTypes.ON_ENTER);
            const action = new PromptAllPlayersAction(ActionTypes.PROMPT_ALL_PLAYERS, { message: 'Test' });
            const gameEvent = new GameEvent(trigger, action, PriorityLevels.HIGH);

            const json = gameEvent.toJSON();

            expect(json).toEqual({
                trigger: { type: TriggerTypes.ON_ENTER, payload: null },
                action: { type: ActionTypes.PROMPT_ALL_PLAYERS, payload: { message: 'Test' } },
                priority: PriorityLevels.HIGH,
                state: GameEventState.READY
            });
        });
    });

    describe('round-trip serialization', () => {
        test('should maintain data integrity through JSON round-trip', () => {
            const trigger = new OnEnterTrigger(TriggerTypes.ON_ENTER);
            const action = new PromptAllPlayersAction(ActionTypes.PROMPT_ALL_PLAYERS, { message: 'Test' });
            const original = new GameEvent(trigger, action, PriorityLevels.CRITICAL);

            const json = original.toJSON();
            const deserialized = GameEvent.fromJSON(json, factoryManager);

            expect(deserialized.trigger.type).toBe(original.trigger.type);
            expect(deserialized.action.type).toBe(original.action.type);
            expect(deserialized.action.payload).toEqual(original.action.payload);
            expect(deserialized.priority).toBe(original.priority);
            expect(deserialized.state).toBe(original.state);
        });
    });
});
