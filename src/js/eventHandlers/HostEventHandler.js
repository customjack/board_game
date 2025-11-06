import BaseEventHandler from './BaseEventHandler';
import Host from '../networking/Host';
import GameEngineFactory from '../factories/GameEngineFactory.js';
import ParticleAnimation from '../animations/ParticleAnimation.js';
import TimerAnimation from '../animations/TimerAnimation.js';
import ModalUtil from '../utils/ModalUtil.js';

export default class HostEventHandler extends BaseEventHandler {
    constructor(registryManager,pluginManager,factoryManager, eventBus) {
        super(true, registryManager,pluginManager,factoryManager, eventBus);  // Initialize as host (isHost = true), peerId and hostPeerId will be set later
    }

    init() {
        super.init();
        this.showPage("hostPage");
    }

    setupEventListeners() {
        super.setupEventListeners();
    
        // Ensure all necessary DOM elements exist before registering listeners
        const startHostButton = document.getElementById('startHostButton');
        const copyInviteCodeButton = document.getElementById('copyInviteCodeButton');
        const closeGameButton = document.getElementById('closeGameButton');
        const startGameButton = document.getElementById('startGameButton');
        const addPlayerButton = document.getElementById('addPlayerButton');
        const uploadBoardButton = document.getElementById('uploadBoardButton');
        const fileInput = document.getElementById('boardFileInput');
        const uploadPluginButton = document.getElementById('uploadPluginButton');
        const pluginFileInput = document.getElementById('pluginFileInput');
    
        // Retrieve input elements from the SettingsManager
        const playerLimitPerPeerInput = document.getElementById('playerLimitPerPeerHost');
        const totalPlayerLimitInput = document.getElementById('totalPlayerLimitHost');
        const turnTimerInput = document.getElementById('turnTimerHost');
        const moveDelayInput = document.getElementById('moveDelayHost');
        const turnTimerEnabledCheckbox = document.getElementById('turnTimerEnabledHost');
    
        // Register listeners via ListenerRegistry if elements are defined
        if (startHostButton)
            this.listenerRegistry.registerListener('startHostButton', 'click', () => this.startHostGame());
        if (copyInviteCodeButton)
            this.listenerRegistry.registerListener('copyInviteCodeButton', 'click', () => this.copyInviteCode());
        if (closeGameButton)
            this.listenerRegistry.registerListener('closeGameButton', 'click', () => this.closeGame());
        if (startGameButton)
            this.listenerRegistry.registerListener('startGameButton', 'click', () => this.startGame());
        if (addPlayerButton)
            this.listenerRegistry.registerListener('addPlayerButton', 'click', () => this.addPlayer());
        if (uploadBoardButton && fileInput) {
            this.listenerRegistry.registerListener('uploadBoardButton', 'click', () => fileInput.click());
    
            // Register the file input change event listener
            this.listenerRegistry.registerListener('boardFileInput', 'change', async (event) => {
                const file = event.target.files[0];
                if (file) {
                    try {
                        await this.uiSystem.loadBoardFromFile(file);
                        this.peer.gameState.board = this.uiSystem.getActiveBoard().board;
                        this.peer.broadcastGameState(); // Broadcast after loading the board
                        this.updateGameState(true);

                        // Reset the file input so it can be triggered again if the same file is selected
                        event.target.value = ''; // Clear the file input field
                    } catch (error) {
                        alert(`Error loading board file: ${error.message}`);
                    }
                }
            });

        }

        // Plugin upload handling
        if (uploadPluginButton && pluginFileInput) {
            this.listenerRegistry.registerListener('uploadPluginButton', 'click', () => pluginFileInput.click());

            // Register the file input change event listener for plugins
            this.listenerRegistry.registerListener('pluginFileInput', 'change', async (event) => {
                const file = event.target.files[0];
                if (file) {
                    try {
                        await this.pluginManager.initializePluginFromFile(file);
                        alert('Plugin uploaded and initialized successfully!');
                    } catch (error) {
                        alert(`Error loading plugin: ${error.message}`);
                    }
                }
            });
        }
    
        // Helper function to add multiple event listeners for settings
        const addDelayedSettingsListener = (inputElement, eventHandler) => {
            if (inputElement) {
                this.listenerRegistry.registerListener(inputElement.id, 'change', eventHandler);
                this.listenerRegistry.registerListener(inputElement.id, 'blur', eventHandler);
                this.listenerRegistry.registerListener(inputElement.id, 'keydown', (event) => {
                    if (event.key === 'Enter') {
                        inputElement.blur(); // Trigger blur event
                        eventHandler();
                    }
                });
            }
        };
    
        // Register delayed event listeners for settings inputs
        if (playerLimitPerPeerInput) {
            addDelayedSettingsListener(playerLimitPerPeerInput, () => this.onSettingsChanged());
        }
        if (totalPlayerLimitInput) {
            addDelayedSettingsListener(totalPlayerLimitInput, () => this.onSettingsChanged());
        }
        if (turnTimerInput) {
            addDelayedSettingsListener(turnTimerInput, () => this.onSettingsChanged());
        }
        if (moveDelayInput) {
            addDelayedSettingsListener(moveDelayInput, () => this.onSettingsChanged());
        }
        if (turnTimerEnabledCheckbox) {
            this.listenerRegistry.registerListener('turnTimerEnabledHost', 'change', () => this.onSettingsChanged());
        }
    }
    

    async startHostGame() {
        const hostNameInput = document.getElementById('hostNameInput');
        const hostName = hostNameInput.value.trim();
        if (!hostName) {
            alert('Please enter your name.');
            return;
        }

        document.getElementById('startHostButton').disabled = true;
        this.showPage("loadingPage");

        this.peer = new Host(hostName, this);
        await this.peer.init();
        this.pluginManager.setPeer(this.peer.peer); //This isn't pretty but it passes the PeerJS instances

        // Create animations for UI components
        const particleAnimation = new ParticleAnimation();
        const timerAnimation = new TimerAnimation(true); // isHost = true

        // Configure UI components
        const rollButton = this.uiSystem.getComponent('rollButton');
        if (rollButton) {
            rollButton.setAnimation(particleAnimation);
        }

        const timer = this.uiSystem.getComponent('timer');
        if (timer) {
            timer.animation = timerAnimation;
            timer.gameState = this.peer.gameState;
        }

        // Create game engine using factory
        this.gameEngine = GameEngineFactory.create({
            gameState: this.peer.gameState,
            peerId: this.peer.peer.id,
            proposeGameState: (proposedGameState) => this.peer.updateAndBroadcastGameState(proposedGameState),
            eventBus: this.eventBus,
            registryManager: this.registryManager,
            factoryManager: this.factoryManager,
            isHost: true,
            uiSystem: this.uiSystem
        });

        this.showPage("lobbyPage");
        this.displayLobbyControls();
    }

    /**
     * Handles displaying the buttons and elements in the lobby
     */
    displayLobbyControls() {
        const closeGameButton = document.getElementById('closeGameButton');
        const startGameButton = document.getElementById('startGameButton');
        const uploadBoardButton = document.getElementById('uploadBoardButton');
        const settingsSection = document.getElementById('settingsSectionHost');

        // Show or hide buttons based on conditions, e.g., game state or player limits
        if (closeGameButton) closeGameButton.style.display = 'inline';
        if (startGameButton) startGameButton.style.display = 'inline';
        if (uploadBoardButton) uploadBoardButton.style.display = 'inline';
        if (settingsSection) settingsSection.style.display = 'inline';

        // Conditionally show or hide the "Add Player" button
        this.updateAddPlayerButton();
    }

    startGame() {
        console.log('Host is starting the game...');
        if (this.peer) {
            this.peer.broadcastStartGame();
        }
        this.gameEngine.init();
        this.showPage("gamePage");

        // Switch UI context to game page
        this.uiSystem.switchContext('game');

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
