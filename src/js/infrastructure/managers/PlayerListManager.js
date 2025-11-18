// PlayerListManager.js

import GameStateFactory from '../../factories/GameStateFactory.js';

export default class PlayerListManager {
    constructor(defaultListElement, isHost, currentPlayerPeerId, hostPeerId) {
        this.listElement = defaultListElement; // DOM element for the player list
        this.isHost = isHost; // Whether the current user is the host
        this.currentPlayerPeerId = currentPlayerPeerId; // The peer ID of the current user
        this.hostPeerId = hostPeerId; // The peer ID of the host
        this.gameState = null; // The game state object
    }

    // Set the target list where the players should be drawn (e.g., lobby or game)
    setListElement(newListElement) {
        this.listElement = newListElement;
    }

    // Set whether the current user is the host
    setIsHost(isHost) {
        this.isHost = isHost;
    }

    // Update the game state and refresh the player list UI
    setGameState(gameState) {
        // Create a deep copy of the gameState by serializing and deserializing
        // It's okay to use the gameState's factory MAnager because it's a reference
        // I.e. everything in the game state copy gets deep copied except the factory manager
        // The factory manager should never be copied to begin with, it's effectively a singleton
        const gameStateCopy = GameStateFactory.fromJSON(gameState.toJSON(), gameState.factoryManager);
        
        // Set the copied game state
        this.gameState = gameStateCopy;
    
        // Refresh the player list UI
        this.updatePlayerListUI();
    }

    // Update the player list UI
    updatePlayerListUI() {
        if (!this.listElement) return;
        this.clearPlayerListUI();

        // Get the players from the gameState
        const players = this.gameState.players;

        // Render the player list in the current list element
        players.forEach(player => {
            const playerElement = this.createPlayerElement(player);
            this.listElement.appendChild(playerElement);
        });
    }

    // Create the player element for the UI
    createPlayerElement(player) {
        const li = document.createElement('li');
        li.className = 'player-container';
    
        const playerNameBadges = document.createElement('div');
        playerNameBadges.className = 'player-name-badges';
        
        const playerColor = player.playerColor || '#FFFFFF';
        const peerBorderColor = player.peerColor || '#FFFFFF';
    
        let nameHtml = `<span class="player-name" style="color:${playerColor}; font-weight: bold;">${player.nickname}</span>`;
        if (player.peerId === this.hostPeerId) {
            nameHtml += `<span class="host-badge">Host</span>`;
        }
        if (player.peerId === this.currentPlayerPeerId) {
            nameHtml += `<span class="you-badge">You</span>`;
        }
    
        playerNameBadges.innerHTML = nameHtml;
        li.style.border = `2px solid ${peerBorderColor}`;
    
        const playerButtons = document.createElement('div');
        playerButtons.className = 'player-buttons';
    
        // Add edit and remove buttons for the current user's own players
        if (player.peerId === this.currentPlayerPeerId) {
            const editButton = document.createElement('button');
            editButton.className = 'edit-button';
            editButton.textContent = '✏️';
            editButton.setAttribute('data-playerId', player.playerId);
            editButton.id = `${this.listElement.id}-edit-${player.playerId}`;
            playerButtons.appendChild(editButton);
    
            const removeButton = document.createElement('button');
            removeButton.className = 'remove-button';
            removeButton.textContent = '❌';
            removeButton.setAttribute('data-playerId', player.playerId);
            removeButton.id = `${this.listElement.id}-remove-${player.playerId}`; 
            playerButtons.appendChild(removeButton);
        }
    
        // If the current user is the host, add a kick button for other players
        if (this.isHost && player.peerId !== this.hostPeerId) {
            const kickButton = document.createElement('button');
            kickButton.className = 'kick-button';
            kickButton.textContent = '❌';
            kickButton.setAttribute('data-playerId', player.playerId);
            kickButton.id = `${this.listElement.id}-kick-${player.playerId}`; 
            playerButtons.appendChild(kickButton);
        }
    
        if ((this.gameState.getCurrentPlayer().playerId === player.playerId) && this.gameState.isGameStarted()) {
            li.classList.add('current-turn');
        }
    
        li.appendChild(playerNameBadges);
        li.appendChild(playerButtons);
        return li;
    }
    

    // Clear the player list UI
    clearPlayerListUI() {
        if (this.listElement) {
            this.listElement.innerHTML = '';
        }
    }

    /**
     * Determines if the player list needs to be updated based on new game state.
     * @param {GameState} newGameState - The new game state.
     * @returns {Boolean} - Returns true if the player list should be updated, false otherwise.
     */
    shouldUpdatePlayers(newGameState) {
        // Compare the players array
        if (!this.gameState) { //No gamestate, must update
            return true;
        }

        const oldPlayers = this.gameState.players;
        const newPlayers = newGameState.players;

        // Check if the number of players has changed
        if (oldPlayers.length !== newPlayers.length) {
            return true;
        }

        // Create a map of current players by playerId for quick lookup
        const currentPlayersMap = new Map();
        oldPlayers.forEach(player => {
            currentPlayersMap.set(player.playerId, player);
        });

        // Compare each new player with the current player
        for (let newPlayer of newPlayers) {
            const currentPlayer = currentPlayersMap.get(newPlayer.playerId);
            if (!currentPlayer) {
                // Player is new, need to update
                return true;
            }

            // Compare relevant properties (e.g., nickname, peerId)
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

        // Check if the current player's turn has changed
        if (this.gameState.currentPlayerId !== newGameState.currentPlayerId) {
            return true;
        }

        // No differences found
        return false;
    }
}
