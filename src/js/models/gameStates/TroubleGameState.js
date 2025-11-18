import BaseGameState from './BaseGameState.js';
import TurnPhases from '../../enums/TurnPhases.js';

/**
 * Piece status for Trouble game
 */
export const PieceStatus = {
    HOME: 'HOME',       // In starting area
    TRACK: 'TRACK',     // On the main track
    FINISH: 'FINISH',   // In finish area
    DONE: 'DONE'        // Completed (at end of finish)
};

/**
 * TroubleGameState - Simplified state for Trouble game
 *
 * Similar to TurnBasedGameState but optimized for Trouble's simpler mechanics.
 * Stores pieces directly in the state (not in pluginState).
 */
export default class TroubleGameState extends BaseGameState {
    constructor(config = {}) {
        super(config);

        // Turn tracking (similar to TurnBasedGameState)
        this.currentPlayerIndex = config.currentPlayerIndex || 0;
        this.turnPhase = config.turnPhase || TurnPhases.BEGIN_TURN;

        // Trouble-specific state
        this.pieces = config.pieces || [];
        this.lastRoll = config.lastRoll || null;
        this.extraTurnEarned = config.extraTurnEarned || false;

        // Initialize pieces if needed
        if (this.pieces.length === 0 && this.players && this.players.length > 0) {
            this.initializePieces();
        }
    }

    getStateType() {
        return 'trouble';
    }

    /**
     * Initialize 4 pieces per player, all at HOME
     */
    initializePieces() {
        this.pieces = [];
        this.players.forEach((player, playerIndex) => {
            for (let pieceIndex = 0; pieceIndex < 4; pieceIndex++) {
                this.pieces.push({
                    playerId: player.playerId,
                    playerIndex: playerIndex,
                    pieceIndex: pieceIndex,
                    status: PieceStatus.HOME,
                    position: -1  // -1 = HOME, 0-27 = TRACK, 28-31 = FINISH
                });
            }
        });
    }

    /**
     * Get current player based on index
     */
    getCurrentPlayer() {
        if (!Array.isArray(this.players) || this.players.length === 0) {
            return null;
        }
        return this.players[this.currentPlayerIndex % this.players.length] || null;
    }

    /**
     * Set current player index
     */
    setCurrentPlayerIndex(index) {
        this.currentPlayerIndex = index;
    }

    /**
     * Get all pieces for a player
     */
    getPlayerPieces(playerId) {
        return this.pieces.filter(p => p.playerId === playerId);
    }

    /**
     * Get a specific piece
     */
    getPiece(playerId, pieceIndex) {
        return this.pieces.find(p => p.playerId === playerId && p.pieceIndex === pieceIndex);
    }

    /**
     * Update piece position and status
     */
    updatePiece(playerId, pieceIndex, position, status) {
        const piece = this.getPiece(playerId, pieceIndex);
        if (piece) {
            piece.position = position;
            piece.status = status;
        }
    }

    /**
     * Set turn phase
     */
    setTurnPhase(phase) {
        if (Object.values(TurnPhases).includes(phase)) {
            this.turnPhase = phase;
        }
    }

    /**
     * Move to next player's turn
     */
    nextPlayerTurn() {
        const currentPlayer = this.getCurrentPlayer();
        if (currentPlayer) {
            currentPlayer.turnsTaken++;
        }

        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.turnPhase = TurnPhases.BEGIN_TURN;
        this.lastRoll = null;
        this.extraTurnEarned = false;
    }

    /**
     * Give current player an extra turn (rolled 6)
     */
    giveExtraTurn() {
        this.turnPhase = TurnPhases.BEGIN_TURN;
        this.lastRoll = null;
        this.extraTurnEarned = false;
    }

    /**
     * Fields to include in delta updates
     */
    getDeltaFields() {
        return [
            ...super.getDeltaFields(),
            'currentPlayerIndex',
            'turnPhase',
            'pieces',
            'lastRoll',
            'extraTurnEarned'
        ];
    }

    toJSON() {
        return {
            ...super.toJSON(),
            currentPlayerIndex: this.currentPlayerIndex,
            turnPhase: this.turnPhase,
            pieces: this.pieces,
            lastRoll: this.lastRoll,
            extraTurnEarned: this.extraTurnEarned
        };
    }

    static fromJSON(json, factoryManager) {
        const state = super.fromJSON(json, factoryManager);
        state.currentPlayerIndex = json.currentPlayerIndex || 0;
        state.turnPhase = json.turnPhase || TurnPhases.BEGIN_TURN;
        state.pieces = json.pieces || [];
        state.lastRoll = json.lastRoll || null;
        state.extraTurnEarned = json.extraTurnEarned || false;
        return state;
    }
}
