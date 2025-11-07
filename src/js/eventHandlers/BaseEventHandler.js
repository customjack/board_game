import UISystem from '../ui/UISystem.js';
import PieceManager from '../controllers/managers/PieceManager';
import SettingsManager from '../controllers/managers/SettingsManager';
import ModalUtil from '../utils/ModalUtil.js';

export default class BaseEventHandler {
    constructor(isHost, registryManager, pluginManager, factoryManager, eventBus) {
        this.registryManager = registryManager;
        this.pageRegistry = registryManager.getPageRegistry();
        this.listenerRegistry = registryManager.getListenerRegistry();
        this.pluginManager = pluginManager;
        this.factoryManager = factoryManager;
        this.eventBus = eventBus;
        this.isHost = isHost;

        this.inviteCode = document.getElementById('inviteCode');
        this.copyMessage = document.getElementById('copyMessage');

        // UI System - replaces old manager pattern
        this.uiSystem = null;

        // Remaining managers (to be componentized later)
        this.pieceManager = null;
        this.settingsManager = null;

        this.peer = null; // This will be either client or host depending on the role
    }

    init() {
        this.setupEventListeners();
    }

    initManagers(peerId, hostPeerId) {
        this.peerId = peerId;
        this.hostPeerId = hostPeerId;

        // Initialize UI System
        this.uiSystem = new UISystem({
            eventBus: this.eventBus,
            factoryManager: this.factoryManager,
            isHost: this.isHost,
            peerId: peerId,
            hostPeerId: hostPeerId
        });
        this.uiSystem.init();

        // Initialize remaining managers
        this.pieceManager = new PieceManager();
        this.settingsManager = new SettingsManager(this.isHost);
    }

    setupEventListeners() {
        // Subclasses can extend or override this method to add specific listeners.
    }

    hideAllPages() {
        this.pageRegistry.hideAllPages();
    }

    showPage(pageId) {
        this.pageRegistry.showPage(pageId);
        this.eventBus.emit('pageChanged', { pageId: pageId });
    }

    displayInviteCode(code) {
        const inviteCodeEl = document.getElementById('inviteCode');
        if (inviteCodeEl) inviteCodeEl.textContent = code;
    }

    copyInviteCode() {
        const inviteCode = this.inviteCode.textContent.trim();
        if (inviteCode) {
            navigator.clipboard
                .writeText(inviteCode)
                .then(() => {
                    this.showCopyMessage();
                })
                .catch((err) => console.error('Failed to copy invite code:', err));
        }
    }

    showCopyMessage() {
        this.copyMessage.style.display = 'inline';
        setTimeout(() => {
            this.copyMessage.style.display = 'none';
        }, 2000);
    }

    async leaveGame() {
        await ModalUtil.alert('You have left the game.');
        location.reload();
    }

    async handlePeerError(err) {
        await ModalUtil.alert('An error occurred: ' + err);
        this.showPage("homePage");
        location.reload();
    }

    updateGameState(forceUpdate = false) {
        const gameState = this.peer?.gameState;
        if (!gameState) return;

        // Update settings
        if (forceUpdate || this.settingsManager.shouldUpdateSettings(gameState.settings)) {
            this.settingsManager.updateSettings(gameState);
            this.updateAddPlayerButton();
            this.eventBus.emit('settingsUpdated', { gamestate: gameState });
        }

        const shouldRefreshPieces = forceUpdate || this.pieceManager.shouldUpdatePieces(gameState.players);

        // Update UI components through UISystem before manipulating DOM-dependent managers
        this.uiSystem.updateFromGameState(gameState);

        // Always refresh pieces after the board has been rendered so DOM stays in sync
        this.pieceManager.updatePieces(gameState);
        if (shouldRefreshPieces) {
            this.eventBus.emit('piecesUpdated', { gamestate: gameState });
        }

        // Add player list listeners after update
        this.addPlayerListListeners();

        // Update game engine
        if (this.gameEngine) {
            this.gameEngine.updateGameState(gameState);
            this.eventBus.emit('gameStateUpdated', { gamestate: gameState });
        }
    }

    updateAddPlayerButton() {
        const addPlayerButton = document.getElementById('addPlayerButton');

        // Early return if button doesn't exist
        if (!addPlayerButton) return;

        const gameState = this.peer?.gameState;
        const playerLimitPerPeer = gameState?.settings?.playerLimitPerPeer;
        const totalPlayerLimit = gameState?.settings?.playerLimit;
        const ownedPlayers = this.peer?.ownedPlayers;
        const allPlayers = gameState?.players;

        // Check all required data exists and has valid values
        if (!ownedPlayers || !allPlayers ||
            playerLimitPerPeer === undefined || playerLimitPerPeer === null ||
            totalPlayerLimit === undefined || totalPlayerLimit === null) {
            console.log('[AddPlayerButton] Hiding - missing data:', {
                hasOwnedPlayers: !!ownedPlayers,
                hasAllPlayers: !!allPlayers,
                playerLimitPerPeer,
                totalPlayerLimit
            });
            addPlayerButton.style.display = 'none';
            return;
        }

        // Show button only if both limits allow adding more players
        const shouldShow = ownedPlayers.length < playerLimitPerPeer && allPlayers.length < totalPlayerLimit;
        console.log('[AddPlayerButton]', shouldShow ? 'Showing' : 'Hiding', {
            ownedPlayersCount: ownedPlayers.length,
            playerLimitPerPeer,
            allPlayersCount: allPlayers.length,
            totalPlayerLimit
        });

        if (shouldShow) {
            addPlayerButton.style.display = 'block';
        } else {
            addPlayerButton.style.display = 'none';
        }
    }
}
