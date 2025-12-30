import BaseFactory from '../../core/base/BaseFactory.js';
import BaseTrigger from '../../elements/triggers/BaseTrigger.js';

/**
 * TriggerFactory - Factory for creating and managing trigger instances
 *
 * This factory follows the same pattern as ActionFactory and EffectFactory,
 * enabling plugin-based registration of custom trigger types.
 *
 * Usage:
 *   const trigger = triggerFactory.createFromJSON({ type: 'ON_ENTER', payload: null });
 *   const metadata = triggerFactory.getAllMetadata();
 */
export default class TriggerFactory extends BaseFactory {
    constructor() {
        super();
    }

    /**
     * Register a trigger class (must extend BaseTrigger)
     * @param {string} typeName - The trigger type identifier
     * @param {Class} classRef - The trigger class (must extend BaseTrigger)
     */
    register(typeName, classRef) {
        let resolvedType = typeName;
        let resolvedClass = classRef;

        if (typeof typeName === 'function' && !classRef) {
            resolvedClass = typeName;
            resolvedType = resolvedClass?.type || resolvedClass?.triggerType;
        }

        if (!(resolvedClass?.prototype instanceof BaseTrigger)) {
            throw new Error(
                `Cannot register "${resolvedType}". It must be a subclass of BaseTrigger.`
            );
        }
        if (!resolvedType || typeof resolvedType !== 'string') {
            throw new Error(`Cannot register trigger without a valid type identifier`);
        }
        super.register(resolvedType, resolvedClass);
    }

    /**
     * Create a trigger instance from JSON
     * @param {Object} json - JSON representation {type, payload}
     * @returns {BaseTrigger} Trigger instance
     */
    createFromJSON(json) {
        const { type, payload } = json;
        return this.create(type, payload);
    }

    /**
     * Get metadata for all registered triggers
     * @returns {Object} Map of trigger types to their metadata
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
     * Get metadata for a specific trigger type
     * @param {string} typeName - The trigger type identifier
     * @returns {Object|null} The trigger's metadata or null if not found
     */
    getMetadata(typeName) {
        const classRef = this.registry.get(typeName);
        if (classRef && typeof classRef.getMetadata === 'function') {
            return classRef.getMetadata();
        }
        return null;
    }
}
