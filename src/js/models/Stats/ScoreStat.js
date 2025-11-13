import BaseStat from './BaseStat.js';

/**
 * ScoreStat - A simple score tracking stat provided by the core plugin
 *
 * This is the default stat that tracks a player's score.
 * It simply adds or sets numeric values without complex logic.
 */
export default class ScoreStat extends BaseStat {
    /**
     * @param {string} id - Unique identifier for this stat instance (e.g., "score")
     * @param {number} initialValue - Initial score value (default: 0)
     * @param {Object} metadata - Additional metadata
     */
    constructor(id, initialValue = 0, metadata = {}) {
        super(id, initialValue, metadata);
    }

    /**
     * Callback when score changes
     * For now, this is a simple implementation
     * Future enhancements could include achievements like "reached 1000 points"
     * @param {number} oldValue - Previous score
     * @param {number} newValue - New score
     * @param {Player} player - The player this stat belongs to
     */
    onChange(oldValue, newValue, player) {
        console.log(`[ScoreStat] ${player.nickname}'s score changed: ${oldValue} -> ${newValue}`);

        // Future enhancement example:
        // if (newValue >= 1000 && oldValue < 1000) {
        //     console.log(`${player.nickname} reached 1000 points! Award power-up!`);
        //     // Apply a bonus effect or achievement
        // }
    }

    /**
     * Callback when score is set directly
     * @param {number} newValue - New score value
     * @param {Player} player - The player this stat belongs to
     */
    onSet(newValue, player) {
        console.log(`[ScoreStat] ${player.nickname}'s score set to: ${newValue}`);
    }

    /**
     * Get metadata about the ScoreStat type
     * @static
     * @returns {Object} Metadata for plugin registration
     */
    static getMetadata() {
        return {
            type: 'ScoreStat',
            displayName: 'Score',
            description: 'Tracks player score points',
            category: 'core',
            defaultValue: 0,
            valueType: 'number'
        };
    }
}
