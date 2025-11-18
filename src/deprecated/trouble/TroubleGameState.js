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
 * TroubleGameState - Simplified state container for Trouble
 *
 * Differences from TurnBasedGameState:
 * - Explicit currentPlayerIndex
 * - No remainingMoves concept
 * - Direct piece tracking
 * - Minimal fields needed by TroubleGameEngine
 */
export default class TroubleGameState extends BaseGameState {
    /**
     * @param {Object} config
     *  - board, factoryManager, players, settings, randomGenerator ... (BaseGameState)
     *  - currentPlayerIndex
     *  - turnPhase
     *  - currentPlayerId
     *  - pieces
     *  - lastRoll
     *  - extraTurnEarned
     */
    constructor(config = {}) {
        super(config);

        this.currentPlayerIndex = config.currentPlayerIndex ?? 0;
        this.turnPhase = config.turnPhase ?? TurnPhases.BEGIN_TURN;
        this.currentPlayerId =
            config.currentPlayerId ??
            (this.players[this.currentPlayerIndex]?.playerId ?? null);

        // Trouble-specific state
        this.pieces = Array.isArray(config.pieces) ? config.pieces : [];
        this.lastRoll = config.lastRoll ?? null;
        this.extraTurnEarned = config.extraTurnEarned ?? false;

        // Always initialize fresh array unless explicitly given
        if (!Array.isArray(config.pieces)) {
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
        if (!Array.isArray(this.players)) return;

        this.players.forEach((player, playerIndex) => {
            for (let pieceIndex = 0; pieceIndex < 4; pieceIndex++) {
                this.pieces.push({
                    playerId: player.playerId,
                    playerIndex,
                    pieceIndex,
                    status: PieceStatus.HOME,
                    position: -1 // -1 = HOME, 0..trackLength-1 = TRACK, 0..finishLength = FINISH/DONE
                });
            }
        });
    }

    /**
     * Get current player based on currentPlayerIndex
     */
    getCurrentPlayer() {
        if (!Array.isArray(this.players) || this.players.length === 0) {
            return null;
        }
        const idx = this.currentPlayerIndex % this.players.length;
        return this.players[idx] || null;
    }

    /**
     * Set current player index (clamped)
     */
    setCurrentPlayerIndex(index) {
        if (!Array.isArray(this.players) || this.players.length === 0) {
            this.currentPlayerIndex = 0;
            this.currentPlayerId = null;
            return;
        }

        if (typeof index !== 'number' || Number.isNaN(index)) {
            return;
        }

        const clamped = Math.max(0, Math.min(index, this.players.length - 1));
        this.currentPlayerIndex = clamped;
        this.currentPlayerId = this.players[clamped]?.playerId ?? null;
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
        return this.pieces.find(
            p => p.playerId === playerId && p.pieceIndex === pieceIndex
        );
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
     * Set turn phase (guarded)
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
        if (currentPlayer && typeof currentPlayer.incrementTurnsTaken === 'function') {
            currentPlayer.incrementTurnsTaken();
        } else if (currentPlayer && typeof currentPlayer.turnsTaken === 'number') {
            currentPlayer.turnsTaken += 1;
        }

        if (Array.isArray(this.players) && this.players.length > 0) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            this.currentPlayerId = this.players[this.currentPlayerIndex]?.playerId ?? null;
        } else {
            this.currentPlayerIndex = 0;
            this.currentPlayerId = null;
        }

        this.turnPhase = TurnPhases.BEGIN_TURN;
        this.lastRoll = null;
        this.extraTurnEarned = false;
    }

    /**
     * Give current player an extra turn (without advancing currentPlayerIndex)
     */
    giveExtraTurn() {
        this.turnPhase = TurnPhases.BEGIN_TURN;
        this.lastRoll = null;
        this.extraTurnEarned = false;
        this.currentPlayerId = this.players[this.currentPlayerIndex]?.playerId ?? null;
    }

    /**
     * Fields to include in delta updates
     */
    getDeltaFields() {
        return [
            ...super.getDeltaFields(),
            'currentPlayerIndex',
            'turnPhase',
            'currentPlayerId',
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
            currentPlayerId: this.currentPlayerId,
            pieces: this.pieces,
            lastRoll: this.lastRoll,
            extraTurnEarned: this.extraTurnEarned
        };
    }

    static fromJSON(json, factoryManager) {
        const state = super.fromJSON(json, factoryManager);

        state.currentPlayerIndex = json.currentPlayerIndex ?? 0;
        state.turnPhase = json.turnPhase ?? TurnPhases.BEGIN_TURN;
        state.currentPlayerId = json.currentPlayerId ?? null;
        state.pieces = Array.isArray(json.pieces) ? json.pieces : [];
        state.lastRoll = json.lastRoll ?? null;
        state.extraTurnEarned = json.extraTurnEarned ?? false;

        return state;
    }
}
