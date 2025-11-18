import BaseAction from './BaseAction.js';
import ActionTypes from '../../enums/ActionTypes.js';

/**
 * CustomAction - Placeholder for custom plugin-defined actions
 *
 * This action type allows plugins to define their own custom logic.
 * The actual implementation is provided by the plugin system.
 */
export default class CustomAction extends BaseAction {
    constructor(type, payload) {
        super(type, payload);
    }

    /**
     * Execute the custom action
     * @param {Object} gameEngine - The game engine instance
     * @param {Function} postExecutionCallback - Callback after execution
     */
    execute(gameEngine, postExecutionCallback) {
        const { eventBus } = gameEngine;

        this.emitEvent(eventBus, 'beforeActionExecution', gameEngine);

        console.log('Executing custom action...');
        // Custom logic would be provided by plugins overriding this class

        postExecutionCallback();

        this.emitEvent(eventBus, 'afterActionExecution', gameEngine);
    }

    /**
     * Validate the action's payload
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        // Custom actions can have any payload structure
        return {
            valid: true,
            errors: []
        };
    }

    /**
     * Get metadata about this action type
     * @static
     * @returns {Object} Metadata including displayName, description, and payload schema
     */
    static getMetadata() {
        return {
            type: ActionTypes.CUSTOM,
            displayName: 'Custom Action',
            description: 'Custom action defined by a plugin. Override this class to implement custom behavior.',
            category: 'custom',
            payloadSchema: {
                // Schema is defined by the plugin that overrides this action
            }
        };
    }
}
