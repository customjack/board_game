import BaseEventHandler from './BaseEventHandler.js';
import Client from '../networking/Client.js';
import GameEngineFactory from '../factories/GameEngineFactory.js';
import TimerAnimation from '../animations/TimerAnimation.js';
import ModalUtil from '../utils/ModalUtil.js';
import UIBinder from './UIBinder.js';
import ActionRegistry from './ActionRegistry.js';
import { CLIENT_UI_BINDINGS } from '../config/ui-bindings.js';
import LoadingProgressTracker, { LOADING_STAGES } from '../utils/LoadingProgressTracker.js';
import LoadingBar from '../ui/LoadingBar.js';

export default class ClientEventHandler extends BaseEventHandler {
    constructor(registryManager, pluginManager, factoryManager, eventBus, personalSettings) {
        super(false, registryManager, pluginManager, factoryManager, eventBus, personalSettings);

        // Initialize UI systems
        this.uiBinder = new UIBinder(CLIENT_UI_BINDINGS);
        this.actionRegistry = new ActionRegistry();
    }

    /**
     * Client starts on the join page
     */
    getInitialPage() {
        return "joinPage";
    }

    setupEventListeners() {
        super.setupEventListeners();

        // Initialize UI binder (cache all elements)
        this.uiBinder.initialize();

        // Setup actions
        this.setupActions();

        // Bind all actions at once
        this.actionRegistry.bindAll(this.listenerRegistry, this.uiBinder);
    }

    /**
     * Setup actions using ActionRegistry
     */
    setupActions() {
        this.actionRegistry.register('joinGame', () => this.startJoinGame(), {
            elementId: 'startJoinButton',
            description: 'Join game'
        });

        this.actionRegistry.register('copyInvite', () => this.copyInviteCode(), {
            elementId: 'copyInviteCodeButton',
            description: 'Copy invite code to clipboard'
        });

        this.actionRegistry.register('leaveGame', () => this.leaveGame(), {
            elementId: 'leaveGameButton',
            description: 'Leave game'
        });

        this.actionRegistry.register('addPlayer', () => this.addNewOwnedPlayer(), {
            elementId: 'addPlayerButton',
            description: 'Add a new player'
        });
    }

    async startJoinGame() {
        const playerNameInput = document.getElementById('joinNameInput');
        const gameCodeInput = document.getElementById('joinCodeInput');

        const playerName = playerNameInput.value.trim();
        const gameCode = gameCodeInput.value.trim();

        if (!playerName || !gameCode) {
            await ModalUtil.alert('Please enter your name and a valid game code.');
            return;
        }

        const startJoinButton = this.uiBinder.getButton('joinGame') || document.getElementById('startJoinButton');
        if (startJoinButton) {
            startJoinButton.disabled = true;
        }
        this.showPage("loadingPage");

        // Initialize loading progress tracking
        const loadingBar = new LoadingBar('loadingPage');
        const progressTracker = new LoadingProgressTracker(LOADING_STAGES.CLIENT);

        progressTracker.onProgress((data) => {
            loadingBar.update(data);
            console.log(`[Loading] ${data.message} (${data.percent}%)`);
        });

        progressTracker.start();

        this.peer = new Client(playerName, gameCode, this);
        await this.peer.init(progressTracker);
        this.pluginManager.setPeer(this.peer.peer);

        progressTracker.nextStage();

        // Create animations for UI components
        const animStart = performance.now();
        const timerAnimation = new TimerAnimation(false);
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
            proposeGameState: (proposedGameState) => this.peer.proposeGameState(proposedGameState),
            eventBus: this.eventBus,
            registryManager: this.registryManager,
            factoryManager: this.factoryManager,
            isHost: false,
            uiSystem: this.uiSystem,
            gameLogManager: this.uiSystem.gameLogManager
        });
        console.log(`[Performance] Game engine created in ${(performance.now() - engineStart).toFixed(0)}ms`);

        progressTracker.nextStage();
        progressTracker.complete();

        this.showLobbyPage();
    }

    displayLobbyControls() {
        const leaveGameButton = document.getElementById('leaveGameButton');
        const openSettingsButton = document.getElementById('openSettingsButton');

        // Show client-specific buttons
        if (leaveGameButton) leaveGameButton.style.display = 'block';
        if (openSettingsButton) openSettingsButton.style.display = 'block';

        // Conditionally show or hide the "Add Player" button
        this.updateAddPlayerButton();

        // Add settings button listener
        this.addSettingsButtonListener();
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

    /**
     * Client implementation: Send name change to host
     */
    async applyPlayerNameChange(playerId, _player, newName) {
        // Send name change to host - host will broadcast the update
        this.peer.conn.send({
            type: 'nameChange',
            playerId: playerId,
            newName: newName,
        });
        // Note: Don't update locally - wait for host broadcast to ensure consistency
    }

    /**
     * Client implementation: Send removal request to host
     */
    async applyPlayerRemoval(playerId) {
        // Send remove request to host
        this.peer.conn.send({
            type: 'removePlayer',
            playerId: playerId
        });
        // Note: Don't remove locally - wait for host broadcast
    }

    async addNewOwnedPlayer() {
        const newName = await ModalUtil.prompt('Enter a new player name:', '', 'Add Player');
        if (newName && newName.trim() !== "") {
            this.peer.addNewOwnedPlayer(newName);
        }
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
