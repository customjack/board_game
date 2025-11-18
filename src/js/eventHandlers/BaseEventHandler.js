import UISystem from '../ui/UISystem.js';
import PieceManager from '../controllers/managers/PieceManager';
import SettingsManager from '../controllers/managers/SettingsManager';
import ModalUtil from '../utils/ModalUtil.js';
import GameEngineFactory from '../factories/GameEngineFactory.js';
import { MessageTypes } from '../networking/protocol/MessageTypes.js';
import PageRegistry from '../registries/PageRegistry.js';
import ListenerRegistry from '../registries/ListenerRegistry.js';

export default class BaseEventHandler {
    constructor(isHost, registryManager, pluginManager, factoryManager, eventBus, personalSettings) {
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
        this.isHost = isHost;

        this.inviteCode = document.getElementById('inviteCode');
        this.copyMessage = document.getElementById('copyMessage');

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

            lobbyPlayerList.on('leaveGame', () => {
                const ownedPlayer = this.getOwnedPlayer();
                if (ownedPlayer) {
                    this.removePlayer(ownedPlayer.playerId);
                }
            });

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

            gamePlayerList.on('leaveGame', () => {
                const ownedPlayer = this.getOwnedPlayer();
                if (ownedPlayer) {
                    this.removePlayer(ownedPlayer.playerId);
                }
            });

            this.setupRoleSpecificPlayerListComponentListeners(gamePlayerList);
        }
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
        this.gameEngine = GameEngineFactory.create({
            gameState: this.peer.gameState,
            peerId: this.peer.peer.id,
            proposeGameState: proposer,
            eventBus: this.eventBus,
            registryManager: this.registryManager,
            factoryManager: this.factoryManager,
            isHost: this.isHost,
            uiSystem: this.uiSystem,
            gameLogManager: this.uiSystem?.gameLogManager
        });
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
        const playerIndex = this.peer.ownedPlayers.findIndex((p) => p.playerId === playerId);

        if (playerIndex !== -1) {
            const player = this.peer.ownedPlayers[playerIndex];

            if (this.peer.ownedPlayers.length === 1) {
                const confirmed = await ModalUtil.confirm(
                    `Are you sure you want to remove ${player.nickname}? This is your last player, so you will leave the game.`,
                    'Remove Player'
                );
                if (confirmed) {
                    this.leaveGame();
                }
            } else {
                const confirmed = await ModalUtil.confirm(
                    `Are you sure you want to remove ${player.nickname}?`,
                    'Remove Player'
                );
                if (confirmed) {
                    await this.applyPlayerRemoval(playerId);
                }
            }
        } else {
            await ModalUtil.alert('Player not found.');
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
