/**
 * BaseTrigger - Abstract base class for all trigger types
 *
 * Triggers determine when game events should be activated based on game state conditions.
 * This class defines the contract that all trigger types must implement.
 *
 * Subclasses must implement:
 * - isTriggered(context) - Evaluates whether the trigger condition is met
 * - static getMetadata() - Returns metadata schema for board creator tool
 * - validate() - Validates trigger configuration
 */
export default class BaseTrigger {
    /**
     * Create a new trigger
     * @param {*} payload - Optional payload data for the trigger
     * @param {string} [explicitType] - Optional override for trigger type
     */
    constructor(payload = null, explicitType = null) {
        if (this.constructor === BaseTrigger) {
            throw new Error("BaseTrigger is an abstract class and cannot be instantiated directly");
        }
        let resolvedPayload = payload;
        let resolvedType = explicitType;

        // Backward compatibility: allow constructor(type, payload)
        if (typeof payload === 'string' && (explicitType === null || typeof explicitType === 'object')) {
            resolvedType = payload;
            resolvedPayload = explicitType;
        }

        const ctorType = this.constructor.type || this.constructor.triggerType || null;
        this.type = resolvedType || ctorType;
        if (!this.type) {
            throw new Error(`${this.constructor.name} must define a static "type" identifier`);
        }
        this.payload = resolvedPayload;
    }

    /**
     * Check if this trigger's condition is met
     * @abstract
     * @param {Object} context - Trigger evaluation context
     * @param {GameState} context.gameState - Current game state
     * @param {Space} context.space - Space being evaluated
     * @param {EventBus} context.eventBus - Event bus for notifications
     * @param {string} context.peerId - Network peer identifier
     * @returns {boolean} True if trigger condition is met
     */
    isTriggered(context) {
        throw new Error(`isTriggered() method must be implemented by ${this.constructor.name}`);
    }

    /**
     * Validate the trigger's configuration
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        const errors = [];

        if (!this.type || typeof this.type !== 'string') {
            errors.push('type must be a non-empty string');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get metadata about this trigger type
     * @static
     * @returns {Object} Metadata including displayName, description, and payload schema
     */
    static getMetadata() {
        return {
            type: this.name,
            displayName: this.name,
            description: 'No description provided',
            category: 'general',
            payloadSchema: {}
        };
    }

    /**
     * Serialize trigger to JSON format
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            type: this.type,
            payload: this.payload !== undefined ? this.payload : null
        };
    }

    /**
     * Emit an event to the event bus
     * @param {EventBus} eventBus - Event bus instance
     * @param {string} eventType - Type of event to emit
     * @param {Object} data - Event data
     */
    emitEvent(eventBus, eventType, data) {
        if (eventBus) {
            eventBus.emit(eventType, {
                trigger: this,
                ...data
            });
        }
    }
}
