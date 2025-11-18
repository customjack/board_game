/**
 * BaseStat - Base class for all player stats
 *
 * Stats represent player attributes that can be tracked and modified during the game.
 * Similar to effects and actions, stats are pluggable and can have custom logic.
 *
 * Stats support two values:
 * - trueValue: The actual value (e.g., real score)
 * - displayValue: The value shown to other players (for private/hidden stats)
 */
export default class BaseStat {
    /**
     * @param {string} id - Unique identifier for this stat instance
     * @param {*} initialValue - Initial value for the stat (sets both true and display)
     * @param {Object} metadata - Additional metadata for the stat
     */
    constructor(id, initialValue = 0, metadata = {}) {
        this.id = id;
        this.trueValue = initialValue;
        this.displayValue = initialValue;
        this.metadata = metadata;
    }

    /**
     * Get the true value of the stat
     * @returns {*} True stat value
     */
    getTrueValue() {
        return this.trueValue;
    }

    /**
     * Get the display value of the stat
     * @returns {*} Display stat value
     */
    getDisplayValue() {
        return this.displayValue;
    }

    /**
     * Get value (defaults to true value for backwards compatibility)
     * @returns {*} True stat value
     */
    getValue() {
        return this.trueValue;
    }

    /**
     * Set the stat value directly
     * @param {*} newValue - New value to set
     * @param {Player} player - The player this stat belongs to
     * @param {string} mode - 'both' (default), 'true', or 'display'
     */
    setValue(newValue, player, mode = 'both') {
        const oldTrueValue = this.trueValue;
        const oldDisplayValue = this.displayValue;

        if (mode === 'both' || mode === 'true') {
            this.trueValue = newValue;
        }
        if (mode === 'both' || mode === 'display') {
            this.displayValue = newValue;
        }

        this.onSet(newValue, player, mode);

        // Trigger onChange if true value changed
        if (mode !== 'display' && oldTrueValue !== this.trueValue) {
            this.onChange(oldTrueValue, this.trueValue, player);
        }
    }

    /**
     * Change the stat value by a delta amount
     * @param {number} delta - Amount to change the stat by
     * @param {Player} player - The player this stat belongs to
     * @param {string} mode - 'both' (default), 'true', or 'display'
     */
    changeValue(delta, player, mode = 'both') {
        const oldTrueValue = this.trueValue;
        const oldDisplayValue = this.displayValue;

        if (mode === 'both' || mode === 'true') {
            this.trueValue += delta;
        }
        if (mode === 'both' || mode === 'display') {
            this.displayValue += delta;
        }

        // Trigger onChange if true value changed
        if (mode !== 'display' && oldTrueValue !== this.trueValue) {
            this.onChange(oldTrueValue, this.trueValue, player);
        }
    }

    /**
     * Callback triggered when the stat value changes
     * Override in subclasses for custom logic
     * @param {*} oldValue - Previous value
     * @param {*} newValue - New value
     * @param {Player} player - The player this stat belongs to
     */
    onChange(oldValue, newValue, player) {
        // Default implementation does nothing
        // Subclasses can override for custom behavior
    }

    /**
     * Callback triggered when the stat value is set directly
     * Override in subclasses for custom logic
     * @param {*} newValue - New value
     * @param {Player} player - The player this stat belongs to
     * @param {string} mode - Which value(s) were set ('both', 'true', or 'display')
     */
    onSet(newValue, player, mode) {
        // Default implementation does nothing
        // Subclasses can override for custom behavior
    }

    /**
     * Serialize the stat to JSON for storage/network transmission
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            type: this.constructor.name,
            id: this.id,
            trueValue: this.trueValue,
            displayValue: this.displayValue,
            metadata: this.metadata
        };
    }

    /**
     * Create a stat instance from JSON data
     * @param {Object} json - JSON representation
     * @param {StatFactory} statFactory - Factory to create the stat instance
     * @returns {BaseStat} Stat instance
     */
    static fromJSON(json, statFactory) {
        if (!json || !json.type) {
            console.error('Invalid stat JSON:', json);
            return null;
        }

        return statFactory.createStatFromJSON(json);
    }

    /**
     * Get metadata about this stat type
     * Override in subclasses to provide stat-specific metadata
     * @static
     * @returns {Object} Metadata including displayName, description, and default value
     */
    static getMetadata() {
        return {
            type: 'BaseStat',
            displayName: 'Base Stat',
            description: 'Base class for all stats',
            category: 'general',
            defaultValue: 0,
            valueType: 'number'
        };
    }
}
