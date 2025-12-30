import UISystem from '../../ui/UISystem.js';
import PieceManager from '../../infrastructure/managers/PieceManager.js';
import SettingsManager from '../../infrastructure/managers/SettingsManager.js';
import ModalUtil from '../../infrastructure/utils/ModalUtil.js';
import GameEngineFactory from '../../infrastructure/factories/GameEngineFactory.js';
import { MessageTypes } from '../networking/protocol/MessageTypes.js';
import PageRegistry from '../../infrastructure/registries/PageRegistry.js';
import ListenerRegistry from '../../infrastructure/registries/ListenerRegistry.js';

export default class BaseEventHandler {
    constructor(isHost, registryManager, pluginManager, factoryManager, eventBus, personalSettings, gameStateStorageManager = null) {
        this.registryManager = registryManager;
        this.pageRegistry = registryManager.getPageRegistry();
        if (!this.pageRegistry) {
            this.pageRegistry = new PageRegistry();
            registryManager.addRegistry('pageRegistry', this.pageRegistry);
        }

        this.listenerRegistry = registryManager.getListenerRegistry();
        if (!this.listenerRegistry) {
            this.listenerRegistry = new ListenerRegistry();
            registryManager.addRegistry('listenerRegistry', this.listenerRegistry);
        }
        this.pluginManager = pluginManager;
        this.factoryManager = factoryManager;
        this.eventBus = eventBus;
        this.personalSettings = personalSettings;
        this.gameStateStorageManager = gameStateStorageManager;
        this.isHost = isHost;

        this.inviteCode = document.getElementById('inviteCode');
        this.copyButton = document.getElementById('copyInviteCodeButton');

        // UI System - replaces old manager pattern
        this.uiSystem = null;

        // Remaining managers (to be componentized later)
        this.pieceManager = null;
        this.pieceManagerType = 'standard';
        this.settingsManager = null;

        this.gameEngine = null;
        this.peer = null; // This will be either client or host depending on the role
        this.handlePlayerAction = this.handlePlayerAction.bind(this);
        this.currentPageId = null;
        this.registerPagesFromDOM();

        // Plugin-registered event handlers
        this.pluginEventHandlers = new Map(); // eventName -> handler
    }

    init() {
        this.setupEventListeners();
        this.showPage(this.getInitialPage());
    }

    /**
     * Template method: Get the initial page to show
     * Must be implemented by subclasses
     * @returns {string} Page ID to show initially
     */
    getInitialPage() {
        throw new Error('getInitialPage must be implemented by subclass');
    }

    initManagers(peerId, hostPeerId) {
        this.peerId = peerId;
        this.hostPeerId = hostPeerId;

        // Initialize UI System
        this.uiSystem = new UISystem({
            eventBus: this.eventBus,
            factoryManager: this.factoryManager,
            personalSettings: this.personalSettings,
            isHost: this.isHost,
            peerId: peerId,
            hostPeerId: hostPeerId
        });
        this.uiSystem.init();

        // Initialize remaining managers
        this.setPieceManagerType('standard');
        this.settingsManager = new SettingsManager(this.isHost);

        // Setup PlayerListComponent event listeners
        this.setupPlayerListComponentListeners();
    }

    /**
     * Setup event listeners for PlayerListComponent events
     */
    setupPlayerListComponentListeners() {
        const lobbyPlayerList = this.uiSystem?.components?.lobbyPlayerList;
        const gamePlayerList = this.uiSystem?.components?.gamePlayerList;
        const lobbySpectatorList = this.uiSystem?.components?.lobbySpectatorList;

        if (lobbyPlayerList) {
            lobbyPlayerList.on('nicknameChange', ({ playerId, newNickname }) => {
                const ownedPlayer = this.getOwnedPlayer(playerId);
                if (ownedPlayer) {
                    this.applyPlayerNameChange(ownedPlayer.playerId, ownedPlayer, newNickname);
                }
            });

            lobbyPlayerList.on('colorChange', ({ playerId, newColor }) => {
                const ownedPlayer = this.getOwnedPlayer(playerId);
                if (ownedPlayer) {
                    this.applyPlayerColorChange(ownedPlayer.playerId, ownedPlayer, newColor);
                }
            });

            lobbyPlayerList.on('peerColorChange', ({ playerId, newPeerColor }) => {
                const ownedPlayer = this.getOwnedPlayer(playerId);
                if (ownedPlayer) {
                    this.applyPeerColorChange(ownedPlayer.playerId, ownedPlayer, newPeerColor);
                }
            });

            lobbyPlayerList.on('leaveGame', () => this.leaveGame());
            lobbyPlayerList.on('removePlayer', ({ playerId }) => this.removePlayer(playerId));

            this.setupRoleSpecificPlayerListComponentListeners(lobbyPlayerList);
        }

        if (gamePlayerList) {
            gamePlayerList.on('nicknameChange', ({ playerId, newNickname }) => {
                const ownedPlayer = this.getOwnedPlayer(playerId);
                if (ownedPlayer) {
                    this.applyPlayerNameChange(ownedPlayer.playerId, ownedPlayer, newNickname);
                }
            });

            gamePlayerList.on('colorChange', ({ playerId, newColor }) => {
                const ownedPlayer = this.getOwnedPlayer(playerId);
                if (ownedPlayer) {
                    this.applyPlayerColorChange(ownedPlayer.playerId, ownedPlayer, newColor);
                }
            });

            gamePlayerList.on('peerColorChange', ({ playerId, newPeerColor }) => {
                const ownedPlayer = this.getOwnedPlayer(playerId);
                if (ownedPlayer) {
                    this.applyPeerColorChange(ownedPlayer.playerId, ownedPlayer, newPeerColor);
                }
            });

            gamePlayerList.on('leaveGame', () => this.leaveGame());
            gamePlayerList.on('removePlayer', ({ playerId }) => this.removePlayer(playerId));

            this.setupRoleSpecificPlayerListComponentListeners(gamePlayerList);
        }

        if (lobbySpectatorList) {
            lobbySpectatorList.on('claimPeerSlot', ({ peerSlotId }) => {
                this.requestClaimPeerSlot(peerSlotId);
            });
            lobbySpectatorList.on('removeUnclaimedSlot', ({ peerSlotId }) => {
                this.requestRemoveUnclaimedSlot(peerSlotId);
            });
            lobbySpectatorList.on('viewUnclaimedInfo', ({ peerSlotId }) => {
                this.openPlayerInfoModal(peerSlotId);
            });
        }
    }

    requestClaimPeerSlot(peerSlotId) {
        if (!peerSlotId) return;

        if (this.isHost) {
            if (this.peer?.claimPeerSlot) {
                const success = this.peer.claimPeerSlot(peerSlotId, this.peer?.peer?.id);
                if (!success) {
                    ModalUtil?.alert?.('Unable to claim that slot. Check player limits or availability.');
                }
            }
            return;
        }

        const connection = this.peer?.conn;
        if (connection && connection.open) {
            connection.send({
                type: MessageTypes.CLAIM_PEER_SLOT,
                peerSlotId
            });
        } else {
            console.warn('[BaseEventHandler] Cannot claim player slot: no connection to host');
        }
    }

    requestRemoveUnclaimedSlot(peerSlotId) {
        if (!peerSlotId || !this.isHost) return;
        if (this.peer?.removePlayer) {
            this.peer.removePlayer(peerSlotId);
            if (Array.isArray(this.peer.gameState?.unclaimedPeerIds)) {
                this.peer.gameState.unclaimedPeerIds = this.peer.gameState.unclaimedPeerIds.filter(id => id !== peerSlotId);
            }
            this.peer.broadcastGameState?.();
            this.updateGameState(true);
        }
    }

    openPlayerInfoModal(playerId) {
        if (!playerId || !Array.isArray(this.peer?.gameState?.players)) return;
        const player = this.peer.gameState.players.find(p => p.playerId === playerId || p.peerId === playerId);
        if (!player) return;

        // Reuse the same modal used by player list
        if (!this.playerInfoModal) {
            const PlayerInfoModal = require('../../ui/modals/settings/PlayerInfoModal.js').default;
            this.playerInfoModal = new PlayerInfoModal('playerInfoModal', this.peer.gameState);
        }

        const viewer = this.getOwnedPlayer?.() || null;
        this.playerInfoModal.gameState = this.peer.gameState;
        this.playerInfoModal.open(player, viewer);
    }

    getOwnedPlayer(playerId) {
        const ownedPlayers = this.peer?.ownedPlayers;
        if (!ownedPlayers || ownedPlayers.length === 0) {
            return null;
        }

        if (!playerId) {
            return ownedPlayers[0];
        }

        return ownedPlayers.find(player => player.playerId === playerId) || null;
    }

    /**
     * Hook for role-specific PlayerListComponent event listeners
     * Override in subclasses (e.g., HostEventHandler)
     */
    setupRoleSpecificPlayerListComponentListeners(playerListComponent) {
        // Default: no additional listeners
    }

    setupEventListeners() {
        // Subclasses can extend or override this method to add specific listeners.
    }

    hideAllPages() {
        this.pageRegistry.hideAllPages();
    }

    showPage(pageId) {
        this.ensurePagesRegistered();
        this.pageRegistry?.showPage?.(pageId);
        this.updatePageVisibilityFallback(pageId);
        this.eventBus.emit('pageChanged', { pageId: pageId });
    }

    ensurePagesRegistered() {
        if (!this.pageRegistry) return;
        const defaultPageIds = ['homePage', 'hostPage', 'loadingPage', 'lobbyPage', 'gamePage'];
        defaultPageIds.forEach(id => {
            if (!this.pageRegistry.get(id)) {
                const el = document.getElementById(id);
                if (el) {
                    this.pageRegistry.register(id, el);
                }
            }
        });
    }

    registerPagesFromDOM() {
        if (!this.pageRegistry) return;
        const defaultPageIds = ['homePage', 'hostPage', 'loadingPage', 'lobbyPage', 'gamePage'];
        defaultPageIds.forEach(id => {
            const el = document.getElementById(id);
            if (el && !this.pageRegistry.get(id)) {
                this.pageRegistry.register(id, el);
            }
        });
    }

    updatePageVisibilityFallback(pageId) {
        const defaultPageIds = ['homePage', 'hostPage', 'loadingPage', 'lobbyPage', 'gamePage'];
        let updated = false;
        defaultPageIds.forEach(id => {
            const page = document.getElementById(id);
            if (page) {
                const value = id === pageId ? 'block' : 'none';
                page.style.display = value;
                if (page.setAttribute) {
                    page.setAttribute('style', `display: ${value};`);
                }
                updated = true;
            }
        });

        if (!updated) {
            const allPages = document.querySelectorAll('[id$="Page"]');
            if (allPages.length > 0) {
                allPages.forEach(page => {
                    const value = page.id === pageId ? 'block' : 'none';
                    page.style.display = value;
                    if (page.setAttribute) {
                        page.setAttribute('style', `display: ${value};`);
                    }
                });
                updated = true;
            }
        }

        if (!updated) {
            if (this.currentPageId) {
                const previous = document.getElementById(this.currentPageId);
                if (previous) {
                    previous.style.display = 'none';
                    if (previous.setAttribute) {
                        previous.setAttribute('style', 'display: none;');
                    }
                }
            }

            const next = document.getElementById(pageId);
            if (next) {
                next.style.display = 'block';
                if (next.setAttribute) {
                    next.setAttribute('style', 'display: block;');
                }
            }
        }

        this.currentPageId = pageId;
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
                    this.flashCopyButton();
                })
                .catch((err) => console.error('Failed to copy invite code:', err));
        }
    }

    flashCopyButton() {
        if (!this.copyButton) return;
        const originalText = this.copyButton.dataset.originalText || this.copyButton.textContent;
        this.copyButton.dataset.originalText = originalText;
        this.copyButton.textContent = 'Copied!';
        this.copyButton.classList.add('invite-copied');

        setTimeout(() => {
            this.copyButton.textContent = this.copyButton.dataset.originalText || 'Copy Invite Code';
            this.copyButton.classList.remove('invite-copied');
        }, 1500);
    }

    async leaveGame() {
        const owned = Array.isArray(this.peer?.ownedPlayers) ? [...this.peer.ownedPlayers] : [];
        for (const p of owned) {
            await this.applyPlayerRemoval(p.playerId);
        }
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
        if (
            this.settingsManager &&
            (forceUpdate || this.settingsManager.shouldUpdateSettings(gameState.settings))
        ) {
            this.settingsManager.updateSettings(gameState);
            this.updateAddPlayerButton();
            this.eventBus.emit('settingsUpdated', { gamestate: gameState });
        }

        const shouldRefreshPieces = forceUpdate || this.pieceManager?.shouldUpdatePieces?.(gameState);

        // Update UI components through UISystem before manipulating DOM-dependent managers
        this.uiSystem?.updateFromGameState?.(gameState);

        // Always refresh pieces after the board has been rendered so DOM stays in sync
        this.pieceManager?.updatePieces?.(gameState);
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

        this.updateAddPlayerButton();
    }

    updateAddPlayerButton() {
        const addPlayerButton = document.getElementById('addPlayerButton');
        const addPlayerButtonContainer = document.getElementById('addPlayerButtonContainer');

        // Early return if button doesn't exist
        if (!addPlayerButton) return;

        const setButtonVisibility = (visible) => {
            if (addPlayerButtonContainer) {
                addPlayerButtonContainer.style.display = visible ? 'flex' : 'none';
            }
            addPlayerButton.style.display = visible ? '' : 'none';
        };

        const gameState = this.peer?.gameState;
        const settings = gameState?.settings;
        const allPlayers = Array.isArray(gameState?.players) ? gameState.players : null;
        const playerLimitPerPeer = settings?.playerLimitPerPeer;
        const totalPlayerLimit = settings?.playerLimit;

        if (!allPlayers || playerLimitPerPeer === undefined || playerLimitPerPeer === null ||
            totalPlayerLimit === undefined || totalPlayerLimit === null) {
            setButtonVisibility(false);
            return;
        }

        const localPeerId = this.peerId || this.peer?.peer?.id || null;
        const ownedPlayersCount = localPeerId
            ? allPlayers.filter(player => player.peerId === localPeerId).length
            : this.peer?.ownedPlayers?.length || 0;

        const totalPlayersCount = allPlayers.length;
        const shouldShow = ownedPlayersCount < playerLimitPerPeer && totalPlayersCount < totalPlayerLimit;

        setButtonVisibility(shouldShow);
    }

    setPieceManagerType(type = 'standard') {
        if (this.pieceManagerType === type && this.pieceManager) {
            return;
        }

        if (this.pieceManager?.destroy) {
            this.pieceManager.destroy();
        }

        const registry = this.registryManager.getPieceManagerRegistry?.();
        const ManagerClass =
            registry?.get(type) ||
            registry?.get('standard') ||
            PieceManager;

        this.pieceManager = new ManagerClass({ eventBus: this.eventBus });
        this.pieceManagerType = type;
    }

    /**
     * Generic player action handler - plugins can trigger this via events
     * @param {Object} payload - Action payload
     * @param {string} payload.playerId - Player ID performing action
     * @param {string} payload.actionType - Type of action (e.g., 'SELECT_PIECE', 'ROLL_DICE')
     * @param {Object} payload.actionData - Additional data for the action
     */
    handlePlayerAction({ playerId, actionType, actionData = {} }) {
        if (!this.gameEngine || typeof this.gameEngine.onPlayerAction !== 'function') {
            console.warn('[BaseEventHandler] Cannot handle player action: no game engine');
            return;
        }

        if (!playerId || !actionType) {
            console.warn('[BaseEventHandler] Invalid player action: missing playerId or actionType');
            return;
        }

        if (this.isHost) {
            // Host processes action directly
            this.gameEngine.onPlayerAction(playerId, actionType, actionData);
        } else {
            // Client sends action to host
            const connection = this.peer?.conn;
            if (connection && connection.open) {
                connection.send({
                    type: MessageTypes.PLAYER_ACTION,
                    playerId,
                    actionType,
                    actionData
                });
            } else {
                console.warn('[BaseEventHandler] Cannot send player action: no connection to host');
            }
        }
    }

    /**
     * Register a plugin event handler
     * Allows plugins to hook into the event bus without modifying BaseEventHandler
     * @param {string} eventName - Event name to listen for
     * @param {Function} handler - Handler function
     */
    registerPluginEventHandler(eventName, handler) {
        if (this.pluginEventHandlers.has(eventName)) {
            console.warn(`[BaseEventHandler] Event handler for '${eventName}' already registered, replacing`);
        }

        const boundHandler = handler.bind(this);
        this.pluginEventHandlers.set(eventName, boundHandler);
        this.eventBus.on(eventName, boundHandler);

        console.log(`[BaseEventHandler] Registered plugin event handler: ${eventName}`);
    }

    /**
     * Unregister a plugin event handler
     * @param {string} eventName - Event name to stop listening for
     */
    unregisterPluginEventHandler(eventName) {
        const handler = this.pluginEventHandlers.get(eventName);
        if (handler) {
            this.eventBus.off(eventName, handler);
            this.pluginEventHandlers.delete(eventName);
            console.log(`[BaseEventHandler] Unregistered plugin event handler: ${eventName}`);
        }
    }

    createGameEngine(proposeGameStateFn) {
        if (!this.peer?.gameState || !this.peer?.peer?.id) {
            return null;
        }

        const proposer = proposeGameStateFn || this.buildDefaultProposeStateFn();
        if (typeof proposer !== 'function') {
            throw new Error('proposeGameState function is required to create a game engine');
        }

        if (this.gameEngine?.cleanup) {
            try {
                this.gameEngine.cleanup();
            } catch (error) {
                console.error('Error cleaning up previous game engine:', error);
            }
        }

        const engineStart = performance.now();
        const engineConfig = GameEngineFactory.extractEngineConfig(this.peer.gameState);
        this.gameEngine = GameEngineFactory.create({
            gameState: this.peer.gameState,
            peerId: this.peer.peer.id,
            proposeGameState: proposer,
            eventBus: this.eventBus,
            registryManager: this.registryManager,
            factoryManager: this.factoryManager,
            isHost: this.isHost,
            uiSystem: this.uiSystem,
            gameLogManager: this.uiSystem?.gameLogManager,
            autoSaveHandler: this.isHost ? this.buildAutoSaveHandler() : null
        }, { engineConfig });
        console.log(`[Performance] Game engine created in ${(performance.now() - engineStart).toFixed(0)}ms`);

        const pieceManagerType =
            this.gameEngine?.getPieceManagerType?.() ||
            this.gameEngine?.getEngineType?.() ||
            'standard';
        this.setPieceManagerType(pieceManagerType);

        return this.gameEngine;
    }

    buildDefaultProposeStateFn() {
        if (this.isHost) {
            return (newState) => this.peer?.updateAndBroadcastGameState?.(newState);
        }
        return (newState) => this.peer?.proposeGameState?.(newState);
    }

    buildAutoSaveHandler() {
        if (!this.gameStateStorageManager) {
            return null;
        }

        return (gameState, metadata = {}) => {
            this.gameStateStorageManager.saveGameState(gameState, {
                source: 'auto',
                reason: metadata.reason || metadata.trigger || 'auto',
                force: false
            });
        };
    }

    /**
     * Setup common player list listeners (edit, remove)
     * @deprecated Old DOM-based listener system - now handled by PlayerListComponent events
     * This method is kept for backwards compatibility but does nothing
     */
    addPlayerListListeners() {
        // Old button-based system has been replaced by PlayerListComponent events
        // Event listeners are now setup in setupPlayerListComponentListeners()
    }

    /**
     * Hook for role-specific player list listeners
     * @deprecated Old DOM-based listener system
     */
    addRoleSpecificPlayerListeners() {
        // Default: no additional listeners
    }

    /**
     * Edit a player's name
     * @deprecated This is now handled by PlayerControlModal via PlayerListComponent events
     */
    async editPlayerName(playerId) {
        // This method is kept for backwards compatibility but is no longer used
        // Player name editing is now handled through PlayerControlModal
    }

    /**
     * Remove a player
     * Calls applyPlayerRemoval() which subclasses implement differently
     */
    async removePlayer(playerId) {
        if (!playerId || !this.peer?.gameState?.players) {
            await ModalUtil.alert('Player not found.');
            return;
        }

        const target = this.peer.gameState.players.find(p => p.playerId === playerId);
        if (!target) {
            await ModalUtil.alert('Player not found.');
            return;
        }

        // Permission: host can remove anyone; clients can remove only their own
        if (!this.isHost && target.peerId !== this.peer?.peer?.id) {
            await ModalUtil.alert('You can only remove your own players.');
            return;
        }

        const message = `Are you sure you want to remove ${target.nickname}?`;
        const confirmed = await ModalUtil.confirm(message, 'Remove Player');
        if (!confirmed) return;

        if (this.isHost) {
            this.peer?.removePlayer?.(playerId);
            if (this.peer) {
                this.peer.previousGameStateJSON = null; // force full broadcast to sync spectators
            }
            this.peer?.broadcastGameState?.();
            this.updateGameState(true);
        } else {
            await this.applyPlayerRemoval(playerId);
        }
    }

    /**
     * Template method: Apply player name change
     * HOST: Updates locally and broadcasts
     * CLIENT: Sends message to host
     * @param {string} playerId - Player ID
     * @param {Object} player - Player object
     * @param {string} newName - New player name
     */
    async applyPlayerNameChange(playerId, player, newName) {
        throw new Error('applyPlayerNameChange must be implemented by subclass');
    }

    /**
     * Template method: Apply player color change
     * HOST: Updates locally and broadcasts
     * CLIENT: Sends message to host
     * @param {string} playerId - Player ID
     * @param {Object} player - Player object
     * @param {string} newColor - New player color (hex code)
     */
    async applyPlayerColorChange(playerId, player, newColor) {
        throw new Error('applyPlayerColorChange must be implemented by subclass');
    }

    /**
     * Template method: Apply peer color change
     * HOST: Updates locally and broadcasts
     * CLIENT: Sends message to host
     * @param {string} playerId - Player ID
     * @param {Object} player - Player object
     * @param {string} newPeerColor - New peer color (hex code)
     */
    async applyPeerColorChange(playerId, player, newPeerColor) {
        throw new Error('applyPeerColorChange must be implemented by subclass');
    }

    /**
     * Template method: Apply player removal
     * HOST: Removes locally and broadcasts
     * CLIENT: Sends message to host
     * @param {string} playerId - Player ID to remove
     */
    async applyPlayerRemoval(playerId) {
        throw new Error('applyPlayerRemoval must be implemented by subclass');
    }
}
