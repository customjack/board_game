/**
 * PlayerListComponent - Displays the list of players
 *
 * Shows player information including names, colors, badges (Host/You),
 * and action buttons (edit, remove, kick)
 */
import BaseUIComponent from '../BaseUIComponent.js';
import GameState from '../../models/GameState.js';

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

        // Store list element ID for switching contexts (lobby vs game)
        this.currentListElementId = config.listElementId || 'lobbyPlayerList';
    }

    /**
     * Initialize the component
     */
    init() {
        super.init();

        if (!this.container) {
            console.warn(`Player list element ${this.currentListElementId} not found`);
        }
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
        this.gameState = GameState.fromJSON(gameState.toJSON(), gameState.factoryManager);

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

        this.emit('playerListRendered', { playerCount: players.length });
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

        // Edit and remove buttons for own players
        if (player.peerId === this.currentPlayerPeerId) {
            const editButton = document.createElement('button');
            editButton.className = 'edit-button';
            editButton.textContent = '✏️';
            editButton.setAttribute('data-playerId', player.playerId);
            editButton.id = `${this.currentListElementId}-edit-${player.playerId}`;
            playerButtons.appendChild(editButton);

            const removeButton = document.createElement('button');
            removeButton.className = 'remove-button';
            removeButton.textContent = '❌';
            removeButton.setAttribute('data-playerId', player.playerId);
            removeButton.id = `${this.currentListElementId}-remove-${player.playerId}`;
            playerButtons.appendChild(removeButton);
        }

        // Kick button for host (other players only)
        if (this.isHost && player.peerId !== this.hostPeerId) {
            const kickButton = document.createElement('button');
            kickButton.className = 'kick-button';
            kickButton.textContent = '❌';
            kickButton.setAttribute('data-playerId', player.playerId);
            kickButton.id = `${this.currentListElementId}-kick-${player.playerId}`;
            playerButtons.appendChild(kickButton);
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
        super.cleanup();
    }
}
