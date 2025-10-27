/**
 * StateDelta - Utility for calculating and applying state differences
 *
 * This class provides efficient delta-based state synchronization:
 * - Calculates minimal differences between game states
 * - Applies deltas to reconstruct full state
 * - Supports versioning for conflict detection
 */
export default class StateDelta {
    /**
     * Calculate the delta between two JSON-serializable objects
     * @param {Object} oldState - The previous state
     * @param {Object} newState - The new state
     * @param {Array<string>} [ignorePaths=[]] - Paths to ignore (e.g., ['triggeredEvents'])
     * @returns {Object} Delta object with only changed fields
     */
    static calculateDelta(oldState, newState, ignorePaths = ['triggeredEvents']) {
        const delta = {};

        // Always include version info if present
        if (newState._version !== undefined) {
            delta._version = newState._version;
        }
        if (newState._timestamp !== undefined) {
            delta._timestamp = newState._timestamp;
        }

        // Calculate differences
        for (const key in newState) {
            if (ignorePaths.includes(key)) continue;

            const oldValue = oldState?.[key];
            const newValue = newState[key];

            if (this.isDifferent(oldValue, newValue)) {
                delta[key] = newValue;
            }
        }

        return delta;
    }

    /**
     * Deep comparison to check if two values are different
     * @param {*} a - First value
     * @param {*} b - Second value
     * @returns {boolean} True if values are different
     */
    static isDifferent(a, b) {
        // Handle null/undefined
        if (a === b) return false;
        if (a == null || b == null) return true;

        // Handle primitives
        if (typeof a !== 'object' || typeof b !== 'object') {
            return a !== b;
        }

        // Handle arrays
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return true;

            // For arrays, we do a simple comparison
            // For complex objects like players, any change means different
            return JSON.stringify(a) !== JSON.stringify(b);
        }

        // Handle objects
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) return true;

        for (const key of keysA) {
            if (!keysB.includes(key)) return true;
            if (this.isDifferent(a[key], b[key])) return true;
        }

        return false;
    }

    /**
     * Apply a delta to a base state
     * @param {Object} baseState - The base state to apply delta to
     * @param {Object} delta - The delta to apply
     * @returns {Object} New state with delta applied
     */
    static applyDelta(baseState, delta) {
        // Create a shallow copy to avoid mutating the original
        const newState = { ...baseState };

        // Apply all changes from delta
        for (const key in delta) {
            newState[key] = delta[key];
        }

        return newState;
    }

    /**
     * Estimate the size savings of using delta vs full state
     * @param {Object} fullState - The full state
     * @param {Object} delta - The delta
     * @returns {Object} Stats about size savings
     */
    static getSizeStats(fullState, delta) {
        const fullSize = JSON.stringify(fullState).length;
        const deltaSize = JSON.stringify(delta).length;
        const savingsPercent = ((1 - deltaSize / fullSize) * 100).toFixed(1);

        return {
            fullSize,
            deltaSize,
            savingsPercent,
            worthIt: deltaSize < fullSize * 0.5 // Only use delta if it's < 50% of full size
        };
    }

    /**
     * Create a versioned state wrapper
     * @param {Object} state - The state to version
     * @param {number} [version] - Optional version number (auto-increments if not provided)
     * @returns {Object} State with version metadata
     */
    static createVersionedState(state, version = null) {
        return {
            ...state,
            _version: version !== null ? version : (state._version || 0) + 1,
            _timestamp: Date.now()
        };
    }

    /**
     * Check if a delta can be safely applied to a base state
     * @param {Object} baseState - The base state
     * @param {Object} delta - The delta to check
     * @returns {boolean} True if delta can be applied
     */
    static canApplyDelta(baseState, delta) {
        // If delta has version info, check version compatibility
        if (delta._version !== undefined && baseState._version !== undefined) {
            // Delta should be ahead of current state (allows catching up after missed updates)
            // But not too far ahead (more than 10 versions suggests desync)
            const versionDiff = delta._version - baseState._version;

            if (versionDiff === 1) {
                // Perfect - exactly one version ahead
                return true;
            } else if (versionDiff > 1 && versionDiff <= 10) {
                // Client is behind but not too far - allow catch-up
                console.log(`Delta version skip detected (${versionDiff} versions ahead), applying anyway`);
                return true;
            } else if (versionDiff <= 0) {
                // Old or duplicate delta - skip it
                console.log(`Skipping old/duplicate delta (version ${delta._version} vs current ${baseState._version})`);
                return false;
            } else {
                // Too far ahead - likely desync
                console.warn(`Large version gap detected (${versionDiff} versions), requesting full state`);
                return false;
            }
        }

        // If no versioning, assume it's safe
        return true;
    }

    /**
     * Create a minimal delta for common game state updates
     * This optimizes for the most frequent updates in the game
     * @param {Object} oldGameState - Previous game state JSON
     * @param {Object} newGameState - New game state JSON
     * @returns {Object} Minimal delta
     */
    static createGameStateDelta(oldGameState, newGameState) {
        const delta = {
            _version: newGameState._version,
            _timestamp: Date.now()
        };

        // Track which top-level fields changed
        const topLevelFields = [
            'remainingMoves',
            'turnPhase',
            'gamePhase'
        ];

        topLevelFields.forEach(field => {
            if (this.isDifferent(oldGameState[field], newGameState[field])) {
                delta[field] = newGameState[field];
            }
        });

        // For players array, check each player individually
        if (this.isDifferent(oldGameState.players, newGameState.players)) {
            // For now, send the entire players array if any player changed
            // This could be optimized further to send individual player deltas
            delta.players = newGameState.players;
        }

        // Board typically doesn't change during gameplay, only at game start
        if (this.isDifferent(oldGameState.board, newGameState.board)) {
            delta.board = newGameState.board;
        }

        // Settings can change during gameplay
        if (this.isDifferent(oldGameState.settings, newGameState.settings)) {
            delta.settings = newGameState.settings;
        }

        // Random generator state changes every roll
        if (this.isDifferent(oldGameState.randomGenerator, newGameState.randomGenerator)) {
            delta.randomGenerator = newGameState.randomGenerator;
        }

        return delta;
    }
}
