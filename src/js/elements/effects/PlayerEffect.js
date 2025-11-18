export default class PlayerEffect {
    constructor(id, duration, toRemove = false) {
        this.id = id;
        this.duration = duration;
        this.toRemove = toRemove;
    }

    markForRemoval() {
        this.toRemove = true;
    }

    // Abstract 'apply' method - to be implemented by subclasses
    apply(gameEngine) {
        throw new Error("apply method must be implemented by subclasses");
    }

    // 'Enact' method that does the effect's main work
    enact(gameEngine) {
        throw new Error("enact method must be implemented by subclasses");
    }

    toJSON() {
        return {
            type: this.constructor.name, // To identify the effect type during deserialization
            args: [
                {id: this.id},
                {duration: this.duration},
                {toRemove: this.toRemove}
            ]
        };
    }

    /**
     * Get metadata about this effect type
     * @static
     * @returns {Object} Metadata including displayName, description, and payload schema
     */
    static getMetadata() {
        return {
            type: this.name,
            displayName: this.name,
            description: 'No description provided',
            category: 'general',
            payloadSchema: {
                id: {
                    type: 'string',
                    required: true,
                    description: 'Unique identifier for this effect instance',
                    example: 'effect_1'
                },
                duration: {
                    type: 'number',
                    required: true,
                    description: 'Number of turns this effect lasts',
                    example: 2,
                    min: 0
                },
                toRemove: {
                    type: 'boolean',
                    required: false,
                    description: 'Whether this effect is marked for removal',
                    example: false,
                    default: false
                }
            }
        };
    }

    /**
     * Validate the effect's configuration
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        const errors = [];

        if (!this.id || typeof this.id !== 'string') {
            errors.push('id must be a non-empty string');
        }

        if (typeof this.duration !== 'number' || this.duration < 0) {
            errors.push('duration must be a non-negative number');
        }

        if (typeof this.toRemove !== 'boolean') {
            errors.push('toRemove must be a boolean');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
