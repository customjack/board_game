import PlayerListManager from '../controllers/managers/PlayerListManager';
import BoardManager from '../controllers/managers/BoardManager';
import PieceManager from '../controllers/managers/PieceManager';
import SettingsManager from '../controllers/managers/SettingsManager';
import GameLogManager from '../controllers/managers/GameLogManager';

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

        // Managers will be initialized later when the lobby is connected
        this.boardManager = null;
        this.pieceManager = null;
        this.settingsManager = null;
        this.playerListManager = null;
        this.gameLogManager = null;

        this.peer = null; // This will be either client or host depending on the role
    }

    init() {
        this.setupEventListeners();
    }

    initManagers(peerId, hostPeerId) {
        this.peerId = peerId;
        this.hostPeerId = hostPeerId;

        // Initialize shared managers
        this.boardManager = new BoardManager();
        this.pieceManager = new PieceManager();
        this.settingsManager = new SettingsManager(this.isHost);
        this.playerListManager = new PlayerListManager(
            document.getElementById('lobbyPlayerList'),
            this.isHost,
            peerId,
            hostPeerId
        );

        if (!this.gameLogManager) {
            this.gameLogManager = new GameLogManager(this.eventBus);
        }
        this.gameLogManager.init('gameLogContainer');
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

    leaveGame() {
        alert('You have left the game.');
        location.reload();
    }

    handlePeerError(err) {
        alert('An error occurred: ' + err);
        this.showPage("homePage");
        location.reload();
    }

    updateGameState(forceUpdate = false) {
        this.updateSettings(forceUpdate);
        this.updateGameBoard(forceUpdate);
        this.updatePieces(forceUpdate);
        this.updatePlayerList(forceUpdate);

        if (this.gameEngine) {
            this.gameEngine.updateGameState(this.peer?.gameState);
            this.eventBus.emit('gameStateUpdated', { gamestate: this.peer?.gameState });
        }
    }

    updateSettings(forceUpdate = false) {
        const gameState = this.peer?.gameState;
        if (!gameState) return;
        if (forceUpdate || this.settingsManager.shouldUpdateSettings(gameState.settings)) {
            this.settingsManager.updateSettings(gameState);
            this.updateAddPlayerButton();
            this.eventBus.emit('settingsUpdated', { gamestate: gameState });
        }
    }

    updateGameBoard(forceUpdate = false) {
        const gameState = this.peer?.gameState;
        if (!gameState) return;

        if (forceUpdate || this.boardManager.shouldUpdateBoard(gameState.board)) {
            this.boardManager.setBoard(gameState.board);
            this.boardManager.drawBoard();
            this.updatePieces(true);
            this.eventBus.emit('boardUpdated', { gamestate: gameState });
        }
    }

    updatePieces(forceUpdate = false) {
        const gameState = this.peer?.gameState;
        if (!gameState) return;

        if (forceUpdate || this.pieceManager.shouldUpdatePieces(gameState.players)) {
            this.pieceManager.updatePieces(gameState);
            this.eventBus.emit('piecesUpdated', { gamestate: gameState });
        }
    }

    updatePlayerList(forceUpdate = false) {
        const gameState = this.peer?.gameState;
        if (!gameState) return;

        if (forceUpdate || this.playerListManager.shouldUpdatePlayers(gameState)) {
            this.playerListManager.setGameState(gameState);
            this.addPlayerListListeners();
            this.updateAddPlayerButton();
            this.eventBus.emit('piecesUpdated', { gamestate: gameState });
        }
    }

    updateAddPlayerButton() {
        const addPlayerButton = document.getElementById('addPlayerButton');

        const gameState = this.peer?.gameState;
        const playerLimitPerPeer = gameState?.settings?.playerLimitPerPeer;
        const totalPlayerLimit = gameState?.settings?.playerLimit;
        const ownedPlayers = this.peer?.ownedPlayers;
        const allPlayers = gameState?.players;

        if (ownedPlayers.length < playerLimitPerPeer && allPlayers.length < totalPlayerLimit) {
            addPlayerButton.style.display = 'block';
        } else {
            addPlayerButton.style.display = 'none';
        }
    }
}
