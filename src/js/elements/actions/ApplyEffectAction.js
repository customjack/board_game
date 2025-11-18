import BaseAction from './BaseAction.js';
import ActionTypes from '../../infrastructure/utils/ActionTypes.js';

/**
 * ApplyEffectAction - Applies an effect to the current player
 *
 * Creates and applies an effect instance using the EffectFactory.
 */
export default class ApplyEffectAction extends BaseAction {
    constructor(type, payload) {
        super(type, payload);
    }

    /**
     * Execute the apply effect action
     * @param {Object} gameEngine - The game engine instance
     * @param {Function} postExecutionCallback - Callback after execution
     */
    execute(gameEngine, postExecutionCallback) {
        const { eventBus } = gameEngine;

        this.emitEvent(eventBus, 'beforeActionExecution', gameEngine);

        const { effect } = this.payload || {};

        if (!effect) {
            console.warn('Missing required parameter: payload.effect');
            postExecutionCallback();
            return;
        }

        try {
            // Apply the effect to the game or player
            const effectInstance = gameEngine.factoryManager.getFactory("EffectFactory").createEffectFromJSON(effect);

            if (effectInstance) {
                console.log("Effect to apply:", effectInstance);
                effectInstance.apply(gameEngine); // Enact the effect on the game engine
            } else {
                console.warn(`Effect "${effect.name}" not recognized.`);
            }
        } catch (error) {
            console.error(`Failed to apply effect: ${error.message}`);
        }

        postExecutionCallback();

        this.emitEvent(eventBus, 'afterActionExecution', gameEngine);
    }

    /**
     * Validate the action's payload
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        const errors = [];

        if (!this.payload) {
            errors.push('Payload is required');
        } else {
            if (!this.payload.effect || typeof this.payload.effect !== 'object') {
                errors.push('payload.effect must be an object');
            } else {
                if (!this.payload.effect.type) {
                    errors.push('payload.effect.type is required');
                }
                if (!this.payload.effect.args) {
                    errors.push('payload.effect.args is required');
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get metadata about this action type
     * @static
     * @returns {Object} Metadata including displayName, description, and payload schema
     */
    static getMetadata() {
        return {
            type: ActionTypes.APPLY_EFFECT,
            displayName: 'Apply Effect',
            description: 'Apply an effect to the current player or game state',
            category: 'effects',
            payloadSchema: {
                effect: {
                    type: 'object',
                    required: true,
                    description: 'Effect object with type and args',
                    properties: {
                        type: {
                            type: 'string',
                            description: 'Effect class name',
                            example: 'SkipTurnEffect'
                        },
                        args: {
                            type: 'array',
                            description: 'Array of argument objects for the effect constructor',
                            example: [{ id: 'skip_1' }, { duration: 1 }, { toRemove: false }]
                        }
                    }
                }
            }
        };
    }
}
