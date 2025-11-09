import { processStringToEnum } from '../utils/helpers.js';

/**
 * Action - Legacy wrapper for backward compatibility
 *
 * This class now serves as a lightweight wrapper that delegates to the ActionFactory.
 * All action logic has been extracted into individual action classes.
 *
 * @deprecated Use ActionFactory.createFromJSON() directly for new code
 */
export default class Action {
    constructor(type, payload) {
        this.type = type;
        this.payload = payload || null;
    }

    /**
     * Execute the action using the ActionFactory
     * @param {Object} gameEngine - The game engine instance
     * @param {Function} postExecutionCallback - Callback after execution
     */
    execute(gameEngine, postExecutionCallback) {
        // Get the ActionFactory from the game engine
        const actionFactory = gameEngine.factoryManager.getFactory('ActionFactory');

        if (!actionFactory) {
            console.error('ActionFactory not found in FactoryManager');
            if (postExecutionCallback) postExecutionCallback();
            return;
        }

        try {
            // Create action instance from factory
            const actionInstance = actionFactory.createFromJSON({
                type: this.type,
                payload: this.payload
            });

            if (actionInstance) {
                // Execute the action
                actionInstance.execute(gameEngine, postExecutionCallback);
            } else {
                console.warn(`Action type "${this.type}" not recognized by ActionFactory.`);
                if (postExecutionCallback) postExecutionCallback();
            }
        } catch (error) {
            console.error(`Failed to execute action "${this.type}":`, error);
            if (postExecutionCallback) postExecutionCallback();
        }
    }

    /**
     * Serialize action to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            type: this.type,
            payload: this.payload,
        };
    }

    /**
     * Deserialize from JSON
     * @static
     * @param {Object} json - JSON object with type and payload
     * @returns {Action} Action instance
     */
    static fromJSON(json) {
        return new Action(processStringToEnum(json.type), json.payload || null);
    }
}
