import BaseGameEngine from './BaseGameEngine.js';
import PhaseStateMachine from './components/PhaseStateMachine.js';
import TurnPhases from '../enums/TurnPhases.js';
import GamePhases from '../enums/GamePhases.js';
import { PieceStatus } from '../models/gameStates/TroubleGameState.js';
import { getVisibleElementById } from '../utils/helpers.js';

/**
 * TroubleGameEngine - simplified state-machine engine for Trouble
 *
 * Turn phase flow:
 *   BEGIN_TURN
 *     → (host picks/maintains current player, resets ephemeral state)
 *   WAITING_FOR_MOVE
 *     → roll button visible for current client only
 *     → on roll:
 *         - non-6: decide END_TURN or PLAYER_CHOOSING_DESTINATION
 *         - 6:     decide between auto-move-out, WAITING_FOR_MOVE_CHOICE, or PLAYER_CHOOSING_DESTINATION
 *   WAITING_FOR_MOVE_CHOICE
 *     → prompt only when roll == 6 AND both "move out" and "move existing" are legal
 *   PLAYER_CHOOSING_DESTINATION
 *     → pendingMoveOptions drives legal moves for a given roll
 *   PROCESSING_MOVE
 *     → transient / mostly logged; real move is done when piece is chosen
 *   END_TURN
 *     → host checks extraTurnEarned and either:
 *           - keeps same player and goes to BEGIN_TURN
 *           - or advances currentPlayerIndex and goes to BEGIN_TURN
 *
 * Roll button activation:
 *   Active ONLY when:
 *     - isClientTurn()
 *     - turnPhase === WAITING_FOR_MOVE
 *     - gameState.lastRoll == null
 *     - this.pendingRoll == null
 */
export default class TroubleGameEngine extends BaseGameEngine {
    constructor(dependencies, config = {}) {
        super(dependencies, config);

        // Geometry / rule parameters (can be overridden by board metadata)
        this.trackLength = config.trackLength || 28;
        this.finishLength = config.finishLength || 4;
        this.piecesPerPlayer = config.piecesPerPlayer || 4;

        // Ephemeral engine-only state
        this.pendingRoll = null;            // last roll being processed on host
        this.pendingMoveOptions = null;     // [{ pieceIndex, newPosition, newStatus }]
        this.running = false;
        this.initialized = false;
        this.activeDestinationChoice = null; // track click handlers for PLAYER_CHOOSING_DESTINATION

        // NOTE: choice for roll==6 is handled via onPlayerAction('ROLL_SIX_CHOICE')
        // and does not require extra persistent state besides pendingMoveOptions/pendingRoll.

        // Phase state machine setup (simpler than TurnBasedGameEngine but same idea)
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

    // ===== Phase handler registration =====

    registerPhaseHandlers() {
        // Game phase handlers
        this.phaseStateMachine.registerGamePhaseHandler(GamePhases.IN_LOBBY, () => this.handleInLobby());
        this.phaseStateMachine.registerGamePhaseHandler(GamePhases.IN_GAME, () => this.handleInGame());
        this.phaseStateMachine.registerGamePhaseHandler(GamePhases.PAUSED, () => this.handlePaused());
        this.phaseStateMachine.registerGamePhaseHandler(GamePhases.GAME_ENDED, () => this.handleGameEnded());

        // Turn phase handlers
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.BEGIN_TURN, () => this.handleBeginTurn());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.WAITING_FOR_MOVE, () => this.handleWaitingForMove());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.WAITING_FOR_MOVE_CHOICE, () => this.handleWaitingForMoveChoice());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.PLAYER_CHOOSING_DESTINATION, () => this.handlePlayerChoosingDestination());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.PROCESSING_MOVE, () => this.handleProcessingMove());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.END_TURN, () => this.handleEndTurn());
    }

    // ===== Lifecycle =====

    init() {
        // Setup roll button integration (UIComponentRegistry or UISystem)
        let rollButton = this.getUIComponent('rollButton');

        if (!rollButton && this.uiSystem) {
            rollButton = this.uiSystem.getComponent('rollButton');
        }

        if (rollButton) {
            // Always set callbacks
            rollButton.onRollDiceCallback = () => this.handleRollDiceForCurrentPlayer();
            rollButton.onRollCompleteCallback = (result) => this.handleAfterDiceRoll(result);

            if (!rollButton.initialized && typeof rollButton.init === 'function') {
                rollButton.init({
                    onRollDice: () => this.handleRollDiceForCurrentPlayer(),
                    onRollComplete: (result) => this.handleAfterDiceRoll(result)
                });
            }
        } else {
            console.warn('[Trouble] No roll button found during init');
        }

        // Initialize phase machine with current gameState phases
        this.phaseStateMachine.init(
            this.gameState?.gamePhase ?? GamePhases.IN_LOBBY,
            this.gameState?.turnPhase ?? TurnPhases.BEGIN_TURN
        );

        this.gameState.initializePieces();

        this.initialized = true;
        this.running = false;
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

    /**
     * Called whenever a new gameState arrives from the network / host.
     */
    updateGameState(gameState) {
        const prevGamePhase = this.gameState?.gamePhase;
        const prevTurnPhase = this.gameState?.turnPhase;

        this.gameState = gameState;

        // Drive phase state machine
        const gamePhaseChanged =
            this.phaseStateMachine?.getGamePhase?.() !== gameState.gamePhase ||
            prevGamePhase !== gameState.gamePhase;

        if (gamePhaseChanged) {
            this.phaseStateMachine.transitionGamePhase(gameState.gamePhase, { gameState: this.gameState });
        }

        const turnPhaseChanged =
            this.phaseStateMachine?.currentTurnPhase !== gameState.turnPhase ||
            prevTurnPhase !== gameState.turnPhase ||
            gamePhaseChanged;

        if (turnPhaseChanged) {
            this.phaseStateMachine.transitionTurnPhase(gameState.turnPhase, { gameState: this.gameState });
        }

        // UI: roll button state may change with any update
        this.updateRollButtonForClient();
    }

    // ===== Engine metadata =====

    getEngineType() {
        return 'trouble';
    }

    getPieceManagerType() {
        return 'trouble';
    }

    getEngineState() {
        return {
            initialized: this.initialized,
            running: this.running,
            currentPhase: this.gameState?.turnPhase ?? 'unknown',
            metadata: {
                pendingRoll: this.pendingRoll,
                currentPlayerIndex: this.gameState?.currentPlayerIndex ?? 0,
                lastRoll: this.gameState?.lastRoll ?? null
            }
        };
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

    // ===== UI helpers =====

    isClientTurn() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer) {
            console.log('[Trouble] isClientTurn: no current player');
            return false;
        }
        const isMyTurn = currentPlayer.peerId === this.peerId;
        console.log('[Trouble] isClientTurn:', {
            currentPlayer: currentPlayer.nickname,
            playerPeerId: currentPlayer.peerId,
            enginePeerId: this.peerId,
            isMyTurn
        });
        return isMyTurn;
    }

    activateRollButton() {
        console.log('[Trouble] Attempting to activate roll button');
        const rollButton = this.getUIComponent('rollButton');
        if (rollButton?.activate) {
            rollButton.activate();
            return;
        }
        if (this.uiSystem) {
            const btn = this.uiSystem.getComponent('rollButton');
            if (btn?.activate) {
                console.log('[Trouble] Activating roll button via uiSystem');
                btn.activate();
                return;
            }
        }
        console.warn('[Trouble] Roll button not found or no activate method');
    }

    deactivateRollButton() {
        const rollButton = this.getUIComponent('rollButton');
        if (rollButton?.deactivate) {
            rollButton.deactivate();
            return;
        }
        if (this.uiSystem) {
            const btn = this.uiSystem.getComponent('rollButton');
            if (btn?.deactivate) {
                btn.deactivate();
                return;
            }
        }
    }

    updateRollButtonForClient() {
        const gs = this.gameState;
        const canRoll =
            this.isClientTurn() &&
            gs.turnPhase === TurnPhases.WAITING_FOR_MOVE &&
            gs.lastRoll == null &&
            this.pendingRoll == null;

        if (canRoll) {
            this.activateRollButton();
        } else {
            this.deactivateRollButton();
        }
    }

    // ===== Player input from UI (local) =====

    handleRollDiceForCurrentPlayer() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer) return 0;

        if (!this.isClientTurn()) {
            console.warn('[Trouble] Not your turn, ignoring roll click');
            return 0;
        }

        // UI-level local roll (Pop-o-Matic animation)
        const rollResult = Math.floor(Math.random() * 6) + 1;
        this.pendingLocalRoll = rollResult;
        this.logPhase('ROLL_POPPED', { roll: rollResult, byHost: this.isHost });

        this.deactivateRollButton();
        return rollResult;
    }

    handleAfterDiceRoll(rollResult) {
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer) return;

        const resolvedRoll =
            typeof rollResult === 'number' ? rollResult : this.pendingLocalRoll;
        this.pendingLocalRoll = null;

        if (typeof resolvedRoll !== 'number') {
            console.warn('[Trouble] Could not resolve roll result');
            return;
        }

        this.handleRoll(currentPlayer, resolvedRoll);
    }

    // ===== Network-facing player action API =====

    /**
     * Host-side handler for explicit player actions coming over the network.
     * @param {string} playerId
     * @param {string} actionType
     * @param {Object} actionData
     * @returns {Promise<{success:boolean, error?:string}>}
     */
    async onPlayerAction(playerId, actionType, actionData = {}) {
        if (!this.running) {
            return { success: false, error: 'Game is not running' };
        }

        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.playerId !== playerId) {
            return { success: false, error: 'It is not your turn' };
        }

        if (!this.isHost) {
            // Only the host should apply authoritative state changes.
            return { success: false, error: 'Only host can process actions' };
        }

        switch (actionType) {
            case 'ROLL_DICE':
                this.handleRoll(currentPlayer, actionData?.rollResult);
                return { success: true };

            case 'ROLL_SIX_CHOICE':
                this.handleRollSixChoice(currentPlayer, actionData?.choice);
                return { success: true };

            case 'SELECT_PIECE':
                return this.handlePieceSelection(currentPlayer, actionData.pieceIndex);

            default:
                return { success: false, error: `Unknown action type: ${actionType}` };
        }
    }

    // ===== Game phase handlers =====

    handleInLobby() {
        this.running = false;
        this.logPhase('IN_LOBBY');

        // Always regenerate pieces so the lobby UI stays valid
        this.gameState.initializePieces();

        // Push update to all clients
        this.emitStateUpdate();

        this.deactivateRollButton();
    }

    handleInGame() {
        this.running = true;
        this.logPhase('IN_GAME');
        this.updateRollButtonForClient();
    }

    handlePaused() {
        this.running = false;
        this.logPhase('PAUSED');
        this.deactivateRollButton();
    }

    handleGameEnded() {
        this.running = false;
        this.logPhase('GAME_ENDED');
        this.deactivateRollButton();
    }

    // ===== Turn phase handlers =====

    handleBeginTurn() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        this.logPhase('BEGIN_TURN', {
            player: currentPlayer?.nickname,
            playerId: currentPlayer?.playerId
        });

        // Clear ephemeral engine state
        this.pendingRoll = null;
        this.pendingMoveOptions = null;
        this.gameState.lastRoll = null;

        // Now transition to WAITING_FOR_MOVE
        this.gameState.setTurnPhase(TurnPhases.WAITING_FOR_MOVE);
        this.emitStateUpdate();   // Important

        this.updateRollButtonForClient();
    }


    handleWaitingForMove() {
        this.logPhase('WAITING_FOR_MOVE');
        this.updateRollButtonForClient();
    }

    handleWaitingForMoveChoice() {
        this.logPhase('WAITING_FOR_MOVE_CHOICE', {
            hasOptions: Array.isArray(this.pendingMoveOptions) && this.pendingMoveOptions.length > 0,
            pendingRoll: this.pendingRoll
        });
        this.deactivateRollButton();
    }

    handlePlayerChoosingDestination() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        const optionCount = this.pendingMoveOptions?.length || 0;

        this.logPhase('PLAYER_CHOOSING_DESTINATION', {
            options: optionCount,
            roll: this.pendingRoll ?? this.gameState.lastRoll ?? null
        });

        // No options → just end the turn
        if (!this.pendingMoveOptions || optionCount === 0) {
            this.cleanupDestinationSelection();
            this.gameState.setTurnPhase(TurnPhases.END_TURN);
            this.emitStateUpdate();
            return;
        }

        // Only the active client should get clickable options
        if (!this.isClientTurn()) {
            this.deactivateRollButton();
            this.cleanupDestinationSelection();
            return;
        }

        this.deactivateRollButton();
        this.setupDestinationSelection(currentPlayer, this.pendingMoveOptions);
    }


    handleProcessingMove() {
        this.logPhase('PROCESSING_MOVE', { pendingRoll: this.pendingRoll });
        // All real movement happens in handlePieceSelection.
    }

    handleEndTurn() {
        this.cleanupDestinationSelection();
        this.logPhase('END_TURN');

        // Only host advances turn
        if (!this.isHost) {
            this.updateRollButtonForClient();
            return;
        }

        const currentPlayer = this.gameState.getCurrentPlayer();
        const pieces = currentPlayer
            ? this.gameState.getPlayerPieces(currentPlayer.playerId)
            : [];

        const donePieces = pieces.filter(p => p.status === PieceStatus.DONE);
        if (
            currentPlayer &&
            donePieces.length >= this.piecesPerPlayer
        ) {
            console.log(`[Trouble] ${currentPlayer.nickname} wins!`);
            this.gameState.setGamePhase(GamePhases.GAME_ENDED);
            this.emitStateUpdate();
            return;
        }

        // Extra turn?
        if (this.gameState.extraTurnEarned) {
            console.log('[Trouble] Extra turn earned');
            this.gameState.extraTurnEarned = false;
            this.gameState.lastRoll = null;
            this.gameState.setTurnPhase(TurnPhases.BEGIN_TURN);
            this.emitStateUpdate();
            return;
        }

        // Normal next player
        this.gameState.nextPlayerTurn();
        this.gameState.setTurnPhase(TurnPhases.BEGIN_TURN);
        this.emitStateUpdate();
    }

    // ===== Core Trouble rules =====

    /**
     * Handle dice result for current player (host-only).
     */
    handleRoll(currentPlayer, roll) {
        if (this.gameState.turnPhase !== TurnPhases.WAITING_FOR_MOVE) {
            return;
        }

        this.gameState.lastRoll = roll;
        this.pendingRoll = roll;

        const pieces = this.gameState.getPlayerPieces(currentPlayer.playerId);
        const piecesAtHome = pieces.filter(p => p.status === PieceStatus.HOME);
        const piecesOut = pieces.filter(
            p => p.status === PieceStatus.TRACK || p.status === PieceStatus.FINISH
        );

        const moveOptions = this.findMoveOptions(currentPlayer, roll);
        const hasMoveOptions = moveOptions.length > 0;

        const canMoveOut =
            roll === 6 &&
            piecesAtHome.length > 0 &&
            this.canMoveOutToStart(currentPlayer);

        // ---- Roll not 6 ----
        if (roll !== 6) {
            if (piecesOut.length === 0) {
                // No pieces out → nothing can happen
                this.pendingRoll = null;
                this.pendingMoveOptions = null;
                this.gameState.setTurnPhase(TurnPhases.END_TURN);
                this.emitStateUpdate();
                return;
            }

            if (!hasMoveOptions) {
                // Pieces out but no legal move
                this.pendingRoll = null;
                this.pendingMoveOptions = null;
                this.gameState.setTurnPhase(TurnPhases.END_TURN);
                this.emitStateUpdate();
                return;
            }

            // Normal move: player chooses one piece
            this.pendingMoveOptions = moveOptions;
            this.gameState.setTurnPhase(TurnPhases.PLAYER_CHOOSING_DESTINATION);
            this.emitStateUpdate();
            return;
        }

        // ---- Roll == 6 ----
        if (piecesOut.length === 0) {
            // Case A — No pieces out, auto move out if possible
            if (canMoveOut) {
                const piece = piecesAtHome[0];
                this.movePieceOut(currentPlayer, piece.pieceIndex);
                this.gameState.extraTurnEarned = true;
                this.pendingRoll = null;
                this.pendingMoveOptions = null;
                this.gameState.setTurnPhase(TurnPhases.END_TURN);
                this.emitStateUpdate();
                return;
            }

            // Should be impossible, but fallback: extra turn with no move
            this.gameState.extraTurnEarned = true;
            this.pendingRoll = null;
            this.pendingMoveOptions = null;
            this.gameState.setTurnPhase(TurnPhases.END_TURN);
            this.emitStateUpdate();
            return;
        }

        // We have at least one piece out
        const hasHomePieces = piecesAtHome.length > 0;

        if (hasHomePieces && canMoveOut && hasMoveOptions) {
            // Case B — pieces out AND pieces in home AND both actions are legal
            // Defer to WAITING_FOR_MOVE_CHOICE
            this.pendingMoveOptions = moveOptions;
            this.gameState.setTurnPhase(TurnPhases.WAITING_FOR_MOVE_CHOICE);
            this.emitStateUpdate();
            return;
        }

        if (hasHomePieces && canMoveOut && !hasMoveOptions) {
            // Only option is to move a piece out
            const piece = piecesAtHome[0];
            this.movePieceOut(currentPlayer, piece.pieceIndex);
            this.gameState.extraTurnEarned = true;
            this.pendingRoll = null;
            this.pendingMoveOptions = null;
            this.gameState.setTurnPhase(TurnPhases.END_TURN);
            this.emitStateUpdate();
            return;
        }

        if (!canMoveOut && hasMoveOptions) {
            // Must move an existing piece
            this.gameState.extraTurnEarned = true;
            this.pendingMoveOptions = moveOptions;
            this.gameState.setTurnPhase(TurnPhases.PLAYER_CHOOSING_DESTINATION);
            this.emitStateUpdate();
            return;
        }

        if (!canMoveOut && !hasMoveOptions) {
            // Cannot move out, cannot move forward → extra turn but no move
            this.gameState.extraTurnEarned = true;
            this.pendingRoll = null;
            this.pendingMoveOptions = null;
            this.gameState.setTurnPhase(TurnPhases.END_TURN);
            this.emitStateUpdate();
            return;
        }

        // Fallback (should not reach)
        console.warn('[Trouble] Unexpected roll==6 case fallback');
        this.gameState.extraTurnEarned = true;
        this.pendingRoll = null;
        this.pendingMoveOptions = null;
        this.gameState.setTurnPhase(TurnPhases.END_TURN);
        this.emitStateUpdate();
    }

    /**
     * Handle player’s choice when roll == 6 and BOTH move-out and move-existing are possible.
     * @param {Object} currentPlayer
     * @param {'MOVE_OUT'|'MOVE_EXISTING'} choice
     */
    handleRollSixChoice(currentPlayer, choice) {
        if (this.gameState.turnPhase !== TurnPhases.WAITING_FOR_MOVE_CHOICE) return;

        if (choice === 'MOVE_OUT') {
            const pieces = this.gameState.getPlayerPieces(currentPlayer.playerId);
            const piecesAtHome = pieces.filter(p => p.status === PieceStatus.HOME);

            if (piecesAtHome.length === 0) {
                console.warn('[Trouble] MOVE_OUT chosen but no pieces at home');
                return;
            }

            const piece = piecesAtHome[0];
            this.movePieceOut(currentPlayer, piece.pieceIndex);
            this.gameState.extraTurnEarned = true;

            this.pendingRoll = null;
            this.pendingMoveOptions = null;

            this.gameState.setTurnPhase(TurnPhases.END_TURN);
            this.emitStateUpdate();
            return;
        }

        if (choice === 'MOVE_EXISTING') {
            // Move one of the existing pieces
            if (!Array.isArray(this.pendingMoveOptions) || this.pendingMoveOptions.length === 0) {
                console.warn('[Trouble] MOVE_EXISTING chosen but no move options');
                this.gameState.extraTurnEarned = true;
                this.gameState.setTurnPhase(TurnPhases.END_TURN);
                this.emitStateUpdate();
                return;
            }

            this.gameState.extraTurnEarned = true;
            this.gameState.setTurnPhase(TurnPhases.PLAYER_CHOOSING_DESTINATION);
            this.emitStateUpdate();
            return;
        }

        console.warn('[Trouble] Unknown WAITING_FOR_MOVE_CHOICE action:', choice);
    }

    // ===== Selection of piece for movement =====

    handlePieceSelection(currentPlayer, pieceIndex) {
        if (this.gameState.turnPhase !== TurnPhases.PLAYER_CHOOSING_DESTINATION) {
            return { success: false, error: 'Not in destination-selection phase' };
        }

        if (!Array.isArray(this.pendingMoveOptions) || this.pendingMoveOptions.length === 0) {
            return { success: false, error: 'No move options available' };
        }

        const option = this.pendingMoveOptions.find(opt => opt.pieceIndex === pieceIndex);
        if (!option) {
            return { success: false, error: 'Invalid move selection' };
        }

        // Apply move
        this.movePiece(currentPlayer, option.pieceIndex, option.newPosition, option.newStatus);

        // Clear ephemeral state
        this.pendingMoveOptions = null;
        this.pendingRoll = null;
        this.gameState.lastRoll = null;

        // Mark engine transient phase
        this.gameState.setTurnPhase(TurnPhases.END_TURN);
        this.emitStateUpdate();

        return { success: true };
    }

    // ===== Movement logic =====

    /**
     * Compute legal move options for a given roll
     */
    findMoveOptions(currentPlayer, roll) {
        const opts = [];
        const pieces = this.gameState.getPlayerPieces(currentPlayer.playerId);

        for (const piece of pieces) {
            if (piece.status === PieceStatus.HOME) continue;
            if (piece.status === PieceStatus.DONE) continue;

            const newPos = piece.position + roll;

            if (piece.status === PieceStatus.TRACK) {
                const finishEntryPos = this.getFinishEntryPosition();

                if (newPos < finishEntryPos) {
                    if (this.canMoveTo(piece, newPos, PieceStatus.TRACK)) {
                        opts.push({
                            pieceIndex: piece.pieceIndex,
                            newPosition: newPos,
                            newStatus: PieceStatus.TRACK
                        });
                    }
                } else if (newPos === finishEntryPos) {
                    const finishIdx = 0;
                    if (this.canMoveTo(piece, finishIdx, PieceStatus.FINISH)) {
                        opts.push({
                            pieceIndex: piece.pieceIndex,
                            newPosition: finishIdx,
                            newStatus: PieceStatus.FINISH
                        });
                    }
                } else {
                    // Overshoot into finish (exact required)
                    const stepsToFinish = finishEntryPos - piece.position;
                    const finishIdx = roll - stepsToFinish - 1;

                    if (finishIdx >= 0 && finishIdx < this.finishLength) {
                        if (this.canMoveTo(piece, finishIdx, PieceStatus.FINISH)) {
                            opts.push({
                                pieceIndex: piece.pieceIndex,
                                newPosition: finishIdx,
                                newStatus: PieceStatus.FINISH
                            });
                        }
                    }
                }
            }

            else if (piece.status === PieceStatus.FINISH) {
                if (newPos < this.finishLength) {
                    if (this.canMoveTo(piece, newPos, PieceStatus.FINISH)) {
                        opts.push({
                            pieceIndex: piece.pieceIndex,
                            newPosition: newPos,
                            newStatus: PieceStatus.FINISH
                        });
                    }
                } else if (newPos === this.finishLength) {
                    opts.push({
                        pieceIndex: piece.pieceIndex,
                        newPosition: this.finishLength,
                        newStatus: PieceStatus.DONE
                    });
                }
            }
        }

        return opts;
    }

    /**
     * Check if a move to (newPosition, newStatus) is legal.
     * Enforces: cannot land on own piece; cannot land in another player's finish line.
     */
    canMoveTo(piece, newPosition, newStatus) {
        const ownPieces = this.gameState.getPlayerPieces(piece.playerId);

        // Cannot land on own piece
        for (const other of ownPieces) {
            if (other.pieceIndex === piece.pieceIndex) continue;
            if (other.status === newStatus && other.position === newPosition) {
                return false;
            }
        }

        // Finishes are per-player; cannot enter another player's finish line
        if (newStatus === PieceStatus.FINISH && piece.status !== PieceStatus.FINISH) {
            // Valid only if it's THIS player's finish
            return true;
        }

        return true;
    }

    /**
     * Move piece out of HOME onto START (0), bumping opponents.
     */
    movePieceOut(currentPlayer, pieceIndex) {
        const piece = this.gameState.getPiece(currentPlayer.playerId, pieceIndex);
        if (!piece) return;

        const startPos = 0;

        // Check if own piece is blocking START
        const ownPieces = this.gameState.getPlayerPieces(currentPlayer.playerId);
        if (ownPieces.some(p => p.status === PieceStatus.TRACK && p.position === startPos)) {
            // Cannot move out
            return;
        }

        // Bump opponents
        this.bumpOpponentsAt(currentPlayer.playerId, startPos, PieceStatus.TRACK);

        this.gameState.updatePiece(
            currentPlayer.playerId,
            pieceIndex,
            startPos,
            PieceStatus.TRACK
        );
        console.log(`[Trouble] Moved piece ${pieceIndex} out to START`);
    }

    /**
     * Move piece to new position/status, bump if applicable.
     */
    movePiece(currentPlayer, pieceIndex, newPosition, newStatus) {
        if (newStatus === PieceStatus.TRACK) {
            this.bumpOpponentsAt(currentPlayer.playerId, newPosition, PieceStatus.TRACK);
        }

        this.gameState.updatePiece(
            currentPlayer.playerId,
            pieceIndex,
            newPosition,
            newStatus
        );
        console.log(`[Trouble] Moved piece ${pieceIndex} → ${newStatus}:${newPosition}`);
    }

    /**
     * Bump all opponent pieces at (position, status) back to HOME.
     */
    bumpOpponentsAt(playerId, position, status) {
        for (const piece of this.gameState.pieces) {
            if (piece.playerId === playerId) continue;
            if (piece.status === status && piece.position === position) {
                this.gameState.updatePiece(piece.playerId, piece.pieceIndex, -1, PieceStatus.HOME);
                console.log(`[Trouble] Bumped opponent ${piece.pieceIndex} to HOME`);
            }
        }
    }

    getFinishEntryPosition() {
        return this.trackLength;
    }

    canMoveOutToStart(currentPlayer) {
        const ownPieces = this.gameState.getPlayerPieces(currentPlayer.playerId);
        return !ownPieces.some(
            p => p.status === PieceStatus.TRACK && p.position === 0
        );
    }

    initializePieces() {
        this.pieces = [];
        if (!this.players) return;

        this.players.forEach((player, playerIndex) => {
            for (let pieceIndex = 0; pieceIndex < 4; pieceIndex++) {
                this.pieces.push({
                    playerId: player.playerId,
                    playerIndex,
                    pieceIndex,
                    status: PieceStatus.HOME,
                    position: -1
                });
            }
        });
    }

    setupDestinationSelection(currentPlayer, moveOptions) {
        // Headless / no DOM → auto-select first option to avoid deadlock
        //if (typeof document === 'undefined') {
        //    const first = moveOptions[0];
        //    this.handlePieceSelection(currentPlayer, first.pieceIndex);
        //    return;
        //}

        // Clean up any previous selection state
        this.cleanupDestinationSelection();

        const handlers = new Map();
        const usedSpaceIds = new Set();

        moveOptions.forEach(option => {
            const piece = this.gameState.getPiece(currentPlayer.playerId, option.pieceIndex);
            if (!piece) {
                console.warn('[Trouble] No piece found for option', option);
                return;
            }

            const spaceId = this.getSpaceIdForDestination(piece, option);
            if (!spaceId || usedSpaceIds.has(spaceId)) {
                return;
            }
            usedSpaceIds.add(spaceId);

            const domId = `space-${spaceId}`;
            const el = getVisibleElementById(domId);
            if (!el) {
                console.warn('[Trouble] No DOM element found for destination', domId);
                return;
            }

            el.classList.add('highlight');

            const handler = () => {
                // On click: cleanup, then apply move selection
                this.cleanupDestinationSelection();
                this.handlePieceSelection(currentPlayer, option.pieceIndex);
            };

            el.addEventListener('click', handler);
            handlers.set(spaceId, { element: el, handler });
        });

        this.activeDestinationChoice = {
            playerId: currentPlayer.playerId,
            handlers
        };

        if (handlers.size === 0) {
            // No visible targets → fall back to auto-select first option.
            console.warn('[Trouble] No clickable destinations; auto-selecting first move option.');
            const first = moveOptions[0];
            this.handlePieceSelection(currentPlayer, first.pieceIndex);
        }
    }

    getSpaceIdForDestination(piece, option) {
        switch (option.newStatus) {
            case PieceStatus.TRACK:
                // Map to generic board id "track-<pos>" → DOM id "space-track-<pos>"
                return `track-${option.newPosition}`;
            case PieceStatus.FINISH:
                // Per-player finish lane
                return `finish-${piece.playerIndex}-${option.newPosition}`;
            case PieceStatus.DONE:
                // Final slot; may or may not have a dedicated DOM node
                return `done-${piece.playerIndex}-${piece.pieceIndex}`;
            default:
                return null;
        }
    }

    cleanupDestinationSelection() {
        if (!this.activeDestinationChoice) return;

        const { handlers } = this.activeDestinationChoice;
        handlers.forEach(({ element, handler }) => {
            if (element && handler) {
                element.removeEventListener('click', handler);
                element.classList.remove('highlight');
            }
        });

        this.activeDestinationChoice = null;
    }



    // ===== Emit state update =====

    emitStateUpdate() {
        const piecesWithSpaceIds = this.gameState.pieces.map(piece => ({
            ...piece,
            id: `${piece.playerId}-${piece.pieceIndex}`,
            spaceId: this.getSpaceIdForPiece(piece)
        }));

        const troubleState = {
            pieces: piecesWithSpaceIds,
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

    // ===== UI Component Requirements =====

    getRequiredUIComponents() {
        return [
            {
                id: 'rollButton',
                type: 'button',
                required: true,
                description: 'Pop-o-Matic Dice Button',
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
                description: 'Trouble board renderer',
                events: {
                    emits: [],
                    listens: ['trouble:stateUpdated']
                }
            }
        ];
    }
}

            
