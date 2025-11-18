import BaseGameEngine from './BaseGameEngine.js';
import TurnPhases from '../enums/TurnPhases.js';
import GamePhases from '../enums/GamePhases.js';
import { PieceStatus } from '../models/gameStates/TroubleGameState.js';

/**
 * TroubleGameEngine - Simplified engine for Pop-O-Matic Trouble game
 *
 * Follows a simpler state machine than TurnBasedGameEngine:
 * BEGIN_TURN → WAITING_FOR_MOVE → PROCESSING_MOVE →
 * PLAYER_CHOOSING_DESTINATION (if needed) → END_TURN
 *
 * Trouble Rules:
 * - Roll 6 to move piece out from HOME to START (position 0)
 * - Rolling 6 gives extra turn
 * - Landing on opponent sends them back to HOME
 * - Can't land on own pieces
 * - Must roll exact count to enter FINISH area
 * - First player with all 4 pieces in DONE wins
 */
export default class TroubleGameEngine extends BaseGameEngine {
    constructor(dependencies, config = {}) {
        super(dependencies, config);

        this.trackLength = config.trackLength || 28;
        this.finishLength = config.finishLength || 4;
        this.piecesPerPlayer = config.piecesPerPlayer || 4;

        this.pendingRoll = null;
        this.pendingMoveOptions = null;
        this.running = false;
        this.initialized = false;
    }

    // ===== Lifecycle Methods =====

    init() {
        // Initialize UI components
        let rollButton = this.getUIComponent('rollButton');

        if (!rollButton && this.uiSystem) {
            rollButton = this.uiSystem.getComponent('rollButton');
        }

        if (rollButton && rollButton.init) {
            rollButton.init({
                onRollDice: () => this.handleRollDiceForCurrentPlayer(),
                onRollComplete: (result) => this.handleAfterDiceRoll(result)
            });
        }

        // Initialize game state
        this.gameState.gamePhase = GamePhases.IN_GAME;
        this.gameState.setTurnPhase(TurnPhases.BEGIN_TURN);
        this.gameState.setCurrentPlayerIndex(0);

        this.initialized = true;
        this.running = true;

        // Start first turn
        this.handleBeginTurn();
    }

    start() {
        this.running = true;
        this.emitEvent('engineStarted');
    }

    pause() {
        this.running = false;
        this.emitEvent('enginePaused');
    }

    resume() {
        this.running = true;
        this.emitEvent('engineResumed');
    }

    stop() {
        this.running = false;
        this.emitEvent('engineStopped');
    }

    cleanup() {
        this.stop();
        this.pendingRoll = null;
        this.pendingMoveOptions = null;
    }

    updateGameState(gameState) {
        const previousPlayerId = this.gameState?.getCurrentPlayer()?.playerId;
        this.gameState = gameState;
        const currentPlayerId = this.gameState?.getCurrentPlayer()?.playerId;

        if (this.initialized && currentPlayerId !== previousPlayerId) {
            // Turn changed, update UI
            if (this.isClientTurn()) {
                this.activateRollButton();
            } else {
                this.deactivateRollButton();
            }
        }
    }

    getEngineState() {
        return {
            initialized: this.initialized,
            running: this.running,
            currentPhase: this.gameState.turnPhase,
            metadata: {
                pendingRoll: this.pendingRoll,
                currentPlayerIndex: this.gameState.currentPlayerIndex,
                lastRoll: this.gameState.lastRoll
            }
        };
    }

    getEngineType() {
        return 'trouble';
    }

    getPieceManagerType() {
        return 'trouble';
    }

    // ===== Player Action Handler =====

    async onPlayerAction(playerId, actionType, actionData = {}) {
        if (!this.running) {
            return { success: false, error: 'Game is not running' };
        }

        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.playerId !== playerId) {
            return { success: false, error: 'It is not your turn' };
        }

        switch (actionType) {
            case 'ROLL_DICE':
                return this.handleRoll(currentPlayer);
            case 'SELECT_PIECE':
                return this.handlePieceSelection(currentPlayer, actionData.pieceIndex);
            default:
                return { success: false, error: `Unknown action type: ${actionType}` };
        }
    }

    // ===== UI Helper Methods =====

    handleRollDiceForCurrentPlayer() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer) return 0;

        if (!this.isClientTurn()) {
            console.warn('[Trouble] Not your turn!');
            return 0;
        }

        const rollResult = Math.floor(Math.random() * 6) + 1;
        console.log(`[Trouble] ${currentPlayer.nickname} rolled a ${rollResult}`);

        this.deactivateRollButton();
        return rollResult;
    }

    handleAfterDiceRoll(rollResult) {
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer) return;

        // Trigger the actual roll action via event bus
        this.emitEvent('playerAction', {
            playerId: currentPlayer.playerId,
            actionType: 'ROLL_DICE',
            actionData: { rollResult }
        });
    }

    isClientTurn() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer) return false;
        return currentPlayer.playerId === this.peerId;
    }

    activateRollButton() {
        const rollButton = this.getUIComponent('rollButton');
        if (rollButton && rollButton.activate) {
            rollButton.activate();
            return;
        }
        if (this.uiSystem) {
            const btn = this.uiSystem.getComponent('rollButton');
            if (btn && btn.activate) {
                btn.activate();
            }
        }
    }

    deactivateRollButton() {
        const rollButton = this.getUIComponent('rollButton');
        if (rollButton && rollButton.deactivate) {
            rollButton.deactivate();
            return;
        }
        if (this.uiSystem) {
            const btn = this.uiSystem.getComponent('rollButton');
            if (btn && btn.deactivate) {
                btn.deactivate();
            }
        }
    }

    // ===== Phase Handlers =====

    handleBeginTurn() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        console.log(`[Trouble] BEGIN_TURN: ${currentPlayer?.nickname || 'unknown'}`);

        // Reset turn state
        this.gameState.lastRoll = null;
        this.pendingRoll = null;
        this.pendingMoveOptions = null;

        // Move to waiting for roll
        this.gameState.setTurnPhase(TurnPhases.WAITING_FOR_MOVE);

        // Activate roll button if it's this client's turn
        if (this.isClientTurn()) {
            this.activateRollButton();
        }

        this.emitStateUpdate();
    }

    handleRoll(currentPlayer) {
        if (this.gameState.turnPhase !== TurnPhases.WAITING_FOR_MOVE) {
            return { success: false, error: 'Not waiting for roll' };
        }

        const roll = Math.floor(Math.random() * 6) + 1;
        this.gameState.lastRoll = roll;
        this.pendingRoll = roll;

        console.log(`[Trouble] ${currentPlayer.nickname} rolled ${roll}`);

        // Move to processing move
        this.gameState.setTurnPhase(TurnPhases.PROCESSING_MOVE);
        this.handleProcessingMove();

        this.emitStateUpdate();
        return { success: true, roll };
    }

    handleProcessingMove() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        const roll = this.pendingRoll;

        console.log(`[Trouble] PROCESSING_MOVE: roll=${roll}`);

        // Find all movable pieces
        const moveOptions = this.findMoveOptions(currentPlayer, roll);

        // Case 1: No pieces out and didn't roll 6 - no moves possible
        const piecesAtHome = this.gameState.getPlayerPieces(currentPlayer.playerId)
            .filter(p => p.status === PieceStatus.HOME);
        const piecesOut = this.gameState.getPlayerPieces(currentPlayer.playerId)
            .filter(p => p.status !== PieceStatus.HOME && p.status !== PieceStatus.DONE);

        if (piecesOut.length === 0 && roll !== 6) {
            // No moves possible, end turn
            console.log('[Trouble] No pieces out and no 6 rolled, ending turn');
            this.gameState.setTurnPhase(TurnPhases.END_TURN);
            this.handleEndTurn();
            return;
        }

        // Case 2: No pieces out, rolled 6 - automatically move one piece out
        if (piecesOut.length === 0 && roll === 6) {
            console.log('[Trouble] Moving piece out to start');
            const piece = piecesAtHome[0];
            this.movePieceOut(currentPlayer, piece.pieceIndex);

            // Give extra turn for rolling 6
            this.gameState.extraTurnEarned = true;
            this.gameState.setTurnPhase(TurnPhases.END_TURN);
            this.handleEndTurn();
            return;
        }

        // Case 3: Pieces out, didn't roll 6 - show move options
        if (roll !== 6) {
            if (moveOptions.length === 0) {
                // No valid moves (blocked or can't finish exactly)
                console.log('[Trouble] No valid moves available, ending turn');
                this.gameState.setTurnPhase(TurnPhases.END_TURN);
                this.handleEndTurn();
                return;
            }

            this.pendingMoveOptions = moveOptions;
            this.gameState.setTurnPhase(TurnPhases.PLAYER_CHOOSING_DESTINATION);
            this.emitStateUpdate();
            return;
        }

        // Case 4 & 5: Rolled 6 with pieces out
        // For now, just show move options (TODO: add modal for move-out choice)
        if (moveOptions.length === 0) {
            // Can only move a piece out
            console.log('[Trouble] Moving piece out to start (rolled 6)');
            const piece = piecesAtHome[0];
            this.movePieceOut(currentPlayer, piece.pieceIndex);

            this.gameState.extraTurnEarned = true;
            this.gameState.setTurnPhase(TurnPhases.END_TURN);
            this.handleEndTurn();
            return;
        }

        // TODO: Show modal to choose between moving out or moving existing piece
        // For now, just show move options
        this.pendingMoveOptions = moveOptions;
        this.gameState.setTurnPhase(TurnPhases.PLAYER_CHOOSING_DESTINATION);
        this.gameState.extraTurnEarned = true;
        this.emitStateUpdate();
    }

    handlePieceSelection(currentPlayer, pieceIndex) {
        if (this.gameState.turnPhase !== TurnPhases.PLAYER_CHOOSING_DESTINATION) {
            return { success: false, error: 'Not waiting for piece selection' };
        }

        const piece = this.gameState.getPiece(currentPlayer.playerId, pieceIndex);
        if (!piece) {
            return { success: false, error: 'Invalid piece' };
        }

        // Verify this piece is in the move options
        const option = this.pendingMoveOptions?.find(opt => opt.pieceIndex === pieceIndex);
        if (!option) {
            return { success: false, error: 'Piece cannot be moved' };
        }

        // Move the piece
        this.movePiece(currentPlayer, pieceIndex, option.newPosition, option.newStatus);

        // End turn
        this.gameState.setTurnPhase(TurnPhases.END_TURN);
        this.handleEndTurn();

        this.emitStateUpdate();
        return { success: true };
    }

    handleEndTurn() {
        console.log('[Trouble] END_TURN');

        // Check for win condition
        const currentPlayer = this.gameState.getCurrentPlayer();
        const donePieces = this.gameState.getPlayerPieces(currentPlayer.playerId)
            .filter(p => p.status === PieceStatus.DONE);

        if (donePieces.length === this.piecesPerPlayer) {
            console.log(`[Trouble] ${currentPlayer.nickname} wins!`);
            this.gameState.gamePhase = GamePhases.GAME_ENDED;
            this.emitStateUpdate();
            return;
        }

        // Check for extra turn
        if (this.gameState.extraTurnEarned) {
            console.log('[Trouble] Extra turn earned!');
            this.gameState.giveExtraTurn();
            this.handleBeginTurn();
        } else {
            // Next player's turn
            this.gameState.nextPlayerTurn();
            this.handleBeginTurn();
        }

        this.emitStateUpdate();
    }

    // ===== Game Logic Methods =====

    findMoveOptions(currentPlayer, roll) {
        const options = [];
        const pieces = this.gameState.getPlayerPieces(currentPlayer.playerId);

        for (const piece of pieces) {
            // Skip pieces still at home or already done
            if (piece.status === PieceStatus.HOME || piece.status === PieceStatus.DONE) {
                continue;
            }

            const newPosition = piece.position + roll;

            // Check if move is valid
            if (piece.status === PieceStatus.TRACK) {
                // On main track
                const finishEntryPosition = this.getFinishEntryPosition();

                if (newPosition < finishEntryPosition) {
                    // Still on track
                    if (this.canMoveTo(piece, newPosition, PieceStatus.TRACK)) {
                        options.push({
                            pieceIndex: piece.pieceIndex,
                            newPosition,
                            newStatus: PieceStatus.TRACK
                        });
                    }
                } else if (newPosition === finishEntryPosition) {
                    // Entering finish area
                    const finishPos = 0;
                    if (this.canMoveTo(piece, finishPos, PieceStatus.FINISH)) {
                        options.push({
                            pieceIndex: piece.pieceIndex,
                            newPosition: finishPos,
                            newStatus: PieceStatus.FINISH
                        });
                    }
                } else {
                    // Would overshoot finish entry, need exact roll
                    const stepsToFinish = finishEntryPosition - piece.position;
                    const finishPos = roll - stepsToFinish - 1;

                    if (finishPos >= 0 && finishPos < this.finishLength) {
                        if (this.canMoveTo(piece, finishPos, PieceStatus.FINISH)) {
                            options.push({
                                pieceIndex: piece.pieceIndex,
                                newPosition: finishPos,
                                newStatus: PieceStatus.FINISH
                            });
                        }
                    }
                }
            } else if (piece.status === PieceStatus.FINISH) {
                // In finish area
                if (newPosition < this.finishLength) {
                    if (this.canMoveTo(piece, newPosition, PieceStatus.FINISH)) {
                        options.push({
                            pieceIndex: piece.pieceIndex,
                            newPosition,
                            newStatus: PieceStatus.FINISH
                        });
                    }
                } else if (newPosition === this.finishLength) {
                    // Exact finish!
                    options.push({
                        pieceIndex: piece.pieceIndex,
                        newPosition: this.finishLength,
                        newStatus: PieceStatus.DONE
                    });
                }
                // else: would overshoot, invalid
            }
        }

        return options;
    }

    canMoveTo(piece, newPosition, newStatus) {
        // Check if any of player's own pieces are at this position
        const ownPieces = this.gameState.getPlayerPieces(piece.playerId);

        for (const otherPiece of ownPieces) {
            if (otherPiece.pieceIndex === piece.pieceIndex) continue;
            if (otherPiece.status === newStatus && otherPiece.position === newPosition) {
                // Can't land on own piece
                return false;
            }
        }

        return true;
    }

    movePieceOut(currentPlayer, pieceIndex) {
        const piece = this.gameState.getPiece(currentPlayer.playerId, pieceIndex);
        if (!piece) return;

        // Check if start position is occupied by opponent
        const startPosition = 0;
        this.bumpOpponentsAt(currentPlayer.playerId, startPosition, PieceStatus.TRACK);

        // Move piece to start
        this.gameState.updatePiece(currentPlayer.playerId, pieceIndex, startPosition, PieceStatus.TRACK);
        console.log(`[Trouble] Moved piece ${pieceIndex} out to start`);
    }

    movePiece(currentPlayer, pieceIndex, newPosition, newStatus) {
        // Bump any opponents at destination
        if (newStatus === PieceStatus.TRACK) {
            this.bumpOpponentsAt(currentPlayer.playerId, newPosition, newStatus);
        }

        // Move the piece
        this.gameState.updatePiece(currentPlayer.playerId, pieceIndex, newPosition, newStatus);
        console.log(`[Trouble] Moved piece ${pieceIndex} to ${newStatus}:${newPosition}`);
    }

    bumpOpponentsAt(playerId, position, status) {
        // Find all opponent pieces at this position
        for (const piece of this.gameState.pieces) {
            if (piece.playerId === playerId) continue;
            if (piece.status === status && piece.position === position) {
                // Send back to HOME
                this.gameState.updatePiece(piece.playerId, piece.pieceIndex, -1, PieceStatus.HOME);
                console.log(`[Trouble] Bumped opponent piece ${piece.pieceIndex} back to home`);
            }
        }
    }

    getFinishEntryPosition() {
        // Each player enters finish at their starting position + track length
        // For a 28-space track with shared finish: all players enter at position 28
        return this.trackLength;
    }

    emitStateUpdate() {
        // Emit state update for UI components (like TroublePieceManager)
        this.emitEvent('trouble:stateUpdated', {
            pieces: this.gameState.pieces,
            currentPlayerIndex: this.gameState.currentPlayerIndex,
            lastRoll: this.gameState.lastRoll,
            turnPhase: this.gameState.turnPhase
        });
    }

    getRequiredUIComponents() {
        return [
            {
                id: 'rollButton',
                type: 'button',
                required: true,
                description: 'Pop-O-Matic dice roller',
                events: {
                    emits: ['ROLL_DICE'],
                    listens: []
                }
            }
        ];
    }

    getOptionalUIComponents() {
        return [
            {
                id: 'boardCanvas',
                type: 'board',
                required: false,
                description: 'Displays the Trouble track and pegs',
                events: {
                    emits: [],
                    listens: ['trouble:stateUpdated']
                }
            }
        ];
    }

    getCapabilities() {
        return {
            supportsDiceRoll: true,
            supportsCardDraw: false,
            supportsPieceSelection: true,
            supportsMultiplePiecesPerPlayer: true,
            supportsResourceManagement: false,
            supportsSimultaneousTurns: false,
            supportsTurnPhases: true,
            supportsPlayerVoting: false,
            supportsRealTime: false,
            supportsTeams: false
        };
    }
}
