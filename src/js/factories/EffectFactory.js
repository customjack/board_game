import BaseFactory from './BaseFactory';
import PlayerEffect from '../models/PlayerEffects/PlayerEffect';

export default class EffectFactory extends BaseFactory {
    constructor() {
        super();
    }

    // Override to enforce PlayerEffect validation
    register(typeName, classRef) {
        if (!(classRef.prototype instanceof PlayerEffect)) {
            throw new Error(
                `Cannot register "${typeName}". It must be a subclass of PlayerEffect.`
            );
        }
        super.register(typeName, classRef); // Call the base method for registration
    }

    // Custom method for creating effects from JSON
    createEffectFromJSON(json) {
        const { type, args } = json;
        // Convert the array of objects into an array of values, preserving the order
        const resolvedArgs = args.map(argObj => Object.values(argObj)[0]);

        return this.create(type, ...resolvedArgs); // Spread the arguments in the correct order
    }

    /**
     * Get metadata for all registered effects
     * @returns {Object} Map of effect types to their metadata
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
     * Get metadata for a specific effect type
     * @param {string} typeName - The effect type identifier
     * @returns {Object|null} The effect's metadata or null if not found
     */
    getMetadata(typeName) {
        const classRef = this.registry.get(typeName);
        if (classRef && typeof classRef.getMetadata === 'function') {
            return classRef.getMetadata();
        }
        return null;
    }
}
