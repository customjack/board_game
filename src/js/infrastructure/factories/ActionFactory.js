import BaseFactory from './BaseFactory.js';
import BaseAction from '../models/Actions/BaseAction.js';

/**
 * ActionFactory - Factory for creating and managing action instances
 *
 * Follows the same pattern as EffectFactory. Actions can be registered
 * via plugins and instantiated from JSON or direct calls.
 */
export default class ActionFactory extends BaseFactory {
    constructor() {
        super();
    }

    /**
     * Override to enforce BaseAction validation
     * @param {string} typeName - The action type identifier
     * @param {Class} classRef - The action class reference
     * @throws {Error} If classRef is not a subclass of BaseAction
     */
    register(typeName, classRef) {
        if (!(classRef.prototype instanceof BaseAction)) {
            throw new Error(
                `Cannot register "${typeName}". It must be a subclass of BaseAction.`
            );
        }
        super.register(typeName, classRef);
    }

    /**
     * Create an action from JSON data
     * @param {Object} json - JSON object with type and payload
     * @returns {BaseAction} The created action instance
     */
    createFromJSON(json) {
        const { type, payload } = json;
        return this.create(type, type, payload);
    }

    /**
     * Get metadata for all registered actions
     * @returns {Object} Map of action types to their metadata
     */
    getAllMetadata() {
        const metadata = {};
        for (const [typeName, classRef] of this.registry.entries()) {
            if (typeof classRef.getMetadata === 'function') {
                metadata[typeName] = classRef.getMetadata();
            }
        }
        return metadata;
    }

    /**
     * Get metadata for a specific action type
     * @param {string} typeName - The action type identifier
     * @returns {Object|null} The action's metadata or null if not found
     */
    getMetadata(typeName) {
        const classRef = this.registry.get(typeName);
        if (classRef && typeof classRef.getMetadata === 'function') {
            return classRef.getMetadata();
        }
        return null;
    }
}
