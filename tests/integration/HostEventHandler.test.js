/**
 * Integration tests for HostEventHandler
 * Tests the full host game initialization sequence
 */

import HostEventHandler from '../../src/js/eventHandlers/HostEventHandler.js';
import RegistryManager from '../../src/js/registries/RegistryManager.js';
import PluginManager from '../../src/js/pluginManagement/PluginManager.js';
import FactoryManager from '../../src/js/factories/FactoryManager.js';
import EventBus from '../../src/js/events/EventBus.js';
import PersonalSettings from '../../src/js/models/PersonalSettings.js';
import MapStorageManager from '../../src/js/managers/MapStorageManager.js';

// Mock modules
jest.mock('../../src/js/networking/Host.js');
jest.mock('../../src/js/ui/UISystem.js');
jest.mock('../../src/js/factories/GameEngineFactory.js');
jest.mock('../../src/js/animations/TimerAnimation.js');

describe('HostEventHandler Integration Tests', () => {
    let hostEventHandler;
    let registryManager;
    let pluginManager;
    let factoryManager;
    let eventBus;
    let personalSettings;

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();

        // Reset all mocks
        jest.clearAllMocks();

        // Initialize dependencies
        registryManager = new RegistryManager();
        pluginManager = new PluginManager(null, registryManager);
        factoryManager = new FactoryManager(registryManager);
        eventBus = new EventBus();
        personalSettings = new PersonalSettings();

        // Mock DOM elements needed for the test
        document.body.innerHTML = `
            <div id="homePage"></div>
            <div id="hostPage" style="display: none;">
                <input id="hostNameInput" type="text" value="TestHost" />
                <button id="startHostButton">Start Host</button>
                <button id="hostBackButton">Back</button>
            </div>
            <div id="loadingPage" style="display: none;"></div>
            <div id="lobbyPage" style="display: none;">
                <button id="closeGameButton" style="display: none;">Close Game</button>
                <button id="startGameButton" style="display: none;">Start Game</button>
                <button id="selectMapButton" style="display: none;">Select Map</button>
                <button id="uploadBoardButton" style="display: none;">Upload Board</button>
                <button id="copyInviteCodeButton">Copy Code</button>
                <button id="addPlayerButton">Add Player</button>
                <div id="settingsSectionHost" style="display: none;"></div>
                <div id="lobbyBoardContent"></div>
                <span id="inviteCode"></span>
                <ul id="lobbyPlayerList"></ul>
                <input id="playerLimitPerPeerHost" type="number" value="1" />
                <input id="totalPlayerLimitHost" type="number" value="8" />
                <input id="turnTimerHost" type="number" value="30" />
                <input id="moveDelayHost" type="number" value="500" />
                <input id="modalTimeoutHost" type="number" value="15" />
                <input id="turnTimerEnabledHost" type="checkbox" />
                <input id="boardFileInput" type="file" style="display: none;" />
                <input id="pluginFileInput" type="file" style="display: none;" />
            </div>
            <div id="gamePage" style="display: none;"></div>
        `;

        // Create HostEventHandler instance
        hostEventHandler = new HostEventHandler(
            registryManager,
            pluginManager,
            factoryManager,
            eventBus,
            personalSettings
        );
    });

    afterEach(() => {
        // Clean up
        if (hostEventHandler) {
            hostEventHandler.cleanup?.();
        }
        jest.restoreAllMocks();
        localStorage.clear();
    });

    describe('Initialization', () => {
        test('should initialize HostEventHandler correctly', () => {
            expect(hostEventHandler).toBeDefined();
            expect(hostEventHandler.isHost).toBe(true);
            expect(hostEventHandler.uiBinder).toBeDefined();
            expect(hostEventHandler.actionRegistry).toBeDefined();
        });

        test('should show host page on init', () => {
            hostEventHandler.init();

            const hostPage = document.getElementById('hostPage');
            const homePage = document.getElementById('homePage');

            expect(hostPage.style.display).not.toBe('none');
            expect(homePage.style.display).toBe('none');
        });

        test('should setup event listeners', () => {
            hostEventHandler.setupEventListeners();

            expect(hostEventHandler.uiBinder).toBeDefined();
            expect(hostEventHandler.actionRegistry).toBeDefined();
        });
    });

    describe('Map Selection Integration', () => {
        test('should initialize MapSelectionUI in displayLobbyControls', async () => {
            // Mock the necessary methods
            hostEventHandler.peer = {
                gameState: {
                    board: {},
                    selectedMapId: 'default',
                    selectedMapData: null
                },
                broadcastGameState: jest.fn()
            };

            hostEventHandler.uiSystem = {
                getActiveBoard: jest.fn(() => ({
                    setBoard: jest.fn(),
                    render: jest.fn(),
                    board: {}
                }))
            };

            // Mock loadInitialMap to prevent async issues
            hostEventHandler.loadInitialMap = jest.fn().mockResolvedValue();

            // Call displayLobbyControls
            hostEventHandler.displayLobbyControls();

            // Verify MapSelectionUI was initialized
            expect(hostEventHandler.mapSelectionUI).toBeDefined();
        });

        test('should load initial map on lobby display', async () => {
            const mockMapData = {
                metadata: {
                    name: 'Test Map',
                    author: 'Tester'
                },
                spaces: [
                    {
                        id: 'start',
                        name: 'Start',
                        visualDetails: { x: 100, y: 100, size: 50 },
                        connections: [],
                        events: []
                    }
                ]
            };

            // Mock MapStorageManager
            jest.spyOn(MapStorageManager, 'getSelectedMapId').mockReturnValue('default');
            jest.spyOn(MapStorageManager, 'loadMapData').mockResolvedValue(mockMapData);

            hostEventHandler.peer = {
                gameState: {
                    board: {},
                    selectedMapId: 'default',
                    selectedMapData: null
                },
                broadcastGameState: jest.fn()
            };

            const mockBoardComponent = {
                setBoard: jest.fn(),
                render: jest.fn(),
                board: {}
            };

            hostEventHandler.uiSystem = {
                getActiveBoard: jest.fn(() => mockBoardComponent)
            };

            // Load map
            await hostEventHandler.loadMapById('default');

            // Verify map was loaded
            expect(MapStorageManager.loadMapData).toHaveBeenCalledWith('default');
            expect(hostEventHandler.peer.gameState.selectedMapId).toBe('default');
            expect(hostEventHandler.peer.gameState.selectedMapData).toEqual(mockMapData);
            expect(mockBoardComponent.setBoard).toHaveBeenCalled();
            expect(mockBoardComponent.render).toHaveBeenCalled();
            expect(hostEventHandler.peer.broadcastGameState).toHaveBeenCalled();
        });

        test('should handle map load errors gracefully', async () => {
            jest.spyOn(MapStorageManager, 'loadMapData').mockRejectedValue(
                new Error('Map not found')
            );

            hostEventHandler.peer = {
                gameState: {
                    board: {},
                    selectedMapId: null,
                    selectedMapData: null
                },
                broadcastGameState: jest.fn()
            };

            hostEventHandler.uiSystem = {
                getActiveBoard: jest.fn(() => ({
                    setBoard: jest.fn(),
                    render: jest.fn()
                }))
            };

            await expect(hostEventHandler.loadMapById('invalid-map')).rejects.toThrow('Map not found');
        });
    });

    describe('Lobby Controls', () => {
        test('should display all lobby control buttons', () => {
            hostEventHandler.peer = {
                gameState: {
                    board: {},
                    selectedMapId: 'default',
                    selectedMapData: null
                },
                broadcastGameState: jest.fn()
            };

            hostEventHandler.uiSystem = {
                getActiveBoard: jest.fn(() => ({
                    setBoard: jest.fn(),
                    render: jest.fn(),
                    board: {}
                }))
            };

            hostEventHandler.displayLobbyControls();

            const closeButton = document.getElementById('closeGameButton');
            const startButton = document.getElementById('startGameButton');
            const selectMapButton = document.getElementById('selectMapButton');
            const uploadButton = document.getElementById('uploadBoardButton');
            const settingsSection = document.getElementById('settingsSectionHost');

            expect(closeButton.style.display).toBe('inline');
            expect(startButton.style.display).toBe('inline');
            expect(selectMapButton.style.display).toBe('inline');
            expect(uploadButton.style.display).toBe('inline');
            expect(settingsSection.style.display).toBe('inline');
        });
    });

    describe('Built-in Maps', () => {
        test('should have all built-in maps available', () => {
            const builtInMaps = MapStorageManager.getBuiltInMaps();

            expect(builtInMaps.length).toBeGreaterThanOrEqual(6);

            const mapIds = builtInMaps.map(m => m.id);
            expect(mapIds).toContain('default');
            expect(mapIds).toContain('simple-linear');
            expect(mapIds).toContain('branching-paths');
            expect(mapIds).toContain('custom-engine');
            expect(mapIds).toContain('circular-party');
            expect(mapIds).toContain('mini-test');
        });

        test('should load all built-in maps without errors', async () => {
            const builtInMaps = MapStorageManager.getBuiltInMaps();

            // Mock fetch for built-in maps
            global.fetch = jest.fn((url) => {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        metadata: { name: 'Test', author: 'Test' },
                        spaces: [{
                            id: 'start',
                            name: 'Start',
                            visualDetails: { x: 100, y: 100 },
                            connections: [],
                            events: []
                        }]
                    })
                });
            });

            for (const map of builtInMaps) {
                const mapData = await MapStorageManager.loadMapData(map.id);
                expect(mapData).toBeDefined();
                expect(mapData.spaces).toBeDefined();
                expect(mapData.metadata).toBeDefined();
            }
        });
    });
});
