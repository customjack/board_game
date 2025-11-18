import { PriorityLevels } from '../infrastructure/utils/PriorityLevels.js';
import { processStringToEnum } from '../infrastructure/utils/helpers.js';
import TurnPhases from '../game/phases/TurnPhases';
import GameEventState from '../game/phases/GameEventState.js';

/**
 * GameEvent - Combines a trigger condition with an action to execute
 *
 * A GameEvent consists of:
 * - Trigger: Condition that determines when the event should fire
 * - Action: What happens when the trigger condition is met
 * - Priority: Determines execution order when multiple events trigger
 * - State: Tracks the lifecycle of the event
 */
export default class GameEvent {
    constructor(trigger, action, priority = PriorityLevels.MID) {
        this.trigger = trigger; // Instance of BaseTrigger (from TriggerFactory)
        this.action = action;   // Instance of BaseAction (from ActionFactory)
        this.priority = priority; // Priority level, defaulting to MID if not specified
        this.state = GameEventState.READY; // Initialize state to READY
        //Flow: READY -> CHECKING_TRIGGER (can bypass) -> TRIGGERED -> PROCESSING_ACTION -> COMPLETED_ACTION
        //Can be deactived with -->INACTIVE
    }

    // Checks if the trigger conditions are met
    // Triggered states will not "untriggered" until resolved,
    // even if the conditions which triggered them are no longer true
    // (ex. triggered based on score > 5, score reduced before event occurs, event will STILL occur)
    checkTrigger(context) {
        if (this.state === GameEventState.TRIGGERED) {
            return true; //The event has already been triggered
        }
        // Prevent re-triggering completed or processing events
        if (this.state !== GameEventState.READY) {
            return false; // Not ready, so it cannot be tested for trigger
        }
        this.state = GameEventState.CHECKING_TRIGGER; // Update state
        const isTriggered = this.trigger.isTriggered(context);
        this.state = isTriggered ? GameEventState.TRIGGERED : GameEventState.READY; // Update state based on trigger
        return isTriggered;
    }

    // Executes the action if the trigger is met, with an option to force execution
    executeAction(gameEngine, force = false) {
        if (force) {
            this.state = GameEventState.TRIGGERED; //Trigger the event
        } else {
            this.checkTrigger(); //Check if the event is triggered, if it is the state will be updated
        }
        if (this.state === GameEventState.TRIGGERED) {
            this.state = GameEventState.PROCESSING_ACTION; // Update state before execution

            const completeActionCallback = () => {
                this.state = GameEventState.COMPLETED_ACTION; // Update state after execution
                gameEngine.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
            };
            this.action.execute(gameEngine, completeActionCallback);        }
    }

    // Set the state of the GameEvent with validation
    setState(newState) {
        if (!Object.values(GameEventState).includes(newState)) {
            throw new Error(`Invalid state: ${newState}`);
        }
        this.state = newState;
    }

    // Get the current state of the GameEvent
    getState() {
        return this.state;
    }

    // Serialization to JSON format
    toJSON() {
        return {
            trigger: this.trigger.toJSON(),
            action: this.action.toJSON(),
            priority: this.priority,
            state: this.state // Include state in JSON serialization
        };
    }

    /**
     * Deserialize from JSON format
     * @param {Object} json - JSON representation
     * @param {FactoryManager} factoryManager - Factory manager for creating triggers and actions
     * @returns {GameEvent} GameEvent instance
     */
    static fromJSON(json, factoryManager) {
        if (!factoryManager) {
            throw new Error('FactoryManager is required for GameEvent.fromJSON');
        }

        // Get factories
        const triggerFactory = factoryManager.getFactory('TriggerFactory');
        const actionFactory = factoryManager.getFactory('ActionFactory');

        if (!triggerFactory) {
            throw new Error('TriggerFactory not found in FactoryManager');
        }
        if (!actionFactory) {
            throw new Error('ActionFactory not found in FactoryManager');
        }

        // Handle priority: could be string ("MID"), object with name ({name: "MID"}), or undefined
        let priorityName = '';
        if (json.priority) {
            if (typeof json.priority === 'string') {
                priorityName = processStringToEnum(json.priority);
            } else if (json.priority.name) {
                priorityName = processStringToEnum(json.priority.name);
            }
        }
        const processedPriority = PriorityLevels[priorityName] || PriorityLevels.MID;

        // Create trigger and action using factories
        const trigger = triggerFactory.createFromJSON(json.trigger);
        const action = actionFactory.createFromJSON(json.action);

        const gameEvent = new GameEvent(trigger, action, processedPriority);

        // Set the state from JSON, defaulting to READY if not provided
        gameEvent.setState(json.state || GameEventState.READY);

        return gameEvent;
    }
}
