import BaseFactory from '../../core/base/BaseFactory.js';
import BaseStat from '../../elements/stats/BaseStat.js';

/**
 * StatFactory - Factory for creating and managing player stat instances
 *
 * Similar to EffectFactory, this factory:
 * - Registers stat types from plugins
 * - Creates stat instances from type names
 * - Deserializes stats from JSON
 * - Provides metadata about available stat types
 */
export default class StatFactory extends BaseFactory {
    constructor() {
        super();
    }

    /**
     * Register a stat type
     * Enforces that registered classes extend BaseStat
     * @param {string} typeName - Unique identifier for the stat type
     * @param {Class} classRef - Class reference that extends BaseStat
     */
    register(typeName, classRef) {
        if (!(classRef.prototype instanceof BaseStat)) {
            throw new Error(
                `Cannot register "${typeName}". It must be a subclass of BaseStat.`
            );
        }
        super.register(typeName, classRef);
    }

    /**
     * Create a stat instance from JSON data
     * @param {Object} json - JSON representation with type, id, trueValue, displayValue, metadata
     * @returns {BaseStat|null} Created stat instance or null if invalid
     */
    createStatFromJSON(json) {
        if (!json || !json.type) {
            console.error('Invalid stat JSON: missing type', json);
            return null;
        }

        const { type, id, trueValue, displayValue, value, metadata } = json;

        try {
            // Support both old format (value) and new format (trueValue/displayValue)
            const initialValue = trueValue !== undefined ? trueValue : value !== undefined ? value : 0;

            // Create stat instance with id, initialValue, and metadata
            const stat = this.create(type, id, initialValue, metadata);

            // If displayValue is explicitly provided and different, set it
            if (displayValue !== undefined && displayValue !== initialValue) {
                stat.displayValue = displayValue;
            }

            return stat;
        } catch (error) {
            console.error(`Failed to create stat from JSON:`, error, json);
            return null;
        }
    }

    /**
     * Get metadata for all registered stat types
     * @returns {Object} Map of stat type names to their metadata
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
     * Get metadata for a specific stat type
     * @param {string} typeName - The stat type identifier
     * @returns {Object|null} The stat's metadata or null if not found
     */
    getMetadata(typeName) {
        const classRef = this.registry.get(typeName);
        if (classRef && typeof classRef.getMetadata === 'function') {
            return classRef.getMetadata();
        }
        return null;
    }
}
