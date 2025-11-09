/**
 * BaseAction - Abstract base class for all action types
 *
 * Actions are executable game events that can be triggered by board spaces,
 * plugins, or game mechanics. Each action type implements its own execution logic.
 *
 * @abstract
 */
export default class BaseAction {
    /**
     * @param {string} type - The action type identifier (e.g., 'PROMPT_ALL_PLAYERS')
     * @param {Object} payload - Action-specific data
     */
    constructor(type, payload = null) {
        if (this.constructor === BaseAction) {
            throw new Error("BaseAction is an abstract class and cannot be instantiated directly");
        }

        this.type = type;
        this.payload = payload;
    }

    /**
     * Execute the action
     * @abstract
     * @param {Object} gameEngine - The game engine instance
     * @param {Function} postExecutionCallback - Optional callback after execution
     * @throws {Error} If not implemented by subclass
     */
    execute(gameEngine, postExecutionCallback) {
        throw new Error(`execute() method must be implemented by ${this.constructor.name}`);
    }

    /**
     * Validate the action's payload
     * @abstract
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        throw new Error(`validate() method must be implemented by ${this.constructor.name}`);
    }

    /**
     * Get metadata about this action type
     * @static
     * @returns {Object} Metadata including displayName, description, and payload schema
     */
    static getMetadata() {
        return {
            type: this.name,
            displayName: this.name,
            description: 'No description provided',
            payloadSchema: {},
            category: 'general'
        };
    }

    /**
     * Serialize action to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            type: this.type,
            payload: this.payload
        };
    }

    /**
     * Utility to emit events before/after execution
     * @protected
     * @param {EventBus} eventBus - The event bus instance
     * @param {string} eventType - The event type to emit
     * @param {Object} gameEngine - The game engine instance
     */
    emitEvent(eventBus, eventType, gameEngine) {
        if (eventBus) {
            eventBus.emit(eventType, {
                action: this,
                gameState: gameEngine.gameState,
                space: gameEngine.gameEventWithSpace?.space,
                peerId: gameEngine.peerId,
            });
        }
    }
}
