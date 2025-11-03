/**
 * BaseGameEngine - Abstract base class for all game engines
 *
 * Defines the common interface and shared functionality that all game engines must implement.
 * Specific game types (turn-based, realtime, etc.) extend this class.
 */
export default class BaseGameEngine {
    /**
     * Create a base game engine
     * @param {Object} dependencies - Core dependencies
     * @param {GameState} dependencies.gameState - The game state
     * @param {string} dependencies.peerId - This peer's ID
     * @param {Function} dependencies.proposeGameState - Function to propose state changes
     * @param {EventBus} dependencies.eventBus - Event bus for communication
     * @param {RegistryManager} dependencies.registryManager - Registry manager
     * @param {FactoryManager} dependencies.factoryManager - Factory manager
     * @param {boolean} dependencies.isHost - Whether this peer is the host
     * @param {Object} config - Engine-specific configuration
     */
    constructor(dependencies, config = {}) {
        if (new.target === BaseGameEngine) {
            throw new TypeError('Cannot construct BaseGameEngine instances directly - must be extended');
        }

        // Core dependencies
        this.gameState = dependencies.gameState;
        this.peerId = dependencies.peerId;
        this.proposeGameState = dependencies.proposeGameState;
        this.eventBus = dependencies.eventBus;
        this.registryManager = dependencies.registryManager;
        this.factoryManager = dependencies.factoryManager;
        this.isHost = dependencies.isHost;
        this.gameLogManager = dependencies.gameLogManager || null;

        // Configuration
        this.config = config;

        // Engine state
        this.initialized = false;
        this.running = false;
    }

    /**
     * Initialize the game engine
     * Must be implemented by subclasses
     * @abstract
     */
    init() {
        throw new Error('init() must be implemented by subclass');
    }

    /**
     * Update the game state and trigger appropriate handlers
     * Must be implemented by subclasses
     * @abstract
     * @param {GameState} gameState - The new game state
     */
    updateGameState(gameState) {
        throw new Error('updateGameState() must be implemented by subclass');
    }

    /**
     * Handle a player action
     * Must be implemented by subclasses
     * @abstract
     * @param {string} actionType - Type of action
     * @param {*} actionData - Action data
     */
    onPlayerAction(actionType, actionData) {
        throw new Error('onPlayerAction() must be implemented by subclass');
    }

    /**
     * Clean up engine resources
     * Must be implemented by subclasses
     * @abstract
     */
    cleanup() {
        throw new Error('cleanup() must be implemented by subclass');
    }

    /**
     * Propose a game state change to the host
     * This is a common operation shared by all engines
     * @param {GameState} newGameState - The proposed state
     * @param {number} delay - Optional delay in ms
     */
    proposeStateChange(newGameState, delay = 0) {
        if (delay > 0) {
            setTimeout(() => {
                this.proposeGameState(newGameState);
            }, delay);
        } else {
            this.proposeGameState(newGameState);
        }
    }

    /**
     * Check if it's this peer's turn/action
     * @returns {boolean} True if it's this peer's turn
     */
    isClientTurn() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        return currentPlayer && currentPlayer.peerId === this.peerId;
    }

    /**
     * Emit an engine event
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    emitEvent(eventName, data = {}) {
        if (this.eventBus) {
            this.eventBus.emit(eventName, {
                ...data,
                gameState: this.gameState,
                engineType: this.getEngineType()
            });
        }
    }

    /**
     * Write a generic entry to the shared game log (if available).
     * @param {string} message - Message content.
     * @param {Object} details - Additional metadata for the entry.
     * @returns {Object|null} The log entry or null if log manager unavailable.
     */
    log(message, details = {}) {
        if (!this.gameLogManager) return null;
        return this.gameLogManager.log(message, {
            source: details.source ?? this.getEngineType(),
            turnNumber: details.turnNumber ?? this.gameState?.getTurnNumber?.(),
            ...details
        });
    }

    /**
     * Convenience helper for logging player actions.
     * @param {Object|string} player - Player instance or identifier.
     * @param {string} message - Message content.
     * @param {Object} details - Additional metadata.
     * @returns {Object|null} The log entry or null if unavailable.
     */
    logPlayerAction(player, message, details = {}) {
        if (!this.gameLogManager) return null;
        return this.gameLogManager.logPlayerAction(player, message, {
            source: details.source ?? this.getEngineType(),
            turnNumber: details.turnNumber ?? this.gameState?.getTurnNumber?.(),
            phase: details.phase ?? this.gameState?.turnPhase,
            ...details
        });
    }

    /**
     * Create a reusable logger function from the shared manager.
     * @param {string} source - Identifier for the logger.
     * @param {Object} defaultDetails - Optional default metadata.
     * @returns {Function} Logger function or noop.
     */
    getLogChannel(source, defaultDetails = {}) {
        if (!this.gameLogManager) {
            return () => null;
        }
        return this.gameLogManager.createLogger(source, defaultDetails);
    }

    /**
     * Get the engine type identifier
     * Should be overridden by subclasses
     * @returns {string} Engine type
     */
    getEngineType() {
        return 'base';
    }

    /**
     * Get engine configuration
     * @returns {Object} Configuration object
     */
    getConfig() {
        return this.config;
    }

    /**
     * Update engine configuration
     * @param {Object} newConfig - New configuration values
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.onConfigChanged();
    }

    /**
     * Called when configuration changes
     * Can be overridden by subclasses
     */
    onConfigChanged() {
        // Default: do nothing
    }

    /**
     * Pause the game engine
     * Can be overridden by subclasses
     */
    pause() {
        this.running = false;
        this.emitEvent('enginePaused');
    }

    /**
     * Resume the game engine
     * Can be overridden by subclasses
     */
    resume() {
        this.running = true;
        this.emitEvent('engineResumed');
    }

    /**
     * Check if engine is running
     * @returns {boolean} True if running
     */
    isRunning() {
        return this.running;
    }

    /**
     * Check if engine is initialized
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Serialize engine state for debugging/logging
     * @returns {Object} Serialized state
     */
    toJSON() {
        return {
            engineType: this.getEngineType(),
            peerId: this.peerId,
            isHost: this.isHost,
            initialized: this.initialized,
            running: this.running,
            config: this.config
        };
    }
}
