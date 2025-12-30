import TurnPhases from '../phases/TurnPhases.js';
import GamePhases from '../GamePhases.js';
import Settings from '../../elements/models/Settings.js';
import SharedRandomNumberGenerator from '../../elements/models/SharedRandomNumberGenerator.js';
import BaseGameState from './BaseGameState.js';

export default class TurnBasedGameState extends BaseGameState {
    constructor(boardOrConfig, factoryManager, players = [], settings = new Settings(), randomGenerator = new SharedRandomNumberGenerator(Math.random().toString(36).slice(2, 11)), selectedMapId = 'default', selectedMapData = null) {
        if (boardOrConfig && typeof boardOrConfig === 'object' && boardOrConfig.board) {
            super(boardOrConfig);
        } else {
            super({
                board: boardOrConfig,
                factoryManager,
                players,
                settings,
                randomGenerator,
                selectedMapId,
                selectedMapData
            });
        }

        this.remainingMoves = 0;
        this.turnPhase = TurnPhases.BEGIN_TURN;
        this.gamePhase = this.gamePhase || GamePhases.IN_LOBBY;
        this._currentPlayerOverride = null;
    }

    getStateType() {
        return 'turn-based';
    }

    // Get the current player (based on the fewest turns taken)
    getCurrentPlayer() {
        if (this.players.length === 0) {
            return null;
        }

        if (Number.isInteger(this._currentPlayerOverride)) {
            const overridePlayer = this.players[this._currentPlayerOverride];
            this._currentPlayerOverride = null;
            if (overridePlayer) {
                return overridePlayer;
            }
        }

        return this.players.reduce((prev, current) => {
            return current.turnsTaken < prev.turnsTaken ? current : prev;
        });
    }

    // Get the current turn number (minimum turns taken + 1)
    getTurnNumber() {
        if (this.players.length === 0) {
            return 1; // Default to turn 1 if there are no players
        }

        const minTurnsTaken = Math.min(...this.players.map(player => player.turnsTaken));
        return minTurnsTaken + 1;
    }

    // Update stats for a player
    updatePlayerStats(statName, delta) {
        const player = this.getCurrentPlayer();
        player.updateStat(statName, delta);
    }

    /**
     * Force the current player for scenarios like tests or scripted events.
     * Adjusts turn counts so the target player becomes the active player.
     * @param {number} index - Index of the player to make current
     * @returns {boolean} True if update succeeded
     */
    setCurrentPlayerIndex(index) {
        if (!Array.isArray(this.players) || this.players.length === 0) {
            return false;
        }

        if (typeof index !== 'number' || index < 0 || index >= this.players.length) {
            return false;
        }

        const targetPlayer = this.players[index];
        if (!targetPlayer) {
            return false;
        }

        // Normalize turnsTaken so that the target player becomes the minimum.
        targetPlayer.turnsTaken = 0;

        this.players.forEach((player, idx) => {
            if (idx !== index && player.turnsTaken <= 0) {
                player.turnsTaken = 1;
            }
        });

        this._currentPlayerOverride = index;
        return true;
    }

    clearCurrentPlayerOverride() {
        this._currentPlayerOverride = null;
    }

    // Move to the next player's turn (increment their turns taken)
    nextPlayerTurn() {
        const currentPlayer = this.getCurrentPlayer();
        if (currentPlayer) {
            currentPlayer.turnsTaken++;
            this.turnPhase = TurnPhases.BEGIN_TURN; // Mark the end of the current player's turn
        }
    }

    // Set the remaining moves for the current player
    setRemainingMoves(moves) {
        this.remainingMoves = moves;
    }

    // Reduce the remaining moves
    decrementMoves(amount = 1) {
        this.remainingMoves = this.remainingMoves - amount < 0 ? 0 : this.remainingMoves - amount;
    }

    // Move Player
    movePlayer(spaceId, playerId = null, movesDecremented = 1) {
        // Determine the current player based on playerId or fallback to the current player
        const currentPlayer = playerId 
            ? this.players.find(player => player.playerId === playerId) 
            : this.getCurrentPlayer();
    
        if (!currentPlayer) {
            console.error(`No player found with ID: ${playerId}`);
            return;
        }
    
        // If the player has no movement history (first time moving), add their initial space
        if (currentPlayer.movementHistory.isEmpty()) {
            currentPlayer.movementHistory.addMove(this.getTurnNumber(), currentPlayer.currentSpaceId, this.remainingMoves);
        }
    
        // Move the player to the specified space
        currentPlayer.setCurrentSpaceId(spaceId);

        // Decrement the remaining moves
        this.decrementMoves(movesDecremented);
    
        // Track the movement history for subsequent moves
        currentPlayer.movementHistory.addMove(this.getTurnNumber(), spaceId, this.remainingMoves);
    
    }
    


    // Check if the current player has any remaining moves
    hasMovesLeft() {
        return this.remainingMoves > 0;
    }


    // Change the turn phase (e.g., BEGIN_TURN, END_TURN, etc.)
    setTurnPhase(phase) {
        if (Object.values(TurnPhases).includes(phase)) {
            if (phase === TurnPhases.END_TURN) {
                this.setRemainingMoves(0);
            }
            this.turnPhase = phase;
        } else {
            console.error(`Invalid turn phase: ${phase}`);
        }
    }

    /**
     * Get list of top-level fields that should be included in delta updates
     * @returns {Array<string>} Field names to include in deltas
     */
    getDeltaFields() {
        return [
            ...super.getDeltaFields(),
            'remainingMoves',
            'turnPhase'
        ];
    }

    // Serialize the game state to JSON (using the random generator's toJSON)
    toJSON() {
        return {
            ...super.toJSON(),
            remainingMoves: this.remainingMoves,
            turnPhase: this.turnPhase
        };
    }

    static fromJSON(json, factoryManager) {
        const gameState = super.fromJSON(json, factoryManager);
        gameState.remainingMoves = json.remainingMoves ?? 0;
        gameState.turnPhase = json.turnPhase ?? TurnPhases.BEGIN_TURN;
        gameState._currentPlayerOverride = null;
        return gameState;
    }
}
