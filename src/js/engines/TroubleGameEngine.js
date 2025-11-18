import BaseGameEngine from './BaseGameEngine.js';
import PhaseStateMachine from './components/PhaseStateMachine.js';
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

        this.phaseStateMachine = new PhaseStateMachine(
            {
                gamePhases: Object.values(GamePhases),
                turnPhases: [
                    TurnPhases.BEGIN_TURN,
                    TurnPhases.WAITING_FOR_MOVE,
                    TurnPhases.WAITING_FOR_MOVE_CHOICE,
                    TurnPhases.PLAYER_CHOOSING_DESTINATION,
                    TurnPhases.PROCESSING_MOVE,
                    TurnPhases.END_TURN
                ]
            },
            this.eventBus
        );
        this.registerPhaseHandlers();
    }

    // ===== Lifecycle Methods =====

    registerPhaseHandlers() {
        this.phaseStateMachine.registerGamePhaseHandler(GamePhases.IN_LOBBY, () => this.handleInLobby());
        this.phaseStateMachine.registerGamePhaseHandler(GamePhases.IN_GAME, () => this.handleInGame());
        this.phaseStateMachine.registerGamePhaseHandler(GamePhases.PAUSED, () => this.handlePaused());
        this.phaseStateMachine.registerGamePhaseHandler(GamePhases.GAME_ENDED, () => this.handleGameEnded());

        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.BEGIN_TURN, () => this.handleBeginTurn());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.WAITING_FOR_MOVE, () => this.handleWaitingForMove());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.WAITING_FOR_MOVE_CHOICE, () => this.handleWaitingForMoveChoice());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.PLAYER_CHOOSING_DESTINATION, () => this.handlePlayerChoosingDestination());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.PROCESSING_MOVE, () => this.handleProcessingMove());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.END_TURN, () => this.handleEndTurn());
    }

    init() {
        // Initialize UI components
        let rollButton = this.getUIComponent('rollButton');

        if (!rollButton && this.uiSystem) {
            rollButton = this.uiSystem.getComponent('rollButton');
        }

        // Setup roll button callbacks (may already be initialized by UISystem)
        if (rollButton) {
            console.log('[Trouble] Setting up roll button callbacks, initialized:', rollButton.initialized);

            // Always update callbacks directly to ensure they're set
            rollButton.onRollDiceCallback = () => this.handleRollDiceForCurrentPlayer();
            rollButton.onRollCompleteCallback = (result) => this.handleAfterDiceRoll(result);

            // If not yet initialized, also call init
            if (!rollButton.initialized && rollButton.init) {
                rollButton.init({
                    onRollDice: () => this.handleRollDiceForCurrentPlayer(),
                    onRollComplete: (result) => this.handleAfterDiceRoll(result)
                });
            }

            console.log('[Trouble] Roll button callbacks set:', {
                onRollDice: !!rollButton.onRollDiceCallback,
                onRollComplete: !!rollButton.onRollCompleteCallback
            });
        } else {
            console.warn('[Trouble] No roll button found!');
        }

        // Initialize game state
        this.gameState.gamePhase = GamePhases.IN_GAME;
        this.gameState.setTurnPhase(TurnPhases.BEGIN_TURN);
        this.gameState.setCurrentPlayerIndex(0);

        this.phaseStateMachine.init(this.gameState.gamePhase, this.gameState.turnPhase);
        this.phaseStateMachine.transitionGamePhase(this.gameState.gamePhase, { gameState: this.gameState });

        this.initialized = true;
        this.running = true;

        console.log('[Trouble] Engine initialized, starting first turn');

        this.phaseStateMachine.transitionTurnPhase(TurnPhases.BEGIN_TURN, { gameState: this.gameState });
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
        this.pendingLocalRoll = null;
    }

    updateGameState(gameState) {
        const previousTurnPhase = this.gameState?.turnPhase;
        const previousGamePhase = this.gameState?.gamePhase;
        this.gameState = gameState;

        const gamePhaseChanged = this.phaseStateMachine?.getGamePhase?.() !== gameState.gamePhase;
        if (gamePhaseChanged) {
            this.phaseStateMachine.transitionGamePhase(gameState.gamePhase, { gameState: this.gameState });
        }

        const turnPhaseChanged = this.phaseStateMachine?.currentTurnPhase !== gameState.turnPhase
            || previousTurnPhase !== gameState.turnPhase
            || previousGamePhase !== gameState.gamePhase;

        if (turnPhaseChanged) {
            this.phaseStateMachine.transitionTurnPhase(gameState.turnPhase, { gameState: this.gameState });
        }

        this.updateRollButtonForClient();
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
                return this.handleRoll(currentPlayer, actionData?.rollResult);
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
        this.pendingLocalRoll = rollResult;
        this.logPhase('ROLL_POPPED', { roll: rollResult, byHost: this.isHost });
        this.deactivateRollButton();
        return rollResult;
    }

    handleAfterDiceRoll(rollResult) {
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer) return;

        const resolvedRoll = typeof rollResult === 'number' ? rollResult : this.pendingLocalRoll;
        this.pendingLocalRoll = null;
        if (typeof resolvedRoll !== 'number') {
            console.warn('[Trouble] Could not resolve roll result');
            return;
        }

        if (this.isHost) {
            this.handleRoll(currentPlayer, resolvedRoll);
        } else {
            // Trigger the actual roll action via event bus
            this.emitEvent('playerAction', {
                playerId: currentPlayer.playerId,
                actionType: 'ROLL_DICE',
                actionData: { rollResult: resolvedRoll }
            });
        }
    }

    isClientTurn() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer) return false;
        return currentPlayer.peerId === this.peerId;
    }

    activateRollButton() {
        console.log('[Trouble] Attempting to activate roll button');
        const rollButton = this.getUIComponent('rollButton');
        if (rollButton && rollButton.activate) {
            console.log('[Trouble] Activating roll button via getUIComponent');
            rollButton.activate();
            return;
        }
        if (this.uiSystem) {
            const btn = this.uiSystem.getComponent('rollButton');
            if (btn && btn.activate) {
                console.log('[Trouble] Activating roll button via uiSystem');
                btn.activate();
            } else {
                console.warn('[Trouble] Roll button not found in uiSystem or no activate method');
            }
        } else {
            console.warn('[Trouble] No uiSystem available');
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

    changeTurnPhase(newPhase, context = {}) {
        this.gameState.setTurnPhase(newPhase);
        this.logPhase('CHANGE_PHASE', { phase: newPhase, ...context });
        this.emitStateUpdate();
        if (this.phaseStateMachine) {
            this.phaseStateMachine.transitionTurnPhase(newPhase, { ...context, gameState: this.gameState });
        }
    }

    changeGamePhase(newPhase, context = {}) {
        this.gameState.setGamePhase(newPhase);
        this.logPhase('CHANGE_GAME_PHASE', { phase: newPhase, ...context });
        if (this.phaseStateMachine) {
            this.phaseStateMachine.transitionGamePhase(newPhase, { ...context, gameState: this.gameState });
        }
    }

    updateRollButtonForClient() {
        if (this.isClientTurn()) {
            this.activateRollButton();
        } else {
            this.deactivateRollButton();
        }
    }

    // ===== Phase Handlers =====

    handleInLobby() {
        this.running = false;
        this.logPhase('IN_LOBBY');
    }

    handleInGame() {
        this.running = true;
        this.logPhase('IN_GAME');
    }

    handlePaused() {
        this.running = false;
        this.logPhase('PAUSED');
    }

    handleGameEnded() {
        this.running = false;
        this.logPhase('GAME_ENDED');
    }

    handleBeginTurn() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        this.logPhase('BEGIN_TURN', { player: currentPlayer?.nickname, playerId: currentPlayer?.playerId });

        // Reset turn state
        this.gameState.lastRoll = null;
        this.pendingRoll = null;
        this.pendingMoveOptions = null;

        this.changeTurnPhase(TurnPhases.WAITING_FOR_MOVE);
    }

    handleWaitingForMove() {
        this.logPhase('WAITING_FOR_MOVE');
        this.updateRollButtonForClient();
    }

    handleWaitingForMoveChoice() {
        this.logPhase('WAITING_FOR_MOVE_CHOICE', { options: this.pendingMoveOptions?.length || 0 });
        this.updateRollButtonForClient();
    }

    handlePlayerChoosingDestination() {
        this.logPhase('PLAYER_CHOOSING_DESTINATION', { options: this.pendingMoveOptions?.length || 0 });
        this.updateRollButtonForClient();
    }

    handleProcessingMove() {
        this.logPhase('PROCESSING_MOVE', { pendingRoll: this.pendingRoll });
        if (!this.isHost) {
            return;
        }
        this.processPendingRoll();
    }

    processPendingRoll() {
        const roll = this.pendingRoll;
        const currentPlayer = this.gameState.getCurrentPlayer();

        if (typeof roll !== 'number' || !currentPlayer) {
            this.pendingRoll = null;
            this.pendingMoveOptions = null;
            this.changeTurnPhase(TurnPhases.END_TURN);
            return;
        }

        console.log(`[Trouble] ${currentPlayer.nickname} rolled ${roll}`);

        const piecesAtHome = this.gameState.getPlayerPieces(currentPlayer.playerId)
            .filter(p => p.status === PieceStatus.HOME);
        const piecesOut = this.gameState.getPlayerPieces(currentPlayer.playerId)
            .filter(p => p.status !== PieceStatus.HOME && p.status !== PieceStatus.DONE);
        const moveOptions = this.findMoveOptions(currentPlayer, roll);

        this.pendingRoll = null;
        this.pendingMoveOptions = null;

        if (piecesOut.length === 0 && roll !== 6) {
            console.log('[Trouble] No pieces out and no 6 rolled, ending turn');
            this.changeTurnPhase(TurnPhases.END_TURN);
            return;
        }

        if (piecesOut.length === 0 && roll === 6) {
            console.log('[Trouble] Auto-moving piece out to start (rolled 6)');
            const piece = piecesAtHome[0];
            this.movePieceOut(currentPlayer, piece.pieceIndex);
            this.gameState.extraTurnEarned = true;
            this.changeTurnPhase(TurnPhases.END_TURN);
            return;
        }

        if (roll !== 6) {
            if (moveOptions.length === 0) {
                console.log('[Trouble] No valid moves available, ending turn');
                this.changeTurnPhase(TurnPhases.END_TURN);
                return;
            }

            this.pendingMoveOptions = moveOptions;
            this.changeTurnPhase(TurnPhases.PLAYER_CHOOSING_DESTINATION);
            return;
        }

        if (moveOptions.length === 0) {
            console.log('[Trouble] Moving piece out to start (rolled 6 - forced)');
            const piece = piecesAtHome[0];
            this.movePieceOut(currentPlayer, piece.pieceIndex);
            this.gameState.extraTurnEarned = true;
            this.changeTurnPhase(TurnPhases.END_TURN);
            return;
        }

        this.pendingMoveOptions = moveOptions;
        this.gameState.extraTurnEarned = true;
        this.changeTurnPhase(TurnPhases.PLAYER_CHOOSING_DESTINATION);
    }

    handleRoll(currentPlayer, forcedRoll = null) {
        if (this.gameState.turnPhase !== TurnPhases.WAITING_FOR_MOVE) {
            return { success: false, error: 'Not waiting for roll' };
        }

        const roll = typeof forcedRoll === 'number' ? forcedRoll : currentPlayer.rollDice(1, 6);
        this.gameState.lastRoll = roll;
        this.pendingRoll = roll;

        this.logPhase('ROLL_RESOLVED', { roll });

        this.changeTurnPhase(TurnPhases.PROCESSING_MOVE, { roll });
        return { success: true, roll };
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
        this.pendingMoveOptions = null;

        // End turn
        this.changeTurnPhase(TurnPhases.END_TURN);
        return { success: true };
    }

    handleEndTurn() {
        this.logPhase('END_TURN');
        if (!this.isHost) {
            this.updateRollButtonForClient();
            return;
        }

        // Check for win condition
        const currentPlayer = this.gameState.getCurrentPlayer();
        const donePieces = this.gameState.getPlayerPieces(currentPlayer.playerId)
            .filter(p => p.status === PieceStatus.DONE);

        if (donePieces.length === this.piecesPerPlayer) {
            console.log(`[Trouble] ${currentPlayer.nickname} wins!`);
            this.changeGamePhase(GamePhases.GAME_ENDED);
            return;
        }

        // Check for extra turn
        if (this.gameState.extraTurnEarned) {
            console.log('[Trouble] Extra turn earned!');
            this.gameState.giveExtraTurn();
            this.changeTurnPhase(TurnPhases.BEGIN_TURN);
        } else {
            this.gameState.extraTurnEarned = false;
            this.gameState.nextPlayerTurn();
            this.changeTurnPhase(TurnPhases.BEGIN_TURN);
        }
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
        // Convert pieces to include spaceId for UI rendering
        const piecesWithSpaceId = this.gameState.pieces.map(piece => ({
            ...piece,
            id: `${piece.playerId}-${piece.pieceIndex}`,
            spaceId: this.getSpaceIdForPiece(piece)
        }));

        const troubleState = {
            pieces: piecesWithSpaceId,
            currentPlayerIndex: this.gameState.currentPlayerIndex,
            currentPlayerId: this.gameState.getCurrentPlayer()?.playerId,
            lastRoll: this.gameState.lastRoll,
            turnPhase: this.gameState.turnPhase
        };

        this.logPhase('EMIT_STATE', troubleState);

        this.emitEvent('trouble:stateUpdated', troubleState);

        const delay = this.gameState?.settings?.getMoveDelay?.() ?? 0;
        this.proposeStateChange(this.gameState, delay);
    }

    getSpaceIdForPiece(piece) {
        // Convert position/status to spaceId for UI rendering
        switch (piece.status) {
            case PieceStatus.HOME:
                return `home-${piece.playerIndex}-${piece.pieceIndex}`;
            case PieceStatus.TRACK:
                return `track-${piece.position}`;
            case PieceStatus.FINISH:
                return `finish-${piece.playerIndex}-${piece.position}`;
            case PieceStatus.DONE:
                return `done-${piece.playerIndex}-${piece.pieceIndex}`;
            default:
                return `home-${piece.playerIndex}-${piece.pieceIndex}`;
        }
    }

    logPhase(label, extra = {}) {
        const currentPlayer = this.gameState.getCurrentPlayer();
        console.debug(`[Trouble][${label}]`, {
            phase: this.gameState.turnPhase,
            player: currentPlayer?.nickname,
            playerId: currentPlayer?.playerId,
            pendingRoll: this.pendingRoll,
            ...extra
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
