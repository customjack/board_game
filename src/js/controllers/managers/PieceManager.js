import Piece from '../../models/Piece';
import Player from '../../models/Player';
import { getVisibleElementById } from '../../utils/helpers.js';

export default class PieceManager {
    constructor() {
        this.pieces = [];  // Array of active pieces
    }

    /**
     * Updates the pieces based on the latest game state.
     * @param {GameState} gameState - The updated game state.
     */
    updatePieces(gameState) {
        // Step 1: Remove any pieces that are no longer in the game state
        this.removePieces(gameState);

        // Step 2: Add new pieces for players in the game state
        this.addPieces(gameState);

        // Step 3: Update pieces player
        this.updatePiecePlayers(gameState);

        // Step 4: Determine how many players are on each space
        const playersPerSpace = this.getPlayersPerSpace(gameState);

        // Step 5: Render each piece based on the game state
        this.renderAllPieces(playersPerSpace);
    }

        /**
     * Determines if the pieces need to be updated based on the game state.
     * @param {Array} gameStatePlayers - The array of players from the game state.
     * @returns {Boolean} - Returns true if pieces should be updated, false otherwise.
     */
    shouldUpdatePieces(gameStatePlayers) {
        // Get the current players from the piece manager
        const currentPlayers = this.getPlayers();

        // If the number of players has changed, we need to update
        if (currentPlayers.length !== gameStatePlayers.length) {
            return true;
        }

        // Create a map for quick lookup of current players by playerId
        const currentPlayersMap = new Map();
        currentPlayers.forEach(player => {
            currentPlayersMap.set(player.playerId, player);
        });

        // Compare each player in the game state with the current players
        for (let gameStatePlayer of gameStatePlayers) {
            const currentPlayer = currentPlayersMap.get(gameStatePlayer.playerId);

            // If the player doesn't exist in current players, we need to update
            if (!currentPlayer) {
                return true;
            }

            // If the player's position has changed, we need to update
            if (currentPlayer.currentSpaceId !== gameStatePlayer.currentSpaceId) {
                return true;
            }
        }

        // No changes detected, no need to update
        return false;
    }

    /**
     * Returns an array of players currently managed by pieces.
     * @returns {Array} Array of player objects.
     */
    getPlayers() {
        return this.pieces.map(piece => piece.player);
    }

    /**
     * Update each piece's player object based on the latest game state.
     * @param {GameState} gameState - The current game state.
     */
    updatePiecePlayers(gameState) {
        // Iterate through every player in the game state
        gameState.players.forEach(gameStatePlayer => {
            // Find the matching piece by playerId
            const matchingPiece = this.pieces.find(piece => piece.player.playerId === gameStatePlayer.playerId);

            // If a matching piece is found, update the piece's player object with a deep copy
            if (matchingPiece) {
                const playerCopy = Player.fromJSON(gameStatePlayer.toJSON(), gameState.factoryManager);
                matchingPiece.player = playerCopy;
            }
        });
    }

    /**
     * Removes pieces whose playerIds are no longer in the game state.
     * @param {GameState} gameState - The current game state.
     */
    removePieces(gameState) {
        const playerIds = gameState.players.map(player => player.playerId);
        
        this.pieces = this.pieces.filter(piece => {
            if (!playerIds.includes(piece.player.playerId)) {
                piece.remove();  // Remove piece from the board
                return false;    // Filter it out of the array
            }
            return true;
        });
    }

    /**
     * Adds pieces for players that don't already have one.
     * @param {GameState} gameState - The current game state.
     */
    addPieces(gameState) {
        gameState.players.forEach(player => {
            const existingPiece = this.pieces.find(p => p.player.playerId === player.playerId);
            if (!existingPiece) {
                // Create a deep copy of the player using toJSON and fromJSON
                const playerCopy = Player.fromJSON(player.toJSON(), gameState.factoryManager);
                const newPiece = new Piece(playerCopy);
                this.pieces.push(newPiece);
            }
        });
    }


    /**
     * Determines how many players are on each space.
     * @param {GameState} gameState - The current game state.
     * @returns {Object} An object mapping spaceId to an array of playerIds on that space.
     */
    getPlayersPerSpace(gameState) {
        const playersPerSpace = {};
        gameState.players.forEach(player => {
            const spaceId = player.currentSpaceId;
            if (!playersPerSpace[spaceId]) {
                playersPerSpace[spaceId] = [];
            }
            playersPerSpace[spaceId].push(player.playerId);
        });
        return playersPerSpace;
    }

    /**
     * Renders all pieces based on the current players' positions.
     * @param {Object} playersPerSpace - An object mapping spaceId to an array of playerIds on that space.
     */
    renderAllPieces(playersPerSpace) {
        this.pieces.forEach(piece => {
            const spaceId = piece.player.currentSpaceId;
            const spaceElement = getVisibleElementById(`space-${spaceId}`);

            if (spaceElement) {
                // Get the list of playerIds on this space
                const playersOnSpace = playersPerSpace[spaceId] || [];
                const totalPiecesAtSpace = playersOnSpace.length;
                const indexAtSpace = playersOnSpace.indexOf(piece.player.playerId);  // Get the index of this player at the space

                // Call the piece's render function, passing the spaceElement and index information
                piece.render(spaceElement, totalPiecesAtSpace, indexAtSpace);
            }
        });
    }
}
