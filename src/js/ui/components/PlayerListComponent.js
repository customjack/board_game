/**
 * PlayerListComponent - Displays the list of players
 *
 * Shows player information including names, colors, badges (Host/You),
 * and action buttons (info, settings)
 */
import BaseUIComponent from '../BaseUIComponent.js';
import GameStateFactory from '../../../infrastructure/factories/GameStateFactory.js';
import { createInfoIcon, createGearIcon, createIconButton } from '../utils/IconUtils.js';
import PlayerInfoModal from '../../deprecated/legacy/controllers/modals/PlayerInfoModal.js';
import PlayerControlModal from '../../deprecated/legacy/controllers/modals/PlayerControlModal.js';
import HostPlayerControlModal from '../../deprecated/legacy/controllers/modals/HostPlayerControlModal.js';

// Shared modal instances (singletons) across all PlayerListComponent instances
let sharedPlayerInfoModal = null;
let sharedPlayerControlModal = null;
let sharedHostPlayerControlModal = null;

export default class PlayerListComponent extends BaseUIComponent {
    /**
     * Create a player list component
     * @param {Object} config - Component configuration
     * @param {boolean} config.isHost - Whether current user is host
     * @param {string} config.currentPlayerPeerId - Current user's peer ID
     * @param {string} config.hostPeerId - Host's peer ID
     */
    constructor(config = {}) {
        super({
            id: 'playerList',
            containerId: config.listElementId || 'lobbyPlayerList',
            ...config
        });

        this.isHost = config.isHost || false;
        this.currentPlayerPeerId = config.currentPlayerPeerId || null;
        this.hostPeerId = config.hostPeerId || null;
        this.gameState = null;
        this.allowPlayerColorChange = true;
        this.allowPeerColorChange = true;

        // Store list element ID for switching contexts (lobby vs game)
        this.currentListElementId = config.listElementId || 'lobbyPlayerList';

        // Use shared modal instances
        this.playerInfoModal = null;
        this.playerControlModal = null;
        this.hostPlayerControlModal = null;
    }

    /**
     * Initialize the component
     */
    init() {
        super.init();

        if (!this.container) {
            console.warn(`Player list element ${this.currentListElementId} not found`);
        }

        // Initialize modals
        this.initModals();
    }

    /**
     * Initialize player modals (using shared singletons)
     */
    initModals() {
        // Only create modals once (singleton pattern)
        if (!sharedPlayerInfoModal) {
            sharedPlayerInfoModal = new PlayerInfoModal('playerInfoModal', this.gameState);
        }

        if (!sharedPlayerControlModal) {
            sharedPlayerControlModal = new PlayerControlModal(
                'playerControlModal',
                null, // Will be set when opened
                (playerId, newNickname) => this.handleNicknameChange(playerId, newNickname),
                (playerId, newColor) => this.handleColorChange(playerId, newColor),
                (playerId, newPeerColor) => this.handlePeerColorChange(playerId, newPeerColor),
                () => this.handleLeaveGame()
            );
        }

        if (!sharedHostPlayerControlModal) {
            sharedHostPlayerControlModal = new HostPlayerControlModal(
                'hostPlayerControlModal',
                null, // Will be set when opened
                (playerId, newNickname) => this.handleHostNicknameChange(playerId, newNickname),
                (playerId) => this.handleKickPlayer(playerId),
                (playerId, newColor) => this.handleHostColorChange(playerId, newColor),
                (playerId, newPeerColor) => this.handleHostPeerColorChange(playerId, newPeerColor)
            );
        }

        // Reference the shared instances
        this.playerInfoModal = sharedPlayerInfoModal;
        this.playerControlModal = sharedPlayerControlModal;
        this.hostPlayerControlModal = sharedHostPlayerControlModal;
    }

    /**
     * Handle nickname change (player changing their own name)
     * @param {string} playerId - Player being updated
     * @param {string} newNickname - New nickname
     */
    handleNicknameChange(playerId, newNickname) {
        this.emit('nicknameChange', { playerId, newNickname });
    }

    /**
     * Handle color change (player changing their own color)
     * @param {string} playerId - Player being updated
     * @param {string} newColor - New color hex code
     */
    handleColorChange(playerId, newColor) {
        this.emit('colorChange', { playerId, newColor });
    }

    /**
     * Handle peer color change (player changing their own border color)
     * @param {string} playerId - Player being updated
     * @param {string} newPeerColor - New peer color hex code
     */
    handlePeerColorChange(playerId, newPeerColor) {
        this.emit('peerColorChange', { playerId, newPeerColor });
    }

    /**
     * Handle host changing a player's nickname
     * @param {string} playerId - Target player ID
     * @param {string} newNickname - New nickname
     */
    handleHostNicknameChange(playerId, newNickname) {
        this.emit('hostNicknameChange', { playerId, newNickname });
    }

    handleHostColorChange(playerId, newColor) {
        this.emit('hostColorChange', { playerId, newColor });
    }

    handleHostPeerColorChange(playerId, newPeerColor) {
        this.emit('hostPeerColorChange', { playerId, newPeerColor });
    }

    /**
     * Handle leave game (player leaving)
     */
    handleLeaveGame() {
        this.emit('leaveGame', {});
    }

    /**
     * Handle kick player (host kicking a player)
     * @param {string} playerId - Player ID to kick
     */
    handleKickPlayer(playerId) {
        this.emit('kickPlayer', { playerId });
    }

    /**
     * Set the list element (e.g., switch between lobby and game lists)
     * @param {string} elementId - New list element ID
     */
    setListElement(elementId) {
        this.currentListElementId = elementId;
        this.containerId = elementId;
        this.container = this.getElement(elementId, false); // Don't cache, force fresh lookup
        this.elements = {}; // Clear element cache
    }

    /**
     * Set whether current user is host
     * @param {boolean} isHost - Host status
     */
    setIsHost(isHost) {
        this.isHost = isHost;
    }

    /**
     * Update the player list display
     * @param {GameState} gameState - Current game state
     * @param {Object} context - Additional context
     */
    update(gameState, context = {}) {
        if (!this.initialized) return;

        // Check if we need to update
        if (!this.shouldUpdate(gameState)) {
            return;
        }

        // Store a deep copy of game state
        this.gameState = GameStateFactory.fromJSON(gameState.toJSON(), gameState.factoryManager);

        const settings = this.gameState.settings;
        this.allowPlayerColorChange = settings?.allowPlayerColorChange !== false;
        this.allowPeerColorChange = settings?.allowPeerColorChange !== false;

        if (this.playerControlModal?.setColorPermissions) {
            this.playerControlModal.setColorPermissions(
                this.getPlayerColorPermissions(this.currentPlayerPeerId)
            );
        }

        // Re-render player list
        this.render();
    }

    /**
     * Check if player list needs updating
     * @param {GameState} newGameState - New game state
     * @returns {boolean} True if update needed
     */
    shouldUpdate(newGameState) {
        if (!this.gameState) {
            return true; // First render
        }

        const oldPlayers = this.gameState.players;
        const newPlayers = newGameState.players;

        // Check player count
        if (oldPlayers.length !== newPlayers.length) {
            return true;
        }

        // Create map for quick lookup
        const currentPlayersMap = new Map();
        oldPlayers.forEach(player => {
            currentPlayersMap.set(player.playerId, player);
        });

        // Compare each player
        for (let newPlayer of newPlayers) {
            const currentPlayer = currentPlayersMap.get(newPlayer.playerId);
            if (!currentPlayer) {
                return true; // New player
            }

            // Compare relevant properties
            if (
                currentPlayer.nickname !== newPlayer.nickname ||
                currentPlayer.peerId !== newPlayer.peerId ||
                currentPlayer.playerColor !== newPlayer.playerColor ||
                currentPlayer.peerColor !== newPlayer.peerColor ||
                currentPlayer.turnsTaken !== newPlayer.turnsTaken
            ) {
                return true;
            }
        }

        // Check current player turn change
        if (this.gameState.currentPlayerId !== newGameState.currentPlayerId) {
            return true;
        }

        // Check if board changed (important for validation rules)
        if (this.gameState.board?.metadata?.name !== newGameState.board?.metadata?.name) {
            return true;
        }

        const prevSettings = this.gameState.settings;
        const nextSettings = newGameState.settings;
        if (
            prevSettings?.allowPlayerColorChange !== nextSettings?.allowPlayerColorChange ||
            prevSettings?.allowPeerColorChange !== nextSettings?.allowPeerColorChange
        ) {
            return true;
        }

        return false;
    }

    /**
     * Render the player list
     */
    render() {
        // Refresh container reference if needed
        if (!this.container) {
            this.container = this.getElement(this.currentListElementId, false);
        }

        if (!this.container) {
            console.warn('Cannot render player list - container not found');
            return;
        }

        // Clear existing content
        this.container.innerHTML = '';

        if (!this.gameState) {
            return;
        }

        // Render each player
        const players = this.gameState.players;
        players.forEach(player => {
            const playerElement = this.createPlayerElement(player);
            this.container.appendChild(playerElement);
        });

        // Add player count validation indicator
        this.renderPlayerCountValidation(players.length);

        this.emit('playerListRendered', { playerCount: players.length });
    }

    /**
     * Render player count validation indicator
     * @param {number} playerCount - Current number of players
     */
    renderPlayerCountValidation(playerCount) {
        // Only show in lobby, not in-game
        if (this.currentListElementId !== 'lobbyPlayerList') {
            return;
        }

        if (!this.gameState?.board?.gameRules) {
            return; // No validation rules available
        }

        const validation = this.gameState.board.gameRules.validatePlayerCount(playerCount);

        // Find the parent section (lobbyPlayerListSection) and insert before h3
        const section = document.getElementById('lobbyPlayerListSection');
        if (!section) return;

        // Remove existing validation indicator
        const existingIndicator = section.querySelector('.player-count-validation');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Create validation indicator
        const indicator = document.createElement('div');
        indicator.className = `player-count-validation validation-${validation.status}`;

        let icon = '';
        let colorClass = '';
        let statusText = '';

        switch (validation.status) {
            case 'invalid':
                icon = '❌';
                colorClass = 'invalid';
                statusText = 'Player Count: Invalid';
                break;
            case 'warning':
                icon = '⚠️';
                colorClass = 'warning';
                statusText = 'Player Count: Acceptable';
                break;
            case 'valid':
                icon = '✓';
                colorClass = 'valid';
                statusText = `Player Count: ${playerCount} player${playerCount !== 1 ? 's' : ''}`;
                break;
        }

        indicator.innerHTML = `
            <div class="validation-icon ${colorClass}">${icon}</div>
            <div class="validation-content">
                <div class="validation-status">${statusText}</div>
                ${validation.messages.length > 0 ? `
                    <div class="validation-messages">
                        ${validation.messages.map(msg => `<div class="validation-message">${msg}</div>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Insert before the h3 "Connected Players"
        const heading = section.querySelector('h3');
        if (heading) {
            section.insertBefore(indicator, heading);
        } else {
            section.prepend(indicator);
        }
    }

    getPlayerColorPermissions(peerId) {
        const hostPeerId = this.hostPeerId || this.currentPlayerPeerId;
        const isHostEditingOwnPlayer = this.isHost && hostPeerId && peerId === hostPeerId;
        const isCurrentPeer = peerId === this.currentPlayerPeerId;

        if (!isHostEditingOwnPlayer && (!this.isHost || !isCurrentPeer)) {
            return {
                playerColor: this.allowPlayerColorChange,
                peerColor: this.allowPeerColorChange
            };
        }

        // Hosts can always edit their own players regardless of settings
        return {
            playerColor: true,
            peerColor: true
        };
    }

    /**
     * Create a player element
     * @param {Player} player - Player object
     * @returns {HTMLElement} Player list item element
     */
    createPlayerElement(player) {
        const li = document.createElement('li');
        li.className = 'player-container';

        const playerNameBadges = document.createElement('div');
        playerNameBadges.className = 'player-name-badges';

        const playerColor = player.playerColor || '#FFFFFF';
        const peerBorderColor = player.peerColor || '#FFFFFF';

        // Player name with color
        let nameHtml = `<span class="player-name" style="color:${playerColor}; font-weight: bold;">${player.nickname}</span>`;

        // Host badge
        if (player.peerId === this.hostPeerId) {
            nameHtml += `<span class="host-badge">Host</span>`;
        }

        // You badge
        if (player.peerId === this.currentPlayerPeerId) {
            nameHtml += `<span class="you-badge">You</span>`;
        }

        playerNameBadges.innerHTML = nameHtml;
        li.style.border = `2px solid ${peerBorderColor}`;

        // Player action buttons
        const playerButtons = document.createElement('div');
        playerButtons.className = 'player-buttons';

        // Info button - shows stats/inventory for any player
        const infoButton = createIconButton(
            createInfoIcon(20),
            'View player info',
            () => this.openPlayerInfo(player),
            'icon-btn-info'
        );
        playerButtons.appendChild(infoButton);

        // Gear button for players you control (self-management)
        if (player.peerId === this.currentPlayerPeerId) {
            const gearButton = createIconButton(
                createGearIcon(20),
                'Player settings',
                () => this.openPlayerControl(player),
                'icon-btn-settings'
            );
            playerButtons.appendChild(gearButton);
        }

        // Gear button for host on all other players (host management)
        if (this.isHost && player.peerId !== this.currentPlayerPeerId) {
            const hostGearButton = createIconButton(
                createGearIcon(20),
                'Manage player',
                () => this.openHostPlayerControl(player),
                'icon-btn-settings'
            );
            playerButtons.appendChild(hostGearButton);
        }

        // Highlight current turn
        if (this.gameState.isGameStarted() &&
            this.gameState.getCurrentPlayer().playerId === player.playerId) {
            li.classList.add('current-turn');
        }

        li.appendChild(playerNameBadges);
        li.appendChild(playerButtons);

        return li;
    }

    /**
     * Open player info modal to view stats/inventory
     * @param {Player} player - Player to view
     */
    openPlayerInfo(player) {
        if (!this.playerInfoModal) {
            console.warn('Player info modal not initialized');
            return;
        }

        // Find the viewer (current player)
        const viewer = this.gameState.players.find(p => p.peerId === this.currentPlayerPeerId);

        // Update modal with current game state
        this.playerInfoModal.gameState = this.gameState;
        this.playerInfoModal.open(player, viewer);
    }

    /**
     * Open player control modal (self-management)
     * @param {Player} player - Player to control
     */
    openPlayerControl(player) {
        if (!this.playerControlModal) {
            console.warn('Player control modal not initialized');
            return;
        }

        this.playerControlModal.player = player;
        if (this.playerControlModal.setColorPermissions) {
            this.playerControlModal.setColorPermissions(
                this.getPlayerColorPermissions(player.peerId)
            );
        }
        this.playerControlModal.open();
    }

    /**
     * Open host player control modal (host management)
     * @param {Player} player - Target player
     */
    openHostPlayerControl(player) {
        if (!this.hostPlayerControlModal) {
            console.warn('Host player control modal not initialized');
            return;
        }

        this.hostPlayerControlModal.open(player);
    }

    /**
     * Clear the player list
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    /**
     * Get component state
     * @returns {Object} Component state
     */
    getState() {
        return {
            ...super.getState(),
            isHost: this.isHost,
            currentPlayerPeerId: this.currentPlayerPeerId,
            hostPeerId: this.hostPeerId,
            currentListElementId: this.currentListElementId,
            playerCount: this.gameState ? this.gameState.players.length : 0
        };
    }

    /**
     * Cleanup component
     */
    cleanup() {
        this.clear();
        this.gameState = null;

        // Cleanup modals
        if (this.playerInfoModal) {
            this.playerInfoModal.close();
        }
        if (this.playerControlModal) {
            this.playerControlModal.close();
        }
        if (this.hostPlayerControlModal) {
            this.hostPlayerControlModal.close();
        }

        super.cleanup();
    }
}
