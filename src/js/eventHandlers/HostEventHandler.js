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

    init() {
        super.init();
        this.showPage("hostPage");
    }

    setupEventListeners() {
        super.setupEventListeners();

        // Initialize UI binder (cache all elements)
        this.uiBinder.initialize();

        // Setup actions
        this.setupActions();

        // Bind all actions at once
        this.actionRegistry.bindAll(this.listenerRegistry, this.uiBinder);

        // Setup input bindings
        this.setupInputBindings();
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

        // Board upload action
        const boardFileInput = this.uiBinder.getInput('boardFileInput');
        if (boardFileInput) {
            this.actionRegistry.register('uploadBoard', () => boardFileInput.click(), {
                elementId: 'uploadBoardButton',
                description: 'Upload custom board'
            });

            // Handle board file selection
            this.listenerRegistry.registerListener('boardFileInput', 'change', async (event) => {
                const file = event.target.files[0];
                if (file) {
                    try {
                        await this.uiSystem.loadBoardFromFile(file);
                        this.peer.gameState.board = this.uiSystem.getActiveBoard().board;
                        this.peer.broadcastGameState();
                        this.updateGameState(true);
                        event.target.value = '';
                    } catch (error) {
                        await ModalUtil.alert(`Error loading board file: ${error.message}`);
                    }
                }
            });
        }

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

    /**
     * Setup input bindings using UIBinder
     */
    setupInputBindings() {
        // Settings inputs
        this.uiBinder.bindInput('playerLimitPerPeer', () => this.onSettingsChanged());
        this.uiBinder.bindInput('totalPlayerLimit', () => this.onSettingsChanged());
        this.uiBinder.bindInput('turnTimer', () => this.onSettingsChanged());
        this.uiBinder.bindInput('moveDelay', () => this.onSettingsChanged());
        this.uiBinder.bindInput('modalTimeout', () => this.onSettingsChanged());

        // Turn timer enabled checkbox
        const turnTimerCheckbox = this.uiBinder.getInput('turnTimerEnabled');
        if (turnTimerCheckbox) {
            this.listenerRegistry.registerListener('turnTimerEnabledHost', 'change', () => this.onSettingsChanged());
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
        const uploadBoardButton = document.getElementById('uploadBoardButton');
        const settingsSection = document.getElementById('settingsSectionHost');

        // Show or hide buttons based on conditions, e.g., game state or player limits
        if (closeGameButton) closeGameButton.style.display = 'inline';
        if (startGameButton) startGameButton.style.display = 'inline';
        if (selectMapButton) selectMapButton.style.display = 'inline';
        if (uploadBoardButton) uploadBoardButton.style.display = 'inline';
        if (settingsSection) settingsSection.style.display = 'inline';

        // Initialize map selection UI
        this.initializeMapSelectionUI();

        // Load the default or previously selected map
        this.loadInitialMap();

        // Conditionally show or hide the "Add Player" button
        this.updateAddPlayerButton();
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
            const board = Board.fromJSON(mapData);

            // Update game state
            this.peer.gameState.board = board;
            this.peer.gameState.selectedMapId = mapId;
            this.peer.gameState.selectedMapData = mapData;

            // Update UI
            this.uiSystem.getActiveBoard().setBoard(board);
            this.uiSystem.getActiveBoard().render();

            // Broadcast the updated game state to all clients
            this.peer.broadcastGameState();

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

    addPlayerListListeners() {
        // Register click listener for kick buttons
        document.querySelectorAll('.kick-button').forEach((button) => {
            const playerId = button.getAttribute('data-playerId');
            this.listenerRegistry.registerListener(button.id, 'click', () => {
                this.confirmAndKickPlayer(playerId);
            });
        });
    
        // Register click listener for edit buttons
        document.querySelectorAll('.edit-button').forEach((button) => {
            const playerId = button.getAttribute('data-playerId');
            this.listenerRegistry.registerListener(button.id, 'click', () => {
                this.editPlayerName(playerId);
            });
        });
    
        // Register click listener for remove buttons
        document.querySelectorAll('.remove-button').forEach((button) => {
            const playerId = button.getAttribute('data-playerId');
            this.listenerRegistry.registerListener(button.id, 'click', () => {
                this.removePlayer(playerId);
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

    async editPlayerName(playerId) {
        const player = this.peer.ownedPlayers.find((p) => p.playerId === playerId);
        if (player) {
            const newName = await ModalUtil.prompt('Enter new name:', player.nickname, 'Edit Player Name');
            if (newName && newName.trim() !== '') {
                player.nickname = newName;
                this.updateGameState();
                this.peer.broadcastGameState();
            }
        }
    }

    async removePlayer(playerId) {
        const playerIndex = this.peer.ownedPlayers.findIndex((p) => p.playerId === playerId);

        if (playerIndex !== -1) {
            if (this.peer.ownedPlayers.length === 1) {
                await ModalUtil.alert('You have removed your last player. Leaving the game.');
                this.leaveGame();
            } else {
                const removedPlayer = this.peer.ownedPlayers.splice(playerIndex, 1)[0];
                this.peer.removePlayer(removedPlayer.playerId);

                this.peer.broadcastGameState();
                this.updateGameState();
                this.updateAddPlayerButton();
            }
        } else {
            await ModalUtil.alert('Player not found.');
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

    
}
