import Trigger from './Trigger.js';
import Action from './Action.js';
import { PriorityLevels } from '../enums/PriorityLevels.js';
import { processStringToEnum } from '../utils/helpers.js';
import TurnPhases from '../enums/TurnPhases';
import GameEventState from '../enums/GameEventState.js'; // Import the new enum

export default class GameEvent {
    constructor(trigger, action, priority = PriorityLevels.MID) {
        this.trigger = trigger; // Instance of Trigger
        this.action = action;   // Instance of Action
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

    // Deserialization from JSON format
    static fromJSON(json) {
        // Handle priority: could be string ("MID"), object with name ({name: "MID"}), or undefined
        let priorityName = '';
        if (json.priority) {
            if (typeof json.priority === 'string') {
                priorityName = processStringToEnum(json.priority);
            } else if (json.priority.name) {
                priorityName = processStringToEnum(json.priority.name);
            }
        }
        const processedPriority = PriorityLevels[priorityName] || PriorityLevels.MID; // Default to MID if not found

        const gameEvent = new GameEvent(
            Trigger.fromJSON(json.trigger),
            Action.fromJSON(json.action),
            processedPriority
        );

        // Set the state from JSON, defaulting to READY if not provided
        gameEvent.setState(json.state || GameEventState.READY);
        
        return gameEvent;
    }
}
