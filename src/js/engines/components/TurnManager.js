/**
 * TurnManager - Manages turn order and current player determination
 *
 * This component handles:
 * - Determining current player based on turn count
 * - Managing turn transitions
 * - Tracking turn order
 * - Handling turn-based timing
 */
export default class TurnManager {
    /**
     * Create a new turn manager
     * @param {GameState} gameState - The game state reference
     * @param {Object} config - Configuration options
     */
    constructor(gameState, config = {}) {
        this.gameState = gameState;
        this.config = {
            // Whether to skip disconnected/spectating players automatically
            skipInactivePlayers: config.skipInactivePlayers !== undefined ? config.skipInactivePlayers : true,
            // Maximum turns before ending game (0 = unlimited)
            maxTurns: config.maxTurns || 0,
            ...config
        };

        // Turn tracking
        this.turnHistory = [];
        this.turnCallbacks = new Map();
    }

    /**
     * Get the current player
     * @returns {Player|null} Current player or null if no players
     */
    getCurrentPlayer() {
        return this.gameState.getCurrentPlayer();
    }

    /**
     * Get the current turn number
     * @returns {number} Turn number (1-indexed)
     */
    getCurrentTurnNumber() {
        return this.gameState.getTurnNumber();
    }

    /**
     * Get all players in turn order
     * @returns {Player[]} Players sorted by turns taken (ascending)
     */
    getPlayersInTurnOrder() {
        return [...this.gameState.players].sort((a, b) => a.turnsTaken - b.turnsTaken);
    }

    /**
     * Get the next player who will take a turn
     * @returns {Player|null} Next player or null
     */
    getNextPlayer() {
        const players = this.getPlayersInTurnOrder();
        if (players.length === 0) return null;

        // Find the player with the fewest turns who isn't the current player
        const currentPlayer = this.getCurrentPlayer();
        const nextPlayers = players.filter(p => p.playerId !== currentPlayer?.playerId);

        if (nextPlayers.length === 0) return players[0]; // Only one player
        return nextPlayers[0];
    }

    /**
     * Advance to the next player's turn
     * @param {Object} context - Additional context for the turn change
     * @returns {Player} The new current player
     */
    nextTurn(context = {}) {
        const previousPlayer = this.getCurrentPlayer();

        if (!previousPlayer) {
            console.warn('Cannot advance turn: no current player');
            return null;
        }

        // Increment current player's turn count
        previousPlayer.turnsTaken++;

        // Record turn transition
        this.recordTurnTransition(previousPlayer, context);

        // Get new current player
        const newCurrentPlayer = this.getCurrentPlayer();

        // Execute callbacks
        this.executeCallbacks('turnChanged', {
            previousPlayer,
            currentPlayer: newCurrentPlayer,
            turnNumber: this.getCurrentTurnNumber(),
            ...context
        });

        return newCurrentPlayer;
    }

    /**
     * Skip a specific player's turn
     * @param {string} playerId - Player ID to skip
     * @param {string} reason - Reason for skipping
     * @returns {boolean} True if skipped successfully
     */
    skipTurn(playerId, reason = 'manual') {
        const player = this.gameState.getPlayerByPlayerId(playerId);
        if (!player) {
            console.warn(`Cannot skip turn: player ${playerId} not found`);
            return false;
        }

        // Increment their turn count to skip them
        player.turnsTaken++;

        this.executeCallbacks('turnSkipped', {
            player,
            reason,
            turnNumber: this.getCurrentTurnNumber()
        });

        return true;
    }

    /**
     * Check if a player should be skipped automatically
     * @param {Player} player - Player to check
     * @returns {boolean} True if should skip
     */
    shouldSkipPlayer(player) {
        if (!this.config.skipInactivePlayers) return false;

        const skipStates = [
            'COMPLETED_GAME',
            'SKIPPING_TURN',
            'SPECTATING',
            'DISCONNECTED'
        ];

        return skipStates.includes(player.getState());
    }

    /**
     * Get turn statistics
     * @returns {Object} Turn stats
     */
    getTurnStats() {
        const players = this.gameState.players;
        if (players.length === 0) {
            return {
                totalTurns: 0,
                averageTurns: 0,
                minTurns: 0,
                maxTurns: 0,
                turnNumber: 1
            };
        }

        const turnCounts = players.map(p => p.turnsTaken);
        const totalTurns = turnCounts.reduce((sum, count) => sum + count, 0);

        return {
            totalTurns,
            averageTurns: totalTurns / players.length,
            minTurns: Math.min(...turnCounts),
            maxTurns: Math.max(...turnCounts),
            turnNumber: this.getCurrentTurnNumber()
        };
    }

    /**
     * Check if the game should end based on turn limits
     * @returns {boolean} True if max turns reached
     */
    hasReachedMaxTurns() {
        if (this.config.maxTurns === 0) return false;
        return this.getCurrentTurnNumber() > this.config.maxTurns;
    }

    /**
     * Reset turn order (restart from current state)
     * @param {boolean} preserveTurnCounts - Whether to keep existing turn counts
     */
    resetTurnOrder(preserveTurnCounts = false) {
        if (!preserveTurnCounts) {
            this.gameState.players.forEach(player => {
                player.turnsTaken = 0;
            });
        }

        this.turnHistory = [];

        this.executeCallbacks('turnOrderReset', {
            preserveTurnCounts,
            players: this.gameState.players
        });
    }

    /**
     * Set turn order explicitly (for custom game modes)
     * @param {string[]} playerIds - Array of player IDs in desired order
     */
    setTurnOrder(playerIds) {
        // Validate all player IDs exist
        const validPlayers = playerIds.every(id =>
            this.gameState.getPlayerByPlayerId(id) !== null
        );

        if (!validPlayers) {
            console.warn('Cannot set turn order: invalid player IDs');
            return false;
        }

        // Set turn counts to reflect order (0, 1, 2, ...)
        playerIds.forEach((playerId, index) => {
            const player = this.gameState.getPlayerByPlayerId(playerId);
            player.turnsTaken = index;
        });

        this.executeCallbacks('turnOrderSet', {
            playerIds,
            turnNumber: this.getCurrentTurnNumber()
        });

        return true;
    }

    /**
     * Register a callback for turn events
     * @param {string} event - Event name (turnChanged, turnSkipped, etc.)
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.turnCallbacks.has(event)) {
            this.turnCallbacks.set(event, []);
        }
        this.turnCallbacks.get(event).push(callback);
    }

    /**
     * Unregister a callback
     * @param {string} event - Event name
     * @param {Function} callback - Callback to remove
     */
    off(event, callback) {
        if (!this.turnCallbacks.has(event)) return;

        const callbacks = this.turnCallbacks.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Execute all callbacks for an event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    executeCallbacks(event, data) {
        if (!this.turnCallbacks.has(event)) return;

        const callbacks = this.turnCallbacks.get(event);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error executing turn callback for ${event}:`, error);
            }
        });
    }

    /**
     * Record a turn transition in history
     * @param {Player} player - Player whose turn ended
     * @param {Object} context - Additional context
     */
    recordTurnTransition(player, context) {
        this.turnHistory.push({
            playerId: player.playerId,
            playerNickname: player.nickname,
            turnNumber: this.getCurrentTurnNumber(),
            timestamp: Date.now(),
            ...context
        });

        // Keep history limited to last 100 turns
        if (this.turnHistory.length > 100) {
            this.turnHistory.shift();
        }
    }

    /**
     * Get turn history
     * @param {number} limit - Max number of entries to return
     * @returns {Array} Turn history entries
     */
    getTurnHistory(limit = 10) {
        return this.turnHistory.slice(-limit);
    }

    /**
     * Get how many turns a player has taken
     * @param {string} playerId - Player ID
     * @returns {number} Turn count
     */
    getPlayerTurnCount(playerId) {
        const player = this.gameState.getPlayerByPlayerId(playerId);
        return player ? player.turnsTaken : 0;
    }

    /**
     * Check if it's a specific player's turn
     * @param {string} playerId - Player ID to check
     * @returns {boolean} True if it's their turn
     */
    isPlayerTurn(playerId) {
        const currentPlayer = this.getCurrentPlayer();
        return currentPlayer && currentPlayer.playerId === playerId;
    }

    /**
     * Serialize turn manager state for debugging
     * @returns {Object} Serialized state
     */
    toJSON() {
        return {
            currentPlayer: this.getCurrentPlayer()?.playerId,
            turnNumber: this.getCurrentTurnNumber(),
            stats: this.getTurnStats(),
            config: this.config,
            historyLength: this.turnHistory.length
        };
    }
}
