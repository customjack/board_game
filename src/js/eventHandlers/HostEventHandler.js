import BaseEventHandler from './BaseEventHandler.js';
import Host from '../networking/Host.js';
import GameEngineFactory from '../factories/GameEngineFactory.js';
import TimerAnimation from '../animations/TimerAnimation.js';
import ModalUtil from '../utils/ModalUtil.js';
import UIBinder from './UIBinder.js';
import ActionRegistry from './ActionRegistry.js';
import { HOST_UI_BINDINGS } from '../config/ui-bindings.js';
import LoadingProgressTracker, { LOADING_STAGES } from '../utils/LoadingProgressTracker.js';
import LoadingBar from '../ui/LoadingBar.js';
import MapSelectionUI from '../ui/components/MapSelectionUI.js';
import MapStorageManager from '../managers/MapStorageManager.js';
import Board from '../models/Board.js';

export default class HostEventHandler extends BaseEventHandler {
    constructor(registryManager, pluginManager, factoryManager, eventBus, personalSettings) {
        super(true, registryManager, pluginManager, factoryManager, eventBus, personalSettings);

        // Initialize UI systems
        this.uiBinder = new UIBinder(HOST_UI_BINDINGS);
        this.actionRegistry = new ActionRegistry();
        this.mapSelectionUI = null; // Initialized after peer is created
    }

    /**
     * Host starts on the host page
     */
    getInitialPage() {
        return "hostPage";
    }

    /**
     * Override to set up settings callback after managers are initialized
     */
    initManagers(peerId, hostPeerId) {
        super.initManagers(peerId, hostPeerId);

        // Set up settings change callback for host
        if (this.settingsManager) {
            this.settingsManager.setOnChangeCallback(() => this.onSettingsChanged());
        }
    }

    setupEventListeners() {
        super.setupEventListeners();

        // Initialize UI binder (cache all elements)
        this.uiBinder.initialize();

        // Setup actions
        this.setupActions();

        // Bind all actions at once
        this.actionRegistry.bindAll(this.listenerRegistry, this.uiBinder);

        // Settings callback will be set up after managers are initialized
    }

    /**
     * Setup actions using ActionRegistry
     */
    setupActions() {
        // Main game control actions
        this.actionRegistry.register('startHost', () => this.startHostGame(), {
            elementId: 'startHostButton',
            description: 'Start hosting a game'
        });

        this.actionRegistry.register('copyInvite', () => this.copyInviteCode(), {
            elementId: 'copyInviteCodeButton',
            description: 'Copy invite code to clipboard'
        });

        this.actionRegistry.register('closeGame', () => this.closeGame(), {
            elementId: 'closeGameButton',
            description: 'Close the game'
        });

        this.actionRegistry.register('startGame', () => this.startGame(), {
            elementId: 'startGameButton',
            description: 'Start the game'
        });

        this.actionRegistry.register('addPlayer', () => this.addPlayer(), {
            elementId: 'addPlayerButton',
            description: 'Add a new player'
        });

        // Map selection action
        this.actionRegistry.register('selectMap', () => this.openMapSelection(), {
            elementId: 'selectMapButton',
            description: 'Select a map'
        });

        // Plugin upload action
        const pluginFileInput = this.uiBinder.getInput('pluginFileInput');
        if (pluginFileInput) {
            this.actionRegistry.register('uploadPlugin', () => pluginFileInput.click(), {
                elementId: 'uploadPluginButton',
                description: 'Upload plugin'
            });

            // Handle plugin file selection
            this.listenerRegistry.registerListener('pluginFileInput', 'change', async (event) => {
                const file = event.target.files[0];
                if (file) {
                    try {
                        await this.pluginManager.initializePluginFromFile(file);
                        await ModalUtil.alert('Plugin uploaded and initialized successfully!');
                    } catch (error) {
                        await ModalUtil.alert(`Error loading plugin: ${error.message}`);
                    }
                }
            });
        }
    }


    async startHostGame() {
        const hostNameInput = document.getElementById('hostNameInput');
        const hostName = hostNameInput.value.trim();
        if (!hostName) {
            await ModalUtil.alert('Please enter your name.');
            return;
        }

        document.getElementById('startHostButton').disabled = true;
        this.showPage("loadingPage");

        // Initialize loading progress tracking
        const loadingBar = new LoadingBar('loadingPage');
        const progressTracker = new LoadingProgressTracker(LOADING_STAGES.HOST);

        progressTracker.onProgress((data) => {
            loadingBar.update(data);
            console.log(`[Loading] ${data.message} (${data.percent}%)`);
        });

        progressTracker.start();

        this.peer = new Host(hostName, this);
        await this.peer.init(progressTracker);
        this.pluginManager.setPeer(this.peer.peer);

        progressTracker.nextStage();

        // Create animations for UI components
        const animStart = performance.now();
        const timerAnimation = new TimerAnimation(true);
        console.log(`[Performance] Animations created in ${(performance.now() - animStart).toFixed(0)}ms`);

        // Configure UI components
        const timer = this.uiSystem.getComponent('timer');
        if (timer) {
            timer.animation = timerAnimation;
            timer.gameState = this.peer.gameState;
        }

        // Create game engine using factory
        const engineStart = performance.now();
        this.gameEngine = GameEngineFactory.create({
            gameState: this.peer.gameState,
            peerId: this.peer.peer.id,
            proposeGameState: (proposedGameState) => this.peer.updateAndBroadcastGameState(proposedGameState),
            eventBus: this.eventBus,
            registryManager: this.registryManager,
            factoryManager: this.factoryManager,
            isHost: true,
            uiSystem: this.uiSystem,
            gameLogManager: this.uiSystem.gameLogManager
        });
        console.log(`[Performance] Game engine created in ${(performance.now() - engineStart).toFixed(0)}ms`);

        progressTracker.nextStage();
        progressTracker.complete();

        this.showPage("lobbyPage");
        this.displayLobbyControls();
    }

    /**
     * Handles displaying the buttons and elements in the lobby
     */
    displayLobbyControls() {
        const closeGameButton = document.getElementById('closeGameButton');
        const startGameButton = document.getElementById('startGameButton');
        const selectMapButton = document.getElementById('selectMapButton');
        const openSettingsButton = document.getElementById('openSettingsButton');
        const uploadPluginButton = document.getElementById('uploadPluginButton');

        // Show host-specific buttons
        if (closeGameButton) closeGameButton.style.display = 'block';
        if (startGameButton) startGameButton.style.display = 'block';
        if (selectMapButton) selectMapButton.style.display = 'block';
        if (openSettingsButton) openSettingsButton.style.display = 'block';
        if (uploadPluginButton) uploadPluginButton.style.display = 'block';

        // Initialize map selection UI
        this.initializeMapSelectionUI();

        // Load the default or previously selected map
        this.loadInitialMap();

        // Conditionally show or hide the "Add Player" button
        this.updateAddPlayerButton();

        // Add settings button listener
        this.addSettingsButtonListener();
    }

    /**
     * Initialize the map selection UI component
     */
    initializeMapSelectionUI() {
        if (!this.mapSelectionUI) {
            this.mapSelectionUI = new MapSelectionUI({
                eventBus: this.eventBus,
                isHost: true,
                onMapSelected: async (mapId) => await this.handleMapSelected(mapId),
                onMapUploaded: (mapObject) => this.handleMapUploaded(mapObject)
            });
            this.mapSelectionUI.init();
        }
    }

    /**
     * Load the initial map (from localStorage or default)
     */
    async loadInitialMap() {
        const selectedMapId = MapStorageManager.getSelectedMapId();
        try {
            await this.loadMapById(selectedMapId);
        } catch (error) {
            console.error('Error loading initial map, falling back to default:', error);
            await this.loadMapById('default');
        }
    }

    /**
     * Open the map selection modal
     */
    openMapSelection() {
        if (this.mapSelectionUI) {
            this.mapSelectionUI.showMapSelectionModal();
        }
    }

    /**
     * Handle map selection
     * @param {string} mapId - Selected map ID
     */
    async handleMapSelected(mapId) {
        await this.loadMapById(mapId);
    }

    /**
     * Handle map upload
     * @param {Object} mapObject - Uploaded map object
     */
    handleMapUploaded(mapObject) {
        console.log('Map uploaded:', mapObject.name);
    }

    /**
     * Load a map by its ID
     * @param {string} mapId - Map ID to load
     */
    async loadMapById(mapId) {
        try {
            // Load the map data
            const mapData = await MapStorageManager.loadMapData(mapId);

            // Create board from map data
            const board = Board.fromJSON(mapData, this.factoryManager);

            // Update game state
            this.peer.gameState.board = board;
            this.peer.gameState.selectedMapId = mapId;
            this.peer.gameState.selectedMapData = mapData;

            // Reset all player positions to the new board's starting spaces
            this.peer.gameState.resetPlayerPositions();

            // Update UI
            this.uiSystem.getActiveBoard().setBoard(board);
            this.uiSystem.getActiveBoard().render();

            // Broadcast the updated game state to all clients
            this.peer.broadcastGameState();

            // Update host's UI components (including player list validation)
            this.updateGameState();

            console.log(`Map "${mapId}" loaded successfully`);
        } catch (error) {
            console.error('Error loading map:', error);
            throw error;
        }
    }

    startGame() {
        console.log('Host is starting the game...');
        if (this.peer) {
            this.peer.broadcastStartGame();
        }

        // Show game page first so DOM elements are available
        this.showPage("gamePage");

        // Switch UI context to game page
        this.uiSystem.switchContext('game');

        // Initialize game engine after page is shown
        this.gameEngine.init();

        // Clear and log game start
        this.uiSystem.gameLogManager?.clear();
        this.uiSystem.gameLogManager?.log('Game started', { type: 'system', source: 'ui' });

        this.updateGameState(true); //force update
    }

    /**
     * Add host-specific player list listeners (kick button)
     * Common listeners (edit, remove) are handled by BaseEventHandler
     */
    addRoleSpecificPlayerListeners() {
        // Register click listener for kick buttons (host only)
        document.querySelectorAll('.kick-button').forEach((button) => {
            const playerId = button.getAttribute('data-playerId');
            this.listenerRegistry.registerListener(button.id, 'click', () => {
                this.confirmAndKickPlayer(playerId);
            });
        });
    }
    

    async confirmAndKickPlayer(playerId) {
        const player = this.peer.gameState.players.find((p) => p.playerId === playerId);
        if (player) {
            const confirmed = await ModalUtil.confirm(
                `Are you sure you want to kick ${player.nickname}? This will disconnect all players associated with this player's client.`,
                'Kick Player'
            );
            if (confirmed) {
                this.peer.kickPlayer(player.peerId);
            }
        }
    }

    /**
     * Host implementation: Update locally and broadcast
     */
    async applyPlayerNameChange(_playerId, player, newName) {
        player.nickname = newName;
        this.updateGameState();
        this.peer.broadcastGameState();
    }

    /**
     * Host implementation: Remove locally and broadcast
     */
    async applyPlayerRemoval(playerId) {
        const playerIndex = this.peer.ownedPlayers.findIndex((p) => p.playerId === playerId);
        if (playerIndex !== -1) {
            const removedPlayer = this.peer.ownedPlayers.splice(playerIndex, 1)[0];
            this.peer.removePlayer(removedPlayer.playerId);
            this.peer.broadcastGameState();
            this.updateGameState();
            this.updateAddPlayerButton();
        }
    }

    async addPlayer() {
        const newName = await ModalUtil.prompt('Enter a new player name:', '', 'Add Player');
        if (newName && newName.trim() !== "") {
            this.peer.addNewOwnedPlayer(newName.trim());
        }
    }

    onSettingsChanged() {
        this.settingsManager.updateGameStateFromInputs(this.peer.gameState);
        this.peer.broadcastGameState();
        this.updateAddPlayerButton();
    }

    /**
     * Add listener for settings button
     */
    addSettingsButtonListener() {
        const openSettingsButton = document.getElementById('openSettingsButton');
        if (openSettingsButton) {
            this.listenerRegistry.registerListener('openSettingsButton', 'click', () => {
                this.settingsManager.showSettings();
            });
        }
    }


}
