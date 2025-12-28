import BaseEventHandler from './BaseEventHandler.js';
import Client from '../networking/Client.js';
import TimerAnimation from '../../animations/TimerAnimation.js';
import ModalUtil from '../../infrastructure/utils/ModalUtil.js';
import UIBinder from '../../ui/utils/UIBinder.js';
import ActionRegistry from '../../infrastructure/registries/ActionRegistry.js';
import { CLIENT_UI_BINDINGS } from '../../config/ui-bindings.js';
import LoadingProgressTracker, { LOADING_STAGES } from '../../infrastructure/utils/LoadingProgressTracker.js';
import LoadingBar from '../../ui/LoadingBar.js';
import PluginLoadingModal from '../../ui/modals/managers/PluginLoadingModal.js';
import { MessageTypes } from '../networking/protocol/MessageTypes.js';

export default class ClientEventHandler extends BaseEventHandler {
    constructor(
        registryManager,
        pluginManager,
        factoryManager,
        eventBus,
        personalSettings,
        pluginManagerModal,
        personalSettingsModal,
        gameStateStorageManager
    ) {
        super(false, registryManager, pluginManager, factoryManager, eventBus, personalSettings, gameStateStorageManager);

        // Initialize UI systems
        this.uiBinder = new UIBinder(CLIENT_UI_BINDINGS);
        this.actionRegistry = new ActionRegistry();
        this.pluginManagerModal = pluginManagerModal;
        this.personalSettingsModal = personalSettingsModal;
        
        // Track previous map ID to detect map changes
        this.previousMapId = null;
        this.previousPluginRequirementsHash = null;

        // Track in-flight plugin checks to avoid duplicate loading
        this.currentPluginCheck = null;
        this.currentPluginCheckKey = null;
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
        if (this.listenerRegistry) {
            this.actionRegistry.bindAll(this.listenerRegistry, this.uiBinder);
        }
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

        this.actionRegistry.register('openPluginList', () => this.openPluginManager(), {
            elementId: 'openPluginListButton',
            description: 'Open plugin list'
        });
    }

    async startJoinGame() {
        const gameCodeInput = document.getElementById('joinCodeInput');

        const gameCode = gameCodeInput.value.trim();

        if (!gameCode) {
            await ModalUtil.alert('Please enter a valid game code.');
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

        this.peer = new Client(null, gameCode, this);
        await this.peer.init(progressTracker);
        this.pluginManager.setPeer(this.peer.peer);
        this.pluginManager.setEventHandler(this);

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
        this.createGameEngine((proposedGameState) => this.peer.proposeGameState(proposedGameState));

        progressTracker.nextStage();
        progressTracker.complete();

        // Set initial map ID to trigger plugin check
        this.previousMapId = this.peer.gameState?.selectedMapId || null;
        this.previousPluginRequirementsHash = this.getRequirementsHash(this.peer.gameState?.pluginRequirements || []);
        
        // Don't show lobby page yet - wait for connection package
        // The connection package handler will show the appropriate page (lobby or game)
        // after the connection is properly established
        
        // Check plugins for current map if one is already selected
        // Wait for connection to be open before checking plugins
        if (this.peer.gameState?.selectedMapId && this.peer.conn) {
            if (this.peer.conn.open) {
                // Connection is already open
                this.checkAndLoadPlugins(this.peer.gameState);
            } else {
                // Wait for connection to open
                this.peer.conn.once('open', () => {
                    this.checkAndLoadPlugins(this.peer.gameState);
                });
            }
        }
    }

    displayLobbyControls() {
        const leaveGameButton = document.getElementById('leaveGameButton');
        const openSettingsButton = document.getElementById('openSettingsButton');
        const viewPluginListButton = document.getElementById('viewPluginListButton');

        // Show client-specific buttons
        if (leaveGameButton) leaveGameButton.style.display = 'block';
        if (openSettingsButton) openSettingsButton.style.display = 'block';
        if (viewPluginListButton) viewPluginListButton.style.display = 'block';

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

        // Re-create engine to ensure correct board-specific implementation
        this.createGameEngine((proposedGameState) => this.peer.proposeGameState(proposedGameState));

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
    
    /**
     * Override updateGameState to check for map changes and plugin requirements
     */
    updateGameState(forceUpdate = false) {
        const gameState = this.peer?.gameState;
        if (!gameState) {
            super.updateGameState(forceUpdate);
            return;
        }
        
        // Check if map has changed
        const currentMapId = gameState.selectedMapId;
        const mapChanged = this.previousMapId !== currentMapId;
        const requirementsHash = this.getRequirementsHash(gameState.pluginRequirements || []);
        const requirementsChanged = this.previousPluginRequirementsHash !== requirementsHash;
        
        if (mapChanged || requirementsChanged) {
            this.previousMapId = currentMapId;
            this.previousPluginRequirementsHash = requirementsHash;
            // Check plugins for new map or requirement change
            this.checkAndLoadPlugins(gameState);
        } else {
            // Keep previous values in sync even if no check was triggered
            this.previousMapId = currentMapId;
            this.previousPluginRequirementsHash = requirementsHash;
        }
        
        // Call parent update
        super.updateGameState(forceUpdate);
    }

    /**
     * Normalize plugin requirements for hashing/comparison
     */
    getRequirementsHash(requirements = []) {
        if (!requirements || requirements.length === 0) {
            return 'none';
        }

        const normalized = requirements.map(req => ({
            id: req.id || req.pluginId || req.name || '',
            version: req.version || '',
            source: req.source || '',
            cdn: req.cdn || req.url || ''
        })).sort((a, b) => (a.id || '').localeCompare(b.id || ''));

        return JSON.stringify(normalized);
    }
    
    /**
     * Check if client has required plugins and load if needed
     */
    async checkAndLoadPlugins(gameState) {
        const requiredPlugins = gameState?.pluginRequirements || [];
        const requirementsHash = this.getRequirementsHash(requiredPlugins);

        // Deduplicate concurrent checks for the same requirements
        if (this.currentPluginCheck && this.currentPluginCheckKey === requirementsHash) {
            return this.currentPluginCheck;
        }

        const checkPromise = (async () => {
            const isStale = () => {
                return requirementsHash !== this.getRequirementsHash(this.peer?.gameState?.pluginRequirements || []);
            };

            if (requiredPlugins.length === 0) {
                if (isStale()) return;
                // No plugins required, mark as ready
                if (this.peer?.gameState && this.peer?.peer?.id) {
                    this.peer.gameState.setPluginReadiness(this.peer.peer.id, true, []);
                    this.updateGameState();
                }
                this.sendPluginReadiness(true, []);
                return;
            }
            
            // Check which plugins are missing
            const pluginCheck = this.pluginManager.checkPluginRequirements(requiredPlugins);
            
            if (pluginCheck.allLoaded) {
                if (isStale()) return;
                // All plugins loaded, mark as ready
                if (this.peer?.gameState && this.peer?.peer?.id) {
                    this.peer.gameState.setPluginReadiness(this.peer.peer.id, true, []);
                    this.updateGameState();
                }
                this.sendPluginReadiness(true, []);
                return;
            }
            
            const missingPlugins = pluginCheck.missing.map(p => p.id || p.name || p.pluginId);
            
            // Mark as not ready while awaiting user confirmation/loading
            if (!isStale() && this.peer?.gameState && this.peer?.peer?.id) {
                const current = this.peer.gameState.getPluginReadiness(this.peer.peer.id);
                const alreadyPending =
                    current &&
                    current.ready === false &&
                    (current.missingPlugins || []).join(',') === missingPlugins.join(',');
                if (!alreadyPending) {
                    this.peer.gameState.setPluginReadiness(this.peer.peer.id, false, missingPlugins);
                    this.updateGameState();
                }
                this.sendPluginReadiness(false, missingPlugins);
            }
            
            // Show plugin loading modal
            const pluginLoadingModal = new PluginLoadingModal(
                'clientPluginLoadingModal',
                this.pluginManager,
                this.personalSettings,
                { isHost: false }
            );
            pluginLoadingModal.init();
            pluginLoadingModal.setRequiredPlugins(pluginCheck.missing);
            
            // Show modal and wait for completion (or cancellation)
            await new Promise((resolve) => {
                pluginLoadingModal.onComplete = (result) => {
                    if (isStale()) return resolve({ completed: false, stale: true });
                    // Re-check after loading completes (even if some failed)
                    const recheck = this.pluginManager.checkPluginRequirements(requiredPlugins);
                    const isReady = recheck.allLoaded;
                    const missingPlugins = isReady ? [] : recheck.missing.map(p => p.id || p.name || p.pluginId);
                    
                    // Update local game state immediately so UI reflects readiness
                    if (this.peer?.gameState && this.peer?.peer?.id) {
                        this.peer.gameState.setPluginReadiness(this.peer.peer.id, isReady, missingPlugins);
                        // Trigger UI update
                        this.updateGameState();
                    }
                    
                    // Send readiness to host
                    this.sendPluginReadiness(isReady, missingPlugins);
                    resolve({ completed: true, result });
                };
                pluginLoadingModal.onCancel = () => {
                    if (isStale()) return resolve({ completed: false, stale: true });
                    // User cancelled, mark as not ready
                    const missingPlugins = pluginCheck.missing.map(p => p.id || p.name);
                    
                    // Update local game state immediately
                    if (this.peer?.gameState && this.peer?.peer?.id) {
                        this.peer.gameState.setPluginReadiness(this.peer.peer.id, false, missingPlugins);
                        // Trigger UI update
                        this.updateGameState();
                    }
                    
                    // Send readiness to host
                    this.sendPluginReadiness(false, missingPlugins);
                    resolve({ completed: false });
                };
                pluginLoadingModal.open();
            });
        })();

        this.currentPluginCheck = checkPromise;
        this.currentPluginCheckKey = requirementsHash;

        try {
            return await checkPromise;
        } finally {
            if (this.currentPluginCheck === checkPromise) {
                this.currentPluginCheck = null;
                this.currentPluginCheckKey = null;
            }
        }
    }
    
    /**
     * Send plugin readiness status to host
     */
    sendPluginReadiness(ready, missingPlugins) {
        if (!this.peer?.conn) return;
        
        // Wait for connection to be open before sending
        if (!this.peer.conn.open) {
            // Wait for connection to open
            this.peer.conn.once('open', () => {
                this.peer.conn.send({
                    type: MessageTypes.PLUGIN_READINESS,
                    ready,
                    missingPlugins
                });
            });
        } else {
            // Connection is already open, send immediately
            this.peer.conn.send({
                type: MessageTypes.PLUGIN_READINESS,
                ready,
                missingPlugins
            });
        }
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
     * Client implementation: Send color change to host
     */
    async applyPlayerColorChange(playerId, _player, newColor) {
        console.log('[ClientEventHandler] applyPlayerColorChange called:', playerId, newColor);
        // Send color change to host - host will broadcast the update
        this.peer.conn.send({
            type: 'colorChange',
            playerId: playerId,
            newColor: newColor,
        });
        console.log('[ClientEventHandler] Color change message sent to host');
        // Note: Don't update locally - wait for host broadcast to ensure consistency
    }

    /**
     * Client implementation: Send peer color change to host
     */
    async applyPeerColorChange(playerId, _player, newPeerColor) {
        console.log('[ClientEventHandler] applyPeerColorChange called:', playerId, newPeerColor);
        // Send peer color change to host - host will broadcast the update
        this.peer.conn.send({
            type: 'peerColorChange',
            playerId: playerId,
            newPeerColor: newPeerColor,
        });
        console.log('[ClientEventHandler] Peer color change message sent to host');
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
        if (openSettingsButton && this.listenerRegistry) {
            this.listenerRegistry.registerListener('openSettingsButton', 'click', () => {
                this.settingsManager?.showSettings?.();
            });
        }
    }

    /**
     * Open the plugin manager modal
     */
    openPluginManager() {
        if (this.pluginManagerModal) {
            this.pluginManagerModal.open();
        }
    }
}
