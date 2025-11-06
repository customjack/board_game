import BaseEventHandler from './BaseEventHandler';
import Client from '../networking/Client';
import GameEngineFactory from '../factories/GameEngineFactory.js';
import ParticleAnimation from '../animations/ParticleAnimation.js';
import TimerAnimation from '../animations/TimerAnimation.js';
import ModalUtil from '../utils/ModalUtil.js';

export default class ClientEventHandler extends BaseEventHandler {
    constructor(registryManager,pluginManager,factoryManager, eventBus) {
        super(false, registryManager,pluginManager,factoryManager, eventBus);
    }

    init() {
        super.init();
        this.showPage("joinPage");
    }

    setupEventListeners() {
        super.setupEventListeners();

        // Register listeners via ListenerRegistry
        this.listenerRegistry.registerListener('startJoinButton', 'click', () => this.startJoinGame());
        this.listenerRegistry.registerListener('copyInviteCodeButton', 'click', () => this.copyInviteCode());
        this.listenerRegistry.registerListener('leaveGameButton', 'click', () => this.leaveGame());
        this.listenerRegistry.registerListener('addPlayerButton', 'click', () => this.addNewOwnedPlayer());
    }

    async startJoinGame() {
        const playerNameInput = document.getElementById('joinNameInput');
        const gameCodeInput = document.getElementById('joinCodeInput');

        const playerName = playerNameInput.value.trim();
        const gameCode = gameCodeInput.value.trim();

        if (!playerName || !gameCode) {
            alert('Please enter your name and a valid game code.');
            return;
        }

        document.getElementById('startJoinButton').disabled = true;
        this.showPage("loadingPage");

        this.peer = new Client(playerName, gameCode, this);
        await this.peer.init();
        this.pluginManager.setPeer(this.peer.peer); //This isn't pretty but it passes the PeerJS instance

        // Create animations for UI components
        const particleAnimation = new ParticleAnimation();
        const timerAnimation = new TimerAnimation(false); // isHost = false

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
            proposeGameState: (proposedGameState) => this.peer.proposeGameState(proposedGameState),
            eventBus: this.eventBus,
            registryManager: this.registryManager,
            factoryManager: this.factoryManager,
            isHost: false,
            uiSystem: this.uiSystem,
            gameLogManager: this.uiSystem.gameLogManager
        });

        this.showLobbyPage();
    }

    displayLobbyControls() {
        const leaveGameButton = document.getElementById('leaveGameButton');
        const settingsSection = document.getElementById('settingsSectionClient');

        // Show or hide buttons based on conditions, e.g., game state or player limits
        if (leaveGameButton) leaveGameButton.style.display = 'inline';
        if (settingsSection) settingsSection.style.display = 'inline';

        // Conditionally show or hide the "Add Player" button
        this.updateAddPlayerButton();
    }

    showGamePage() {
        console.log('Client is switching to game page...');

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

    showLobbyPage() {
        this.showPage("lobbyPage");

        this.displayLobbyControls();

        this.updateGameState(true); //force update
    }

    updateDisplayedSettings() {
        if (this.playerLimitPerPeerDisplay) {
            this.playerLimitPerPeerDisplay.textContent = this.client.settings.playerLimitPerPeer;
        }
        if (this.totalPlayerLimitDisplay) {
            this.totalPlayerLimitDisplay.textContent = this.client.settings.playerLimit;
        }
        if (this.turnTimerDisplay) {
            this.turnTimerDisplay.textContent = this.client.settings.turnTimer;
        }
        if (this.moveDelayDisplay) {
            this.moveDelayDisplay.textContent = this.client.settings.moveDelay;
        }
        this.updateAddPlayerButton();
    }

    addPlayerListListeners() { 
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
    
    

    async editPlayerName(playerId) {
        const player = this.peer.ownedPlayers.find((p) => p.playerId === playerId);
        if (player) {
            const newName = await ModalUtil.prompt('Enter new name:', player.nickname, 'Edit Player Name');
            if (newName && newName.trim() !== '') {
                // Send name change to host - host will broadcast the update
                this.peer.conn.send({
                    type: 'nameChange',
                    playerId: playerId,
                    newName: newName.trim(),
                });
                // Note: Don't update locally - wait for host broadcast to ensure consistency
            }
        }
    }

    async addNewOwnedPlayer() {
        const newName = await ModalUtil.prompt('Enter a new player name:', '', 'Add Player');
        if (newName && newName.trim() !== "") {
            this.peer.addNewOwnedPlayer(newName);
        }
    }

    async removePlayer(playerId) {
        const playerIndex = this.peer.ownedPlayers.findIndex((p) => p.playerId === playerId);

        if (playerIndex !== -1) {
            if (this.peer.ownedPlayers.length === 1) {
                await ModalUtil.alert('You have removed your last player. Leaving the game.');
                this.leaveGame();
            } else {
                // Send remove request to host
                this.peer.conn.send({
                    type: 'removePlayer',
                    playerId: playerId
                });
                // Note: Don't remove locally - wait for host broadcast
            }
        } else {
            await ModalUtil.alert('Player not found.');
        }
    }
}
