/**
 * GameEngineFactory - Creates game engine instances based on configuration
 *
 * This factory allows for pluggable game engines where different boards
 * can specify different engine types and configurations.
 */
import TurnBasedGameEngine from './TurnBasedGameEngine.js';

export default class GameEngineFactory {
    // Registry of available engine types
    static engineRegistry = new Map();

    /**
     * Register a game engine type
     * @param {string} type - Engine type identifier
     * @param {class} EngineClass - Engine class constructor
     */
    static register(type, EngineClass) {
        if (!type || typeof type !== 'string') {
            throw new Error('Engine type must be a non-empty string');
        }

        if (typeof EngineClass !== 'function') {
            throw new Error('EngineClass must be a constructor function');
        }

        this.engineRegistry.set(type, EngineClass);
        console.log(`Registered game engine type: ${type}`);
    }

    /**
     * Unregister a game engine type
     * @param {string} type - Engine type to remove
     * @returns {boolean} True if unregistered, false if not found
     */
    static unregister(type) {
        return this.engineRegistry.delete(type);
    }

    /**
     * Check if an engine type is registered
     * @param {string} type - Engine type to check
     * @returns {boolean} True if registered
     */
    static isRegistered(type) {
        return this.engineRegistry.has(type);
    }

    /**
     * Get all registered engine types
     * @returns {string[]} Array of registered engine type names
     */
    static getRegisteredTypes() {
        return Array.from(this.engineRegistry.keys());
    }

    /**
     * Create a game engine instance
     * @param {Object} dependencies - Core dependencies
     * @param {GameState} dependencies.gameState - The game state
     * @param {string} dependencies.peerId - This peer's ID
     * @param {Function} dependencies.proposeGameState - Function to propose state changes
     * @param {EventBus} dependencies.eventBus - Event bus for communication
     * @param {RegistryManager} dependencies.registryManager - Registry manager
     * @param {FactoryManager} dependencies.factoryManager - Factory manager
     * @param {boolean} dependencies.isHost - Whether this peer is the host
     * @param {RollButtonManager} dependencies.rollButtonManager - Roll button manager
     * @param {TimerManager} dependencies.timerManager - Timer manager
     * @param {Object} config - Engine configuration
     * @param {string} config.type - Engine type (defaults to 'turn-based')
     * @param {Object} config.engineConfig - Engine-specific configuration
     * @returns {BaseGameEngine} Created engine instance
     */
    static create(dependencies, config = {}) {
        // Validate dependencies
        this.validateDependencies(dependencies);

        // Determine engine type from config or board metadata
        const engineType = this.determineEngineType(dependencies, config);

        // Get engine class from registry
        const EngineClass = this.engineRegistry.get(engineType);

        if (!EngineClass) {
            console.warn(`Engine type '${engineType}' not found, falling back to 'turn-based'`);
            const fallbackEngine = this.engineRegistry.get('turn-based');

            if (!fallbackEngine) {
                throw new Error('Default turn-based engine not registered');
            }

            return new fallbackEngine(dependencies, config.engineConfig || {});
        }

        // Create and return engine instance
        console.log(`Creating game engine of type: ${engineType}`);
        return new EngineClass(dependencies, config.engineConfig || {});
    }

    /**
     * Determine which engine type to use
     * @param {Object} dependencies - Core dependencies
     * @param {Object} config - Configuration object
     * @returns {string} Engine type to use
     */
    static determineEngineType(dependencies, config) {
        // 1. Check explicit config.type
        if (config.type) {
            return config.type;
        }

        // 2. Check board metadata for engine configuration
        if (dependencies.gameState?.board?.metadata?.gameEngine?.type) {
            return dependencies.gameState.board.metadata.gameEngine.type;
        }

        // 3. Default to turn-based
        return 'turn-based';
    }

    /**
     * Validate required dependencies
     * @param {Object} dependencies - Dependencies to validate
     * @throws {Error} If required dependencies are missing
     */
    static validateDependencies(dependencies) {
        const required = [
            'gameState',
            'peerId',
            'proposeGameState',
            'eventBus',
            'registryManager',
            'factoryManager'
        ];

        for (const dep of required) {
            if (!dependencies[dep]) {
                throw new Error(`Missing required dependency: ${dep}`);
            }
        }

        // isHost is required but can be false
        if (dependencies.isHost === undefined) {
            throw new Error('Missing required dependency: isHost');
        }
    }

    /**
     * Extract engine configuration from board metadata
     * @param {GameState} gameState - Game state with board
     * @returns {Object} Engine configuration or empty object
     */
    static extractEngineConfig(gameState) {
        return gameState?.board?.metadata?.gameEngine?.config || {};
    }

    /**
     * Create engine with board metadata configuration
     * @param {Object} dependencies - Core dependencies
     * @returns {BaseGameEngine} Created engine instance
     */
    static createFromBoardMetadata(dependencies) {
        const engineConfig = this.extractEngineConfig(dependencies.gameState);

        return this.create(dependencies, {
            type: dependencies.gameState?.board?.metadata?.gameEngine?.type,
            engineConfig
        });
    }

    /**
     * Get information about a registered engine type
     * @param {string} type - Engine type
     * @returns {Object|null} Engine info or null if not found
     */
    static getEngineInfo(type) {
        const EngineClass = this.engineRegistry.get(type);
        if (!EngineClass) return null;

        return {
            type,
            className: EngineClass.name,
            isRegistered: true
        };
    }

    /**
     * List all registered engines with their info
     * @returns {Array} Array of engine info objects
     */
    static listEngines() {
        const engines = [];
        for (const type of this.engineRegistry.keys()) {
            engines.push(this.getEngineInfo(type));
        }
        return engines;
    }
}

// Register default engine types
GameEngineFactory.register('turn-based', TurnBasedGameEngine);

// Export for use in other modules
export { GameEngineFactory };
