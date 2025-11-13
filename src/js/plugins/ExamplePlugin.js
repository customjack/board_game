import Plugin from '../pluginManagement/Plugin';

export default class ExamplePlugin extends Plugin {
    initialize(eventBus, registryManager, factoryManager) {
        // Plugin initialization logic
        console.log('Example Plugin initialized!', { eventBus, registryManager, factoryManager});

        // Example: Register custom engine components
        // Plugins can register custom implementations of engine components

        // Register a custom phase state machine
        // const phaseStateMachineFactory = factoryManager.getFactory('PhaseStateMachineFactory');
        // phaseStateMachineFactory.register('custom', CustomPhaseStateMachine);

        // Register a custom turn manager
        // const turnManagerFactory = factoryManager.getFactory('TurnManagerFactory');
        // turnManagerFactory.register('custom', CustomTurnManager);

        // Register a custom event processor
        // const eventProcessorFactory = factoryManager.getFactory('EventProcessorFactory');
        // eventProcessorFactory.register('custom', CustomEventProcessor);

        // Register a custom UI controller
        // const uiControllerFactory = factoryManager.getFactory('UIControllerFactory');
        // uiControllerFactory.register('custom', CustomUIController);

        // Register custom UI components
        // const uiComponentFactory = factoryManager.getFactory('UIComponentFactory');
        // uiComponentFactory.register('CustomPlayerList', CustomPlayerListComponent);
        // uiComponentFactory.register('CustomTimer', CustomTimerComponent);
        // uiComponentFactory.register('CustomGameLog', CustomGameLogComponent);

        // Register custom game engines
        // import GameEngineFactory from '../factories/GameEngineFactory.js';
        // GameEngineFactory.register('realtime', RealtimeGameEngine);

        // Register custom player effects
        // const effectFactory = factoryManager.getFactory('EffectFactory');
        // effectFactory.register('CustomEffect', CustomEffect);

        // Listen for game state updates
        eventBus.on('settingsUpdated', this.handleSettingsUpdate.bind(this));
        eventBus.on('boardUpdated', this.handleBoardUpdate.bind(this));
        eventBus.on('piecesUpdated', this.handlePiecesUpdate.bind(this));
        eventBus.on('playerListUpdated', this.handlePlayerListUpdate.bind(this));
        eventBus.on('gameStateUpdated', this.handleGameStateUpdate.bind(this));
    }

    handleSettingsUpdate(data) {
        //console.log('Settings updated:', data.gamestate.settings);
    }

    handleBoardUpdate(data) {
        //console.log('Board updated:', data.gamestate.board);
    }

    handlePiecesUpdate(data) {
        //console.log('Pieces updated:', data.gamestate.players);
    }

    handlePlayerListUpdate(data) {
        //console.log('Player list updated:', data.gamestate.players);
    }

    handleGameStateUpdate(data) {
        //console.log('Game state updated:', data.gamestate);
    }

    cleanup() {
        // Optional cleanup logic when the plugin is removed
        console.log('Cleaning up ExamplePlugin...');
        // Unsubscribe from events to avoid memory leaks
        this.eventBus.off('settingsUpdated', this.handleSettingsUpdate.bind(this));
        this.eventBus.off('boardUpdated', this.handleBoardUpdate.bind(this));
        this.eventBus.off('piecesUpdated', this.handlePiecesUpdate.bind(this));
        this.eventBus.off('playerListUpdated', this.handlePlayerListUpdate.bind(this));
        this.eventBus.off('gameStateUpdated', this.handleGameStateUpdate.bind(this));
    }

    /**
     * Get plugin metadata
     * @static
     * @returns {Object} Plugin metadata
     */
    static getPluginMetadata() {
        return {
            id: 'example-plugin',
            name: 'Example Plugin',
            version: '1.0.0',
            description: 'A sample plugin showing how to extend game functionality',
            author: 'Example Author',
            tags: ['example', 'template'],
            isDefault: false,
            dependencies: [], // Array of plugin IDs this depends on (e.g., ['core-default'])
            provides: {
                actions: [],
                triggers: [],
                effects: [],
                components: []
            }
        };
    }
}
