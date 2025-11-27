import '../css/styles.css';
import HostEventHandler from './eventHandlers/HostEventHandler';
import ClientEventHandler from './eventHandlers/ClientEventHandler';
import PersonalSettings from './elements/models/PersonalSettings';
import PersonalSettingsModal from './ui/modals/PersonalSettingsModal.js';
import PluginManagerModal from './ui/modals/PluginManagerModal.js';
import PageRegistry from './infrastructure/registries/PageRegistry.js';
import ListenerRegistry from './infrastructure/registries/ListenerRegistry.js';
import PlaceholderRegistry from './infrastructure/registries/PlaceholderRegistry.js';
import WindowListenerRegistry from './infrastructure/registries/WindowListenerRegistry.js';
import PieceManagerRegistry from './infrastructure/registries/PieceManagerRegistry.js';
import RegistryManager from './infrastructure/registries/RegistryManager.js';
import EventBus from './core/events/EventBus';
import PluginManager from './systems/plugins/PluginManager';
import MapManagerModal from './ui/modals/MapManagerModal.js';
import Plugin from './systems/plugins/Plugin.js';
import DefaultCorePlugin from './systems/plugins/DefaultCorePlugin.js';
import LocalStorageManager from './systems/storage/LocalStorageManager';
import FactoryManager from './infrastructure/factories/FactoryManager';
import GameEngineFactory from './infrastructure/factories/GameEngineFactory.js';
import GameStateFactory from './infrastructure/factories/GameStateFactory.js';
import BaseGameState from './game/state/BaseGameState.js';
import BaseGameEngine from './core/base/BaseGameEngine.js';
import TurnPhases from './game/phases/TurnPhases.js';
import GamePhases from './game/phases/GamePhases.js';
import PhaseStateMachine from './game/components/PhaseStateMachine.js';
import BasePieceManager from './infrastructure/managers/BasePieceManager.js';
import MultiPieceManager from './infrastructure/managers/MultiPieceManager.js';
import MultiPieceGameEngine from './game/engines/MultiPieceGameEngine.js';
import PlayerStates from './game/phases/PlayerStates.js';
import { getVisibleElementById } from './infrastructure/utils/helpers.js';
import ModalUtil from './infrastructure/utils/ModalUtil.js';
import EffectFactory from './infrastructure/factories/EffectFactory';
import ActionFactory from './infrastructure/factories/ActionFactory';
import TriggerFactory from './infrastructure/factories/TriggerFactory';
import StatFactory from './infrastructure/factories/StatFactory';
import PhaseStateMachineFactory from './infrastructure/factories/PhaseStateMachineFactory';
import TurnManagerFactory from './infrastructure/factories/TurnManagerFactory';
import EventProcessorFactory from './infrastructure/factories/EventProcessorFactory';
import UIControllerFactory from './infrastructure/factories/UIControllerFactory';
import UIComponentFactory from './infrastructure/factories/UIComponentFactory';
import AnimationFactory from './infrastructure/factories/AnimationFactory';
import MapStorageManager from './systems/storage/MapStorageManager.js';

import { randomNumber, randomWord, randomColor, randomSong } from './infrastructure/utils/PlaceholderFunctions';

// Initialize personal settings
function initializePersonalSettings(factoryManager, pluginManager, localStorageManager) {
    const personalSettings = new PersonalSettings();
    const personalSettingsMenu = new PersonalSettingsModal({
        id: 'settingsModal',
        personalSettings,
        factoryManager,
        pluginManager,
        localStorageManager
    });
    personalSettingsMenu.init();
    return { personalSettings, personalSettingsMenu };
}

// Initialize registries and registry manager
function initializeRegistryManager() {
    const registryManager = new RegistryManager();

    // Create and add registries
    const pageRegistry = new PageRegistry();
    const listenerRegistry = new ListenerRegistry();
    const placeholderRegistry = new PlaceholderRegistry();
    const windowListenerRegistry = new WindowListenerRegistry();
    const pieceManagerRegistry = new PieceManagerRegistry();

    registryManager.addRegistry('pageRegistry', pageRegistry);
    registryManager.addRegistry('listenerRegistry', listenerRegistry);
    registryManager.addRegistry('placeholderRegistry', placeholderRegistry);
    registryManager.addRegistry('windowListenerRegistry', windowListenerRegistry);
    registryManager.addRegistry('pieceManagerRegistry', pieceManagerRegistry);

    return { registryManager, pageRegistry, listenerRegistry, placeholderRegistry, windowListenerRegistry, pieceManagerRegistry };
}

// Register pages in the PageRegistry
function registerPages(pageRegistry) {
    const pages = [
        'homePage',
        'joinPage',
        'lobbyPage',
        'gamePage',
        'hostPage',
        'loadingPage',
    ];
    pages.forEach((page) => pageRegistry.registerPage(page));
}

// Register placeholders
function registerPlaceholders(placeholderRegistry) {
    const placeholders = {
        RANDOM_NUMBER: randomNumber,
        RANDOM_WORD: randomWord,
        RANDOM_COLOR: randomColor,
        RANDOM_SONG: randomSong,
    };

    Object.entries(placeholders).forEach(([key, value]) => {
        placeholderRegistry.register(key, value);
    });
}

// Initialize the EventBus and PluginManager
function initializePluginManager(eventBus, registryManager, factoryManager) {
    const pluginManager = new PluginManager(eventBus, registryManager, factoryManager);

    // Register plugins
    const requirePlugin = require.context('./systems/plugins', true, /\.js$/);
    requirePlugin.keys().forEach((fileName) => {
        const pluginModule = requirePlugin(fileName);
        const plugin = pluginModule.default || pluginModule; // Use default export or the module itself
        if (plugin && typeof plugin === 'function' && plugin.prototype instanceof Plugin) {
            // Register plugin class in metadata system (if it supports it)
            if (typeof plugin.getPluginMetadata === 'function') {
                pluginManager.registerPluginClass(plugin);
            }

            // Create instance and register (legacy method)
            const pluginInstance = new plugin();
            pluginManager.registerPlugin(pluginInstance);
        }
    });

    return pluginManager;
}

// Initialize the FactoryManager and register effects
function initializeFactories() {
    const factoryManager = new FactoryManager();

    // Create and add the EffectFactory
    const effectFactory = new EffectFactory();
    factoryManager.registerFactory('EffectFactory', effectFactory);
    // Note: Effects are registered by DefaultCorePlugin, not here

    // Create and add the ActionFactory
    const actionFactory = new ActionFactory();
    factoryManager.registerFactory('ActionFactory', actionFactory);
    // Note: Actions are registered by DefaultCorePlugin, not here

    // Create and add the TriggerFactory
    const triggerFactory = new TriggerFactory();
    factoryManager.registerFactory('TriggerFactory', triggerFactory);
    // Note: Triggers are registered by DefaultTriggersPlugin, not here

    // Create and add the StatFactory
    const statFactory = new StatFactory();
    factoryManager.registerFactory('StatFactory', statFactory);
    // Note: Stats are registered by DefaultCorePlugin, not here

    // Create and add engine component factories
    const phaseStateMachineFactory = new PhaseStateMachineFactory();
    factoryManager.registerFactory('PhaseStateMachineFactory', phaseStateMachineFactory);

    const turnManagerFactory = new TurnManagerFactory();
    factoryManager.registerFactory('TurnManagerFactory', turnManagerFactory);

    const eventProcessorFactory = new EventProcessorFactory();
    factoryManager.registerFactory('EventProcessorFactory', eventProcessorFactory);

    const uiControllerFactory = new UIControllerFactory();
    factoryManager.registerFactory('UIControllerFactory', uiControllerFactory);

    const uiComponentFactory = new UIComponentFactory();
    factoryManager.registerFactory('UIComponentFactory', uiComponentFactory);

    const animationFactory = new AnimationFactory();
    factoryManager.registerFactory('AnimationFactory', animationFactory);

    return factoryManager;
}

// Register listeners using ListenerRegistry
function registerListeners(
    listenerRegistry,
    windowListenerRegistry,
    personalSettingsMenu,
    personalSettings,
    registryManager,
    pluginManager,
    factoryManager,
    eventBus,
    localStorageManager
) {
    const pageRegistry = registryManager.getPageRegistry();
    const hostButton = document.getElementById('hostButton');
    const joinButton = document.getElementById('joinButton');
    const startHostButton = document.getElementById('startHostButton');
    const startJoinButton = document.getElementById('startJoinButton');
    const hostBackButton = document.getElementById('hostBackButton');
    const joinBackButton = document.getElementById('joinBackButton');

    // Initialize Plugin Manager Modal
    const pluginManagerModal = new PluginManagerModal('pluginManagerModal', pluginManager);

    // Initialize Map Manager Modal
    const mapManagerModal = new MapManagerModal('mapManagerModal', {
        isHost: false, // Default to false, updated when host starts
        factoryManager: factoryManager
    });
    mapManagerModal.init();

    // Wire up Personal Settings to open Plugin Manager
    personalSettingsMenu.setOpenPluginManager(() => {
        pluginManagerModal.open();
    });

    // Wire up Personal Settings to open Map Manager
    personalSettingsMenu.setOpenMapManager(() => {
        mapManagerModal.open();
    });

    const resetHomePage = () => {
        pageRegistry.showPage('homePage');
        if (hostButton) hostButton.disabled = false;
        if (joinButton) joinButton.disabled = false;
    };

    listenerRegistry.registerListener('hostButton', 'click', () => {
        pageRegistry.showPage('hostPage');
        if (startHostButton) startHostButton.disabled = false;
        const hostNameInput = document.getElementById('hostNameInput');
        if (hostNameInput) hostNameInput.focus();
    });

    listenerRegistry.registerListener('joinButton', 'click', () => {
        pageRegistry.showPage('joinPage');
        if (startJoinButton) startJoinButton.disabled = false;
        const joinNameInput = document.getElementById('joinNameInput');
        if (joinNameInput) joinNameInput.focus();
    });

    if (hostBackButton) {
        listenerRegistry.registerListener('hostBackButton', 'click', () => {
            const hostNameInput = document.getElementById('hostNameInput');
            if (hostNameInput) hostNameInput.value = '';
            resetHomePage();
        });
    }

    if (joinBackButton) {
        listenerRegistry.registerListener('joinBackButton', 'click', () => {
            const joinNameInput = document.getElementById('joinNameInput');
            const joinCodeInput = document.getElementById('joinCodeInput');
            if (joinNameInput) joinNameInput.value = '';
            if (joinCodeInput) joinCodeInput.value = '';
            resetHomePage();
        });
    }

    let hostEventHandlerInstance = null;
    if (startHostButton) {
        const handleStartHostClick = async () => {
            if (hostEventHandlerInstance) {
                return;
            }
            try {
                pluginManager.setHost(true);
                hostEventHandlerInstance = new HostEventHandler(
                    registryManager,
                    pluginManager,
                    factoryManager,
                    eventBus,
                    personalSettings,
                    pluginManagerModal,
                    personalSettingsMenu,
                    mapManagerModal
                );
                hostEventHandlerInstance.init();
                await hostEventHandlerInstance.startHostGame();
                startHostButton.removeEventListener('click', handleStartHostClick);
            } catch (error) {
                console.error('Failed to start host game:', error);
                hostEventHandlerInstance = null;
            }
        };
        startHostButton.addEventListener('click', handleStartHostClick);
    }

    let clientEventHandlerInstance = null;
    if (startJoinButton) {
        const handleStartJoinClick = async () => {
            if (clientEventHandlerInstance) {
                return;
            }
            try {
                pluginManager.setHost(false);
                clientEventHandlerInstance = new ClientEventHandler(
                    registryManager,
                    pluginManager,
                    factoryManager,
                    eventBus,
                    personalSettings,
                    pluginManagerModal,
                    personalSettingsMenu
                );
                clientEventHandlerInstance.init();
                await clientEventHandlerInstance.startJoinGame();
                startJoinButton.removeEventListener('click', handleStartJoinClick);
            } catch (error) {
                console.error('Failed to join game:', error);
                clientEventHandlerInstance = null;
            }
        };
        startJoinButton.addEventListener('click', handleStartJoinClick);
    }

    listenerRegistry.registerListener('gearButton', 'click', () => {
        personalSettingsMenu.open();
    });

    // Plugin List button in lobby (for clients to view enabled plugins)
    listenerRegistry.registerListener('viewPluginListButton', 'click', () => {
        pluginManagerModal.open(); // Don't show "Add Plugin" section for clients
    });

    // Add refresh/back button warning
    windowListenerRegistry.registerListener('beforeunload', (event) => {
        // Custom message to warn the user
        event.preventDefault();  // Standard method for preventing the action
        event.returnValue = '';  // For older browsers to show a default confirmation dialog

        // Custom logic: You could add more specific checks to ensure that the user is in a game before warning them
        alert('You are about to leave the game. If you refresh or go back, you will be kicked out!');
    });

    // Register Streamer Mode listener
    personalSettings.addStreamerModeListener((enabled) => {
        const inviteCodeElement = document.getElementById('inviteCode');
        if (inviteCodeElement) {
            if (enabled) {
                inviteCodeElement.classList.add('blurred-text');
            } else {
                inviteCodeElement.classList.remove('blurred-text');
            }
        }
    });

    // Initialize Streamer Mode state
    const inviteCodeElement = document.getElementById('inviteCode');
    if (inviteCodeElement && personalSettings.getStreamerMode()) {
        inviteCodeElement.classList.add('blurred-text');
    }
}


// Main application initialization function
function initializeApp() {
    // Factories and manager (initialized first)
    const factoryManager = initializeFactories();

    // Registries and manager
    const { registryManager, pageRegistry, listenerRegistry, windowListenerRegistry, placeholderRegistry } =
        initializeRegistryManager();

    // Register pages and placeholders
    registerPages(pageRegistry);
    registerPlaceholders(placeholderRegistry);

    // EventBus and PluginManager
    const eventBus = new EventBus();
    const pluginManager = initializePluginManager(eventBus, registryManager, factoryManager);

    // Local Storage Manager
    const localStorageManager = new LocalStorageManager();

    // Personal settings (needs factoryManager, pluginManager,    // Initialize Personal Settings
    const { personalSettings, personalSettingsMenu } = initializePersonalSettings(
        factoryManager,
        pluginManager,
        localStorageManager
    );

    // Apply initial theme
    document.documentElement.setAttribute('data-theme', personalSettings.getTheme());

    // Listen for theme changes
    personalSettings.addThemeListener((theme) => {
        document.documentElement.setAttribute('data-theme', theme);
    });

    // Initialize PluginBundle with all dependencies for remote plugins
    pluginManager.initializePluginBundle({
        Plugin,
        BaseGameEngine,
        MultiPieceGameEngine,
        BaseGameState,
        BasePieceManager,
        MultiPieceManager,
        GameEngineFactory,
        GameStateFactory,
        TurnPhases,
        GamePhases,
        PlayerStates,
        PhaseStateMachine,
        getVisibleElementById,
        ModalUtil,
        MapStorageManager
    });

    // Register listeners
    registerListeners(
        listenerRegistry,
        windowListenerRegistry,
        personalSettingsMenu,
        personalSettings,
        registryManager,
        pluginManager,
        factoryManager,
        eventBus,
        localStorageManager
    );
}

// Run the application
initializeApp();
