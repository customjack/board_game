/**
 * PluginBundle - Dependency injection container for plugins
 * 
 * Provides all dependencies that plugins need without using globals.
 * This bundle is passed to plugins when they're loaded, allowing them
 * to access base classes, factories, and other dependencies.
 */
export default class PluginBundle {
    constructor(dependencies) {
        // Base classes that plugins extend
        this.Plugin = dependencies.Plugin;
        this.BaseGameEngine = dependencies.BaseGameEngine;
        this.MultiPieceGameEngine = dependencies.MultiPieceGameEngine;
        this.BaseGameState = dependencies.BaseGameState;
        this.BasePieceManager = dependencies.BasePieceManager;
        this.MultiPieceManager = dependencies.MultiPieceManager;
        
        // Factories for registration
        this.GameEngineFactory = dependencies.GameEngineFactory;
        this.GameStateFactory = dependencies.GameStateFactory;
        
        // Enums and constants
        this.TurnPhases = dependencies.TurnPhases;
        this.GamePhases = dependencies.GamePhases;
        this.PlayerStates = dependencies.PlayerStates;
        
        // Components and utilities
        this.PhaseStateMachine = dependencies.PhaseStateMachine;
        this.getVisibleElementById = dependencies.getVisibleElementById;
        this.ModalUtil = dependencies.ModalUtil;
        
        // Core managers (passed during initialize, but available here for convenience)
        this.eventBus = dependencies.eventBus || null;
        this.registryManager = dependencies.registryManager || null;
        this.factoryManager = dependencies.factoryManager || null;
        this.MapStorageManager = dependencies.MapStorageManager || null;
    }
    
    /**
     * Update runtime dependencies (called after plugin is loaded)
     */
    updateRuntimeDependencies(eventBus, registryManager, factoryManager) {
        this.eventBus = eventBus;
        this.registryManager = registryManager;
        this.factoryManager = factoryManager;
    }
}

