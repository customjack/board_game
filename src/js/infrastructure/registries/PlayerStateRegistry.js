import BaseRegistry from '../../core/base/BaseRegistry.js';

/**
 * PlayerStateRegistry - Registry for custom player states defined by plugins
 * 
 * Plugins can register custom player states that extend beyond the built-in
 * PlayerStates enum. This allows plugins to define their own game-specific
 * player states (e.g., "FINISHED", "ELIMINATED", "SPECTATING", etc.)
 */
class PlayerStateRegistry extends BaseRegistry {
    /**
     * Register a custom player state
     * @param {string} state - The state string to register
     * @param {Object} metadata - Optional metadata about the state
     */
    register(state, metadata = {}) {
        if (!state || typeof state !== 'string') {
            console.warn(`Invalid player state: ${state}`);
            return;
        }
        this.registry[state] = {
            state,
            ...metadata
        };
    }

    /**
     * Check if a state is registered
     * @param {string} state - The state to check
     * @returns {boolean} True if the state is registered
     */
    isRegistered(state) {
        return state in this.registry;
    }

    /**
     * Get all registered custom states
     * @returns {string[]} Array of registered state strings
     */
    getRegisteredStates() {
        return Object.keys(this.registry);
    }
}

// Export singleton instance
const playerStateRegistry = new PlayerStateRegistry();
export default playerStateRegistry;
export { PlayerStateRegistry };

