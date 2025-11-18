/**
 * IGameEngine - Interface defining the contract for all game engines
 *
 * This interface ensures game engines are completely modular and can operate
 * independently of specific UI implementations.
 *
 * Design Philosophy:
 * - Game engines should not declare capabilities upfront (no "supports" flags)
 * - Instead, they expose what UI components they need via getRequiredUIComponents()
 * - This allows for organic growth as new game types emerge
 * - No need to predict every possible game mechanic in advance
 * - Game engines implement what they need; the system adapts to them
 */

/**
 * UI Component specification
 * @typedef {Object} UIComponentSpec
 * @property {string} id - Unique component identifier
 * @property {string} type - Component type (button, display, selector, etc.)
 * @property {boolean} required - Whether component is required for engine to function
 * @property {Object} config - Component-specific configuration
 * @property {Object} events - Events this component emits and listens to
 * @property {string[]} events.emits - Event types this component emits
 * @property {string[]} events.listens - Event types this component listens to
 * @property {Object} [position] - Optional default position
 * @property {string} [description] - Human-readable description
 */

/**
 * Engine state descriptor
 * @typedef {Object} EngineState
 * @property {boolean} initialized - Whether engine is initialized
 * @property {boolean} running - Whether engine is running
 * @property {boolean} paused - Whether engine is paused
 * @property {string} currentPhase - Current game/turn phase
 * @property {Object} metadata - Additional engine-specific state
 */

/**
 * Game engine interface
 * All game engines must implement these methods
 */
export default class IGameEngine {
    // ===== Lifecycle Methods =====

    /**
     * Initialize the game engine
     * @param {GameState} gameState - Initial game state
     * @param {Object} config - Engine configuration
     */
    init(gameState, config) {
        throw new Error('init() must be implemented by game engine');
    }

    /**
     * Start the game engine
     */
    start() {
        throw new Error('start() must be implemented by game engine');
    }

    /**
     * Pause the game engine
     */
    pause() {
        throw new Error('pause() must be implemented by game engine');
    }

    /**
     * Resume the game engine
     */
    resume() {
        throw new Error('resume() must be implemented by game engine');
    }

    /**
     * Stop the game engine
     */
    stop() {
        throw new Error('stop() must be implemented by game engine');
    }

    /**
     * Clean up engine resources
     */
    cleanup() {
        throw new Error('cleanup() must be implemented by game engine');
    }

    // ===== State Management =====

    /**
     * Update game state
     * @param {GameState} gameState - New game state
     */
    updateGameState(gameState) {
        throw new Error('updateGameState() must be implemented by game engine');
    }

    /**
     * Get current engine state
     * @returns {EngineState} Current engine state
     */
    getEngineState() {
        throw new Error('getEngineState() must be implemented by game engine');
    }

    // ===== Player Actions =====

    /**
     * Handle a generic player action
     * @param {string} playerId - ID of player performing action
     * @param {string} actionType - Type of action (ROLL_DICE, SELECT_PIECE, etc.)
     * @param {Object} actionData - Action-specific data
     * @returns {Promise<Object>} Action result {success: boolean, data?: any, error?: string}
     */
    async onPlayerAction(playerId, actionType, actionData) {
        throw new Error('onPlayerAction() must be implemented by game engine');
    }

    // ===== UI Requirements =====

    /**
     * Get UI components required by this engine
     * @returns {UIComponentSpec[]} Array of UI component specifications
     */
    getRequiredUIComponents() {
        throw new Error('getRequiredUIComponents() must be implemented by game engine');
    }

    /**
     * Get optional UI components that enhance this engine
     * @returns {UIComponentSpec[]} Array of optional UI component specifications
     */
    getOptionalUIComponents() {
        return []; // Default: no optional components
    }

    /**
     * Register UI components with this engine
     * Called by framework after engine initialization
     * @param {Object} uiRegistry - UI component registry
     */
    registerUIComponents(uiRegistry) {
        // Default: no-op (engines can override if they need UI)
    }

    // ===== Metadata =====

    /**
     * Get engine type identifier
     * @returns {string} Engine type (e.g., 'turn-based', 'real-time', 'multi-piece')
     */
    getEngineType() {
        throw new Error('getEngineType() must be implemented by game engine');
    }

    /**
     * REMOVED: getCapabilities()
     *
     * The "capabilities" system tried to predict all possible game features upfront.
     * This was the wrong approach because:
     * 1. It's impossible to predict all future game mechanics
     * 2. It created coupling between engines and a central capability list
     * 3. Adding new game types required updating the capability system
     *
     * Instead:
     * - Engines expose their UI needs through getRequiredUIComponents()
     * - Engines implement their own specific logic organically
     * - The system adapts to engines, not the other way around
     */

    /**
     * Get engine configuration schema
     * Returns JSON schema describing valid configuration options
     * @returns {Object} JSON schema object
     */
    getConfigSchema() {
        return {
            type: 'object',
            properties: {},
            additionalProperties: true
        };
    }

    /**
     * Check if engine can run without UI (headless mode)
     * @returns {boolean} True if engine can run headless
     */
    canRunHeadless() {
        const required = this.getRequiredUIComponents();
        return required.every(spec => !spec.required);
    }

    /**
     * Validate if this engine is compatible with a board
     * @param {Board} board - Board to validate against
     * @returns {Object} Validation result {valid: boolean, errors: string[], warnings: string[]}
     */
    validateBoard(board) {
        return {
            valid: true,
            errors: [],
            warnings: []
        };
    }
}
