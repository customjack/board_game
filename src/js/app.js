import '../css/styles.css';
import HostEventHandler from './eventHandlers/HostEventHandler';
import ClientEventHandler from './eventHandlers/ClientEventHandler';
import PersonalSettings from './models/PersonalSettings';
import PersonalSettingsMenu from './controllers/menus/PersonalSettingsMenu';
import PageRegistry from './registries/PageRegistry';
import ListenerRegistry from './registries/ListenerRegistry';
import PlaceholderRegistry from './registries/PlaceholderRegistry';
import WindowListenerRegistry from './registries/WindowListenerRegistry';
import RegistryManager from './registries/RegistryManager';
import EventBus from './events/EventBus';
import PluginManager from './pluginManagement/PluginManager';
import FactoryManager from './factories/FactoryManager';
import EffectFactory from './factories/EffectFactory';
import SkipTurnEffect from './models/PlayerEffects/SkipTurnEffect';
import PhaseStateMachineFactory from './factories/PhaseStateMachineFactory';
import TurnManagerFactory from './factories/TurnManagerFactory';
import EventProcessorFactory from './factories/EventProcessorFactory';
import UIControllerFactory from './factories/UIControllerFactory';
import UIComponentFactory from './factories/UIComponentFactory';
import AnimationFactory from './factories/AnimationFactory';

import { randomNumber, randomWord, randomColor, randomSong } from './utils/PlaceholderFunctions';

// Initialize personal settings
function initializePersonalSettings(factoryManager) {
    const personalSettings = new PersonalSettings();
    const personalSettingsMenu = new PersonalSettingsMenu('settingsModal', personalSettings, factoryManager);
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

    registryManager.addRegistry('pageRegistry', pageRegistry);
    registryManager.addRegistry('listenerRegistry', listenerRegistry);
    registryManager.addRegistry('placeholderRegistry', placeholderRegistry);
    registryManager.addRegistry('windowListenerRegistry', windowListenerRegistry);

    return { registryManager, pageRegistry, listenerRegistry, placeholderRegistry, windowListenerRegistry};
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
    const requirePlugin = require.context('./plugins', true, /\.js$/);
    requirePlugin.keys().forEach((fileName) => {
        const pluginModule = requirePlugin(fileName);
        const plugin = pluginModule.default || pluginModule; // Use default export or the module itself
        if (plugin && typeof plugin === 'function') {
            const pluginInstance = new plugin(); // Create an instance of the plugin
            pluginManager.registerPlugin(pluginInstance); // Register the plugin
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

    // Register effects in the EffectFactory
    effectFactory.register('SkipTurnEffect', SkipTurnEffect);

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
    eventBus
) {
    listenerRegistry.registerListener('hostButton', 'click', () => {
        const hostButton = document.getElementById('hostButton');
        hostButton.disabled = true;

        pluginManager.setHost(true);
        const hostEventHandler = new HostEventHandler(
            registryManager,
            pluginManager,
            factoryManager,
            eventBus,
            personalSettings
        );
        hostEventHandler.init();
    });

    listenerRegistry.registerListener('joinButton', 'click', () => {
        const joinButton = document.getElementById('joinButton');
        joinButton.disabled = true;

        pluginManager.setHost(false);
        const clientEventHandler = new ClientEventHandler(
            registryManager,
            pluginManager,
            factoryManager,
            eventBus,
            personalSettings
        );
        clientEventHandler.init();
    });

    listenerRegistry.registerListener('gearButton', 'click', () => {
        personalSettingsMenu.show();
    });

    // Add refresh/back button warning
    windowListenerRegistry.registerListener('beforeunload', (event) => {
        // Custom message to warn the user
        event.preventDefault();  // Standard method for preventing the action
        event.returnValue = '';  // For older browsers to show a default confirmation dialog

        // Custom logic: You could add more specific checks to ensure that the user is in a game before warning them
        alert('You are about to leave the game. If you refresh or go back, you will be kicked out!');
    });
}


// Main application initialization function
function initializeApp() {
    // Factories and manager (initialized first so we can pass to PersonalSettingsMenu)
    const factoryManager = initializeFactories();

    // Personal settings
    const { personalSettings, personalSettingsMenu } = initializePersonalSettings(factoryManager);

    // Registries and manager
    const { registryManager, pageRegistry, listenerRegistry, windowListenerRegistry, placeholderRegistry } =
        initializeRegistryManager();

    // Register pages and placeholders
    registerPages(pageRegistry);
    registerPlaceholders(placeholderRegistry);

    // EventBus and PluginManager
    const eventBus = new EventBus();
    const pluginManager = initializePluginManager(eventBus, registryManager, factoryManager);

    // Register listeners
    registerListeners(
        listenerRegistry,
        windowListenerRegistry,
        personalSettingsMenu,
        personalSettings,
        registryManager,
        pluginManager,
        factoryManager,
        eventBus
    );
}

// Run the application
initializeApp();
