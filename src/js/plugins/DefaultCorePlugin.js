import Plugin from '../pluginManagement/Plugin.js';

/**
 * DefaultCorePlugin - Registers all core engine components as a plugin
 *
 * This plugin represents the essential game engine components that cannot
 * be disabled. It includes:
 * - Game Engine (turn-based)
 * - Phase State Machine (default)
 * - Turn Manager (default)
 * - Event Processor (default)
 * - UI Controller (default)
 * - UI Components (6 components)
 * - Animations (4 animations)
 */
export default class DefaultCorePlugin extends Plugin {
    /**
     * Initialize the plugin - core components are already registered by factories
     * This plugin is mainly for metadata tracking purposes
     * @param {EventBus} eventBus - The event bus instance
     * @param {RegistryManager} registryManager - The registry manager instance
     * @param {FactoryManager} factoryManager - The factory manager instance
     */
    initialize(eventBus, registryManager, factoryManager) {
        this.eventBus = eventBus;
        this.registryManager = registryManager;
        this.factoryManager = factoryManager;

        // Core components are registered by their respective factories
        // This plugin just tracks them for the Plugin Manager UI
        console.log('[Plugin] DefaultCore: Core engine components available');
    }

    /**
     * Optional cleanup method when the plugin is removed
     */
    cleanup() {
        console.log('Cleaning up DefaultCorePlugin...');
    }

    /**
     * Get plugin metadata for Plugin Manager
     * @static
     * @returns {Object} Plugin metadata
     */
    static getPluginMetadata() {
        return {
            id: 'default-core',
            name: 'Core Engine',
            version: '1.0.0',
            description: 'Essential game engine components including turn management, event processing, UI control, and animations',
            author: 'Game Engine',
            type: 'core',
            isDefault: true,
            dependencies: [],
            provides: {
                actions: [],
                triggers: [],
                effects: [],
                components: [
                    'GameEngine (turn-based)',
                    'PhaseStateMachine (default)',
                    'TurnManager (default)',
                    'EventProcessor (default)',
                    'UIController (default)',
                    'UI Components (6): RemainingMoves, PlayerList, RollButton, Timer, GameLog, BoardCanvas',
                    'Animations (4): particle-burst, dice-roll, slot-machine, timer'
                ]
            }
        };
    }
}
