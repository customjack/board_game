import { processStringToEnum } from '../utils/helpers';

/**
 * Trigger - Legacy wrapper for backward compatibility
 *
 * This class has been refactored to use the plugin-based TriggerFactory system.
 * The actual trigger logic is now handled by individual trigger classes:
 * - OnEnterTrigger
 * - OnLandTrigger
 * - OnExitTrigger
 * - CodeTrigger
 *
 * @deprecated Use TriggerFactory.createFromJSON() directly for new code
 */
export default class Trigger {
    constructor(type, payload = null) {
        this.type = type;
        this.payload = payload;
        this._delegateTrigger = null; // Will hold the actual trigger instance
    }

    /**
     * Check if this trigger is met based on the game state and associated space
     * Delegates to the appropriate trigger class via TriggerFactory
     *
     * @param {Object} context - Trigger evaluation context
     * @param {GameState} context.gameState - Current game state
     * @param {Space} context.space - Space being evaluated
     * @param {EventBus} context.eventBus - Event bus for notifications
     * @param {string} context.peerId - Network peer ID
     * @returns {boolean} True if trigger condition is met
     */
    isTriggered(context) {
        // Get TriggerFactory from gameState (it should have access via factoryManager)
        const factoryManager = context.gameState?.factoryManager;

        if (!factoryManager) {
            console.error('FactoryManager not found in gameState');
            return false;
        }

        const triggerFactory = factoryManager.getFactory('TriggerFactory');

        if (!triggerFactory) {
            console.error('TriggerFactory not found in FactoryManager');
            return false;
        }

        try {
            // Create or reuse delegate trigger instance
            if (!this._delegateTrigger) {
                this._delegateTrigger = triggerFactory.createFromJSON({
                    type: this.type,
                    payload: this.payload
                });
            }

            if (this._delegateTrigger) {
                return this._delegateTrigger.isTriggered(context);
            } else {
                console.warn(`Trigger type "${this.type}" not recognized`);
                return false;
            }
        } catch (error) {
            console.error(`Failed to evaluate trigger "${this.type}":`, error);
            return false;
        }
    }

    /**
     * Serialize trigger to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            type: this.type,
            payload: this.payload !== undefined ? this.payload : null
        };
    }

    /**
     * Deserialize trigger from JSON
     * @static
     * @param {Object} json - JSON representation
     * @returns {Trigger} Trigger instance
     */
    static fromJSON(json) {
        const processedType = processStringToEnum(json.type);
        const payload = json.payload !== undefined ? json.payload : null;
        return new Trigger(processedType, payload);
    }
}
