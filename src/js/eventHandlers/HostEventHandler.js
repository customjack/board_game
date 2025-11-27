import BaseEventHandler from './BaseEventHandler.js';
import Host from '../systems/networking/Host.js';
import TimerAnimation from '../animations/TimerAnimation.js';
import ModalUtil from '../infrastructure/utils/ModalUtil.js';
import UIBinder from './UIBinder.js';
import ActionRegistry from './ActionRegistry.js';
import { HOST_UI_BINDINGS } from '../config/ui-bindings.js';
import LoadingProgressTracker, { LOADING_STAGES } from '../infrastructure/utils/LoadingProgressTracker.js';
import LoadingBar from '../ui/LoadingBar.js';
import MapManagerModal from '../ui/modals/MapManagerModal.js';
import MapStorageManager from '../systems/storage/MapStorageManager.js';
import Board from '../elements/models/Board.js';
import GameStateFactory from '../infrastructure/factories/GameStateFactory.js';
import PluginLoadingModal from '../ui/modals/PluginLoadingModal.js';

export default class HostEventHandler extends BaseEventHandler {
    constructor(registryManager, pluginManager, factoryManager, eventBus, personalSettings, pluginManagerModal, personalSettingsModal, mapManagerModal) {
        super(true, registryManager, pluginManager, factoryManager, eventBus, personalSettings);

        // Initialize UI systems
        this.uiBinder = new UIBinder(HOST_UI_BINDINGS);
        this.actionRegistry = new ActionRegistry();
        this.mapManagerModal = mapManagerModal;
        this.pluginManagerModal = pluginManagerModal; // Plugin manager modal
        this.personalSettingsModal = personalSettingsModal;
    }

    init() {
        super.init();

        const hostPage = document.getElementById('hostPage');
        if (hostPage) {
            hostPage.style.display = 'block';
            hostPage.setAttribute?.('style', 'display: block;');
        }

        const homePage = document.getElementById('homePage');
        if (homePage && this.getInitialPage() !== 'homePage') {
            homePage.style.display = 'none';
            homePage.setAttribute?.('style', 'display: none;');
        }

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
        if (this.listenerRegistry) {
            this.actionRegistry.bindAll(this.listenerRegistry, this.uiBinder);
        }

        // Listen for plugin state changes and broadcast to clients
        this.eventBus.on('pluginStateChanged', (data) => {
            if (this.peer && this.peer.connections) {
                // Broadcast to all connected clients
                this.peer.connections.forEach(conn => {
                    conn.send({
                        type: 'pluginStateUpdate',
                        pluginStates: data.pluginStates
                    });
                });
                console.log('[Host] Broadcasting plugin state update to clients:', data.pluginStates);
            }
        });

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

        // Plugin manager action
        this.actionRegistry.register('uploadPlugin', () => this.openPluginManager(), {
            elementId: 'uploadPluginButton',
            description: 'Open plugin manager'
        });

        this.actionRegistry.register('openPluginList', () => this.openPluginManager(), {
            elementId: 'openPluginListButton',
            description: 'Open plugin list'
        });
    }

    /**
     * Open the plugin manager modal
     */
    openPluginManager() {
        if (this.pluginManagerModal) {
            this.pluginManagerModal.open();
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
        this.pluginManager.setEventHandler(this);

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
        this.createGameEngine((proposedGameState) => this.peer.updateAndBroadcastGameState(proposedGameState));

        progressTracker.nextStage();
        progressTracker.complete();

        this.showPage("lobbyPage");
        this.displayLobbyControls();
    }

    /**
     * Handles displaying the buttons and elements in the lobby
     */
    displayLobbyControls() {
        const getRealElement = (elementId) => {
            const element = document.getElementById(elementId);
            if (element && typeof element.nodeType === 'number' && element.nodeType === 1) {
                return element;
            }
            return null;
        };

        const setInlineDisplay = (elementId) => {
            const element = getRealElement(elementId);
            if (element) {
                element.style.display = 'inline';
                element.setAttribute?.('style', 'display: inline;');
            }
            return element;
        };

        const closeGameButton = setInlineDisplay('closeGameButton');
        const startGameButton = setInlineDisplay('startGameButton');
        const selectMapButton = setInlineDisplay('selectMapButton');
        const openSettingsButton = setInlineDisplay('openSettingsButton');

        // Support either legacy uploadBoardButton or new uploadPluginButton IDs
        setInlineDisplay('uploadPluginButton');
        setInlineDisplay('uploadBoardButton');

        const settingsSection = getRealElement('settingsSectionHost');
        if (settingsSection) {
            settingsSection.style.display = 'inline';
            settingsSection.setAttribute?.('style', 'display: inline;');
        }

        // Initialize map selection UI
        this.initializeMapManager();

        // Load the default or previously selected map
        this.loadInitialMap();

        // Conditionally show or hide the "Add Player" button
        this.updateAddPlayerButton();

        // Add settings button listener
        this.addSettingsButtonListener();
    }

    /**
     * Initialize the map manager modal
     */
    initializeMapManager() {
        if (this.mapManagerModal) {
            this.mapManagerModal.updateConfig({
                isHost: true,
                onMapSelected: async (mapId) => await this.handleMapSelected(mapId),
                onMapUploaded: (mapObject) => this.handleMapUploaded(mapObject),
                factoryManager: this.factoryManager
            });
            // It's already initialized in app.js
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
        if (this.mapManagerModal) {
            this.mapManagerModal.open();
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

            // Check for required plugins
            const requiredPlugins = this.pluginManager.extractPluginRequirements(mapData);
            const pluginCheck = this.pluginManager.checkPluginRequirements(requiredPlugins);

            if (!pluginCheck.allLoaded) {
                // Show plugin loading modal
                const pluginLoadingModal = new PluginLoadingModal(
                    'hostPluginLoadingModal',
                    this.pluginManager,
                    this.personalSettings,
                    { isHost: true }
                );
                pluginLoadingModal.init();
                pluginLoadingModal.setRequiredPlugins(pluginCheck.missing);

                const autoLoad = this.personalSettings?.getAutoLoadPlugins() ?? true;
                
                if (autoLoad) {
                    // Auto-load enabled, show modal and load
                    pluginLoadingModal.open();
                    await pluginLoadingModal.startLoading();
                    
                    // Re-check after loading
                    const recheck = this.pluginManager.checkPluginRequirements(requiredPlugins);
                    if (!recheck.allLoaded) {
                        await ModalUtil.alert(
                            `Some required plugins could not be loaded. The map may not work correctly.\n\nMissing: ${recheck.missing.map(p => p.id || p.name).join(', ')}`,
                            'Plugin Loading Warning'
                        );
                    }
                } else {
                    // Auto-load disabled, show modal and wait for user confirmation
                    const confirmed = await new Promise((resolve) => {
                        pluginLoadingModal.onComplete = () => resolve(true);
                        pluginLoadingModal.onCancel = () => resolve(false);
                        pluginLoadingModal.open();
                    });

                    if (!confirmed) {
                        throw new Error('Map loading cancelled by user');
                    }

                    // Re-check after loading
                    const recheck = this.pluginManager.checkPluginRequirements(requiredPlugins);
                    if (!recheck.allLoaded) {
                        throw new Error(`Required plugins not loaded: ${recheck.missing.map(p => p.id || p.name).join(', ')}`);
                    }
                }
            }

            // Create board from map data
            const board = Board.fromJSON(mapData, this.factoryManager);

            // Rebuild the game state so we can honor the board's preferred state type
            const previousState = this.peer.gameState;
            const newGameState = GameStateFactory.create({
                board,
                factoryManager: this.factoryManager,
                players: previousState?.players || [],
                settings: previousState?.settings,
                randomGenerator: previousState?.randomGenerator,
                selectedMapId: mapId,
                selectedMapData: mapData,
                pluginState: previousState?.pluginState || {}
            });

            newGameState.resetPlayerPositions?.();

            this.peer.gameState = newGameState;
            const hostPeerId = this.peer?.peer?.id || this.peer?.hostId || null;
            if (hostPeerId) {
                this.peer.ownedPlayers = newGameState.getPlayersByPeerId(hostPeerId);
            }

            // Recreate the game engine so metadata/engine type reflect the new board
            this.createGameEngine((proposedGameState) =>
                this.peer.updateAndBroadcastGameState(proposedGameState)
            );

            // Update UI
            const activeBoard = this.uiSystem.getActiveBoard();
            activeBoard.setBoard(board);
            activeBoard.render();

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

        // Re-create engine to honor latest board configuration
        this.createGameEngine();

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
     * @deprecated Old DOM-based listener system
     */
    addRoleSpecificPlayerListeners() {
        // Old button-based system has been replaced by PlayerListComponent events
    }

    /**
     * Setup host-specific PlayerListComponent event listeners
     * @override
     */
    setupRoleSpecificPlayerListComponentListeners(playerListComponent) {
        // Listen for host nickname change event
        playerListComponent.on('hostNicknameChange', ({ playerId, newNickname }) => {
            const player = this.peer.gameState.players.find(p => p.playerId === playerId);
            if (player) {
                this.applyPlayerNameChange(playerId, player, newNickname);
            }
        });

        playerListComponent.on('hostColorChange', ({ playerId, newColor }) => {
            const player = this.peer.gameState.players.find(p => p.playerId === playerId);
            if (player) {
                this.applyPlayerColorChange(playerId, player, newColor);
            }
        });

        playerListComponent.on('hostPeerColorChange', ({ playerId, newPeerColor }) => {
            const player = this.peer.gameState.players.find(p => p.playerId === playerId);
            if (player) {
                this.applyPeerColorChange(playerId, player, newPeerColor);
            }
        });

        // Listen for kick player event (confirmation already handled by modal)
        playerListComponent.on('kickPlayer', ({ playerId }) => {
            const player = this.peer.gameState.players.find(p => p.playerId === playerId);
            if (player) {
                this.peer.kickPlayer(player.peerId);
            }
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
     * Host implementation: Update color locally and broadcast
     */
    async applyPlayerColorChange(_playerId, player, newColor) {
        player.playerColor = newColor;
        this.updateGameState();
        this.peer.broadcastGameState();
    }

    /**
     * Host implementation: Update peer color locally and broadcast
     */
    async applyPeerColorChange(_playerId, player, newPeerColor) {
        const targetPeerId = player.peerId;

        this.peer.gameState.players.forEach(p => {
            if (p.peerId === targetPeerId) {
                p.peerColor = newPeerColor;
            }
        });

        this.peer.ownedPlayers
            .filter(p => p.peerId === targetPeerId)
            .forEach(p => {
                p.peerColor = newPeerColor;
            });

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
        if (openSettingsButton && this.listenerRegistry) {
            this.listenerRegistry.registerListener('openSettingsButton', 'click', () => {
                this.settingsManager?.showSettings?.();
            });
        }
    }


}
