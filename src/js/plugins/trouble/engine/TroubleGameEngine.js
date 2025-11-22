import MultiPieceGameEngine from '../../../game/engines/MultiPieceGameEngine.js';
import TurnPhases from '../../../game/phases/TurnPhases.js';
import GamePhases from '../../../game/phases/GamePhases.js';
import GameLogPopupController from '../../../../deprecated/legacy/controllers/GameLogPopupController.js';
import ModalUtil from '../../../infrastructure/utils/ModalUtil.js';
import { getVisibleElementById } from '../../../infrastructure/utils/helpers.js';
import PlayerStates from '../../../game/phases/PlayerStates.js';

export default class TroubleGameEngine extends MultiPieceGameEngine {
    /**
     * Create a Trouble game engine
     * @param {Object} dependencies - Core dependencies
     * @param {Object} config - Engine configuration
     */
    constructor(dependencies, config = {}) {
        super(dependencies, {
            ...config,
            piecesPerPlayer: 4,
            allowCapture: true,
            safeSpaces: [] // Finish lanes are implicitly safe
        });

        this.TRACK_LENGTH = config.trackLength || 28;
        this.finishLength = config.finishLength || 4;
        this.startOffsets = Array.isArray(config.startOffsets) && config.startOffsets.length
            ? config.startOffsets
            : [0, 7, 14, 21];

        this.currentRoll = null;
        this.availableMoves = new Map(); // pieceId -> move descriptor
        this.gameLogPopupController = new GameLogPopupController(this.eventBus);
        this.awaitingMoveChoice = false;
        this.targetMoves = new Map(); // spaceId -> move descriptor
        this.manualSpaceHandlers = new Map(); // spaceId -> handler
        this.devManualRoll = Boolean(
            config.debugChooseRoll ||
            (typeof window !== 'undefined' && window.__TROUBLE_DEV_MANUAL_ROLL__) ||
            localStorage.getItem('troubleDevManualRoll') === 'true'
        );

        this.handlePieceClick = this.handlePieceClick.bind(this);
        this.handleSpaceClick = this.handleSpaceClick.bind(this);
        this.winners = new Set();
    }

    async promptStartOrBoardMove() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal custom-modal';
            modal.style.display = 'block';

            const content = document.createElement('div');
            content.className = 'modal-content';

            const title = document.createElement('h2');
            title.textContent = 'Choose your action';
            content.appendChild(title);

            const message = document.createElement('p');
            message.textContent = 'Pick whether to move a new piece out of home or move an existing piece on the board.';
            content.appendChild(message);

            const buttons = document.createElement('div');
            buttons.className = 'modal-buttons';
            buttons.style.display = 'flex';
            buttons.style.justifyContent = 'center';
            buttons.style.gap = '12px';

            const startBtn = document.createElement('button');
            startBtn.className = 'button button-primary';
            startBtn.textContent = 'Move piece out of home';
            startBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(true);
            });

            const boardBtn = document.createElement('button');
            boardBtn.className = 'button button-secondary';
            boardBtn.textContent = 'Move piece on board';
            boardBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false);
            });

            buttons.appendChild(startBtn);
            buttons.appendChild(boardBtn);
            content.appendChild(buttons);
            modal.appendChild(content);
            document.body.appendChild(modal);
        });
    }

    /**
     * Get engine type identifier
     * @returns {string} Engine type
     */
    getEngineType() {
        return 'trouble';
    }

    getPieceManagerType() {
        return 'trouble';
    }

    /**
     * Initialize the engine
     */
    init() {
        super.init();
        this.setupPlayerPieces();
        this.registerEventListeners();
        this.initGameLog();
        this.wireRollButtonCallbacks();
        this.setRollButtonActive(this.isClientTurn());
        if (this.gameState?.setTurnPhase) {
            this.gameState.setTurnPhase(TurnPhases.BEGIN_TURN);
        }
        console.log('[TroubleGameEngine] Initialized');
    }

    cleanup() {
        if (this.eventBus?.off) {
            this.eventBus.off('pieceClicked', this.handlePieceClick);
        }
        if (this.gameLogPopupController?.destroy) {
            this.gameLogPopupController.destroy();
        }
        super.cleanup();
        this.availableMoves.clear();
        this.currentRoll = null;
    }

    registerEventListeners() {
        if (!this.eventBus?.on) return;
        this.eventBus.on('pieceClicked', this.handlePieceClick);
        this.eventBus.on('spaceClicked', this.handleSpaceClick);
    }

    initGameLog() {
        const gameLog = this.getUIComponent('gameLog');
        if (gameLog?.init) {
            gameLog.init();
        }
        if (this.gameLogPopupController) {
            this.gameLogPopupController.init();
        }
    }

    setupPlayerPieces() {
        if (!Array.isArray(this.gameState?.players)) return;

        this.gameState.players.forEach((player, index) => {
            if (!Array.isArray(player.pieces) || player.pieces.length === 0) {
                player.pieces = [];
                for (let i = 0; i < this.piecesPerPlayer; i++) {
                    player.pieces.push({
                        id: `${player.playerId}-piece-${i + 1}`,
                        playerId: player.playerId,
                        label: String(i + 1),
                        state: 'home',
                        startIndex: this.getStartIndexForPlayer(index),
                        startSpaceId: this.getTrackSpaceId(this.getStartIndexForPlayer(index)),
                        currentSpaceId: this.getHomeSpaceId(index, i),
                        homeIndex: i,
                        stepsFromStart: null,
                        finishIndex: null,
                        isSelectable: false
                    });
                }
            } else {
                player.pieces.forEach((piece, i) => {
                    if (piece.startIndex === undefined) {
                        piece.startIndex = this.getStartIndexForPlayer(index);
                        piece.startSpaceId = this.getTrackSpaceId(piece.startIndex);
                    }
                    if (piece.homeIndex === undefined) {
                        piece.homeIndex = i;
                    }
                    if (!piece.currentSpaceId) {
                        piece.currentSpaceId = piece.state === 'home'
                            ? this.getHomeSpaceId(index, piece.homeIndex)
                            : piece.startSpaceId;
                    }
                });
            }
        });
    }

    handlePieceClick({ pieceId, playerId }) {
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.playerId !== playerId) {
            return;
        }
        this.handlePieceSelection(pieceId);
    }

    handleSpaceClick({ space, spaceId }) {
        if (!this.awaitingMoveChoice || !this.isClientTurn()) return;
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer) return;

        const targetId = spaceId || space?.id || space?.spaceId || null;
        const move = targetId ? this.findMoveByTarget(targetId) : null;
        if (move) {
            console.log(`[Trouble] Space clicked ${targetId}, resolving move for piece ${move.pieceId}`);
            this.handleMovePiece(currentPlayer.playerId, {
                pieceId: move.pieceId,
                targetSpaceId: move.targetSpaceId
            });
        }
    }

    /**
     * Override to support dev manual rolls
     */
    rollDiceForCurrentPlayer() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        let rollResult = null;

        if (this.devManualRoll) {
            const raw = window.prompt?.('Enter roll (1-6)', '6');
            const parsed = Number.parseInt(raw, 10);
            if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 6) {
                rollResult = parsed;
            }
        }

        if (rollResult === null) {
            rollResult = currentPlayer.rollDice();
        }

        console.log(`${currentPlayer.nickname} rolled a ${rollResult}${this.devManualRoll ? ' (dev override)' : ''}`);

        this.emitEvent('playerRoll', {
            gameState: this.gameState,
            result: rollResult
        });

        return rollResult;
    }

    /**
     * Handle after dice roll (Pop-O-Matic logic)
     * @param {number} rollResult
     */
    async handleAfterDiceRoll(rollResult) {
        this.currentRoll = rollResult;
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer) {
            return;
        }
        if (this.winners.has(currentPlayer.playerId)) {
            console.log('[Trouble] Skipping turn for winner', currentPlayer.nickname);
            this.endTurnForPlayer(currentPlayer);
            return;
        }
        console.log(`[Trouble] Roll result ${rollResult} for ${currentPlayer.nickname}`);
        this.log(`Rolled a ${rollResult}`, { player: currentPlayer.nickname, type: 'roll' });
        const validMoves = this.getValidMovesForPlayer(currentPlayer, rollResult);
        console.log('[Trouble] Valid moves', validMoves);

        this.availableMoves = new Map(validMoves.map(move => [move.pieceId, move]));
        this.markSelectablePieces(currentPlayer, validMoves);
        this.awaitingMoveChoice = false;
        this.targetMoves.clear();
        this.setRollButtonActive(false);
        this.startTurnTimer();

        if (validMoves.length === 0) {
            // No legal moves: either roll again on 6 or pass turn
            if (rollResult === 6) {
                this.emitEvent('extraRollGranted', { playerId: currentPlayer?.playerId });
                this.currentRoll = null;
                this.setRollButtonActive(this.isClientTurn());
            } else {
                this.endTurnForPlayer(currentPlayer);
            }
            this.markSelectablePieces(null, []);
            this.proposeStateChange(this.gameState);
            return;
        }

        const startMoves = validMoves.filter(m => m.targetState === 'track' && m.progress === 0);
        const nonStartMoves = validMoves.filter(m => !(m.targetState === 'track' && m.progress === 0));

        // If both a "bring out" move and other moves exist on a 6, ask the player
        if (rollResult === 6 && startMoves.length > 0 && nonStartMoves.length > 0) {
            const takeStart = await this.promptStartOrBoardMove();
            if (takeStart) {
                const move = startMoves[0];
                this.handleMovePiece(currentPlayer.playerId, {
                    pieceId: move.pieceId,
                    targetSpaceId: move.targetSpaceId
                });
                return;
            }

            // Player chose to move existing piece: limit choices to non-start moves
            this.availableMoves = new Map(nonStartMoves.map(move => [move.pieceId, move]));
            this.markSelectablePieces(currentPlayer, nonStartMoves);
            await this.awaitMoveSelection(nonStartMoves, currentPlayer);
            return;
        }

        const allPiecesHome = (currentPlayer.pieces || []).every(p => p.state === 'home');
        const autoMove = (rollResult === 6 && allPiecesHome) || validMoves.length === 1;
        if (autoMove) {
            const priorityMove = validMoves.find(m => m.targetState === 'track') || validMoves[0];
            this.handleMovePiece(currentPlayer.playerId, {
                pieceId: priorityMove.pieceId,
                targetSpaceId: priorityMove.targetSpaceId
            });
            return;
        }

        await this.awaitMoveSelection(validMoves, currentPlayer);
    }

    /**
     * Handle piece selection (from UI or event bus)
     */
    handlePieceSelection(pieceId) {
        this.selectedPieceId = pieceId;

        const boardInteraction = this.getUIComponent('boardInteraction');
        if (boardInteraction?.highlightValidMoves) {
            const validMoves = this.getValidMovesForPiece(pieceId);
            boardInteraction.highlightValidMoves(validMoves.map(move => move.targetSpaceId));
            if (validMoves.length === 1) {
                const move = validMoves[0];
                const player = this.gameState.getCurrentPlayer();
                if (player) {
                    this.logPlayerAction(player, `auto-moving piece ${pieceId} to ${move.targetSpaceId}`, { type: 'movement' });
                    this.handleMovePiece(player.playerId, {
                        pieceId,
                        targetSpaceId: move.targetSpaceId
                    });
                }
            }
        }
    }

    /**
     * Handle piece movement with Trouble rules
     */
    async handleMovePiece(playerId, actionData) {
        const roll = this.currentRoll;
        if (!roll) {
            return { success: false, error: 'Roll the die first' };
        }

        const player = this.gameState.getPlayerByPlayerId?.(playerId) ||
            this.gameState.players.find(p => p.playerId === playerId);
        if (!player) {
            return { success: false, error: 'Invalid player' };
        }

        const piece = player.pieces?.find(p => p.id === (this.selectedPieceId || actionData.pieceId));
        if (!piece) {
            return { success: false, error: 'No piece selected' };
        }

        if (!actionData?.targetSpaceId) {
            return { success: false, error: 'Target space required' };
        }

        const validMoves = this.getValidMovesForPiece(piece.id, roll);
        const move = validMoves.find(m => m.targetSpaceId === actionData.targetSpaceId);
        if (!move) {
            return { success: false, error: 'Invalid move for this roll' };
        }

        this.applyMove(player, piece, move);
        this.selectedPieceId = null;
        this.availableMoves.clear();
        this.awaitingMoveChoice = false;
        this.targetMoves.clear();
        this.cleanupManualSpaceChoice();

        const winner = this.checkForWinner(player);
        let extraTurn = roll === 6;
        this.currentRoll = null;

        if (winner) {
            this.handleWinner(player);
            extraTurn = false;
        }

        if (!winner && !extraTurn) {
            this.endTurnForPlayer(player);
        } else if (extraTurn) {
            this.emitEvent('extraRollGranted', { playerId: player.playerId });
            this.markSelectablePieces(null, []);
            this.setRollButtonActive(this.isClientTurn());
            this.proposeStateChange(this.gameState);
        }

        return {
            success: true,
            data: {
                pieceId: piece.id,
                toSpaceId: move.targetSpaceId,
                state: piece.state
            }
        };
    }

    endTurnForPlayer(player) {
        if (this.gameState?.nextPlayerTurn) {
            this.gameState.nextPlayerTurn();
        }
        this.selectedPieceId = null;
        this.availableMoves.clear();
        this.awaitingMoveChoice = false;
        this.targetMoves.clear();
        this.cleanupManualSpaceChoice();
        this.currentRoll = null;
        this.markSelectablePieces(null, []);
        this.emitEvent('turnEnded', { playerId: player?.playerId });
        this.getUIComponent('boardInteraction')?.clearHighlights?.();
        this.setRollButtonActive(this.isClientTurn());
        this.stopTurnTimer();
        this.proposeStateChange(this.gameState);
    }

    /**
     * Check if a piece can move to a space using the latest computed moves
     */
    canPieceMoveToSpace(piece, targetSpaceId) {
        if (!piece) return false;
        const move = this.availableMoves.get(piece.id);
        return Boolean(move && move.targetSpaceId === targetSpaceId);
    }

    /**
     * Get valid moves for a piece based on current roll
     * @param {string} pieceId
     */
    getValidMovesForPiece(pieceId, roll = this.currentRoll) {
        if (!pieceId || !roll) return [];
        if (this.availableMoves.has(pieceId)) {
            return [this.availableMoves.get(pieceId)];
        }

        const player = this.gameState.players.find(p => p.pieces?.some(pc => pc.id === pieceId));
        if (!player) return [];
        return this.getValidMovesForPlayer(player, roll).filter(move => move.pieceId === pieceId);
    }

    /**
     * Compute all valid moves for a player given a roll
     */
    getValidMovesForPlayer(player, roll = this.currentRoll) {
        if (!player || !Array.isArray(player.pieces) || !roll) return [];
        if (this.winners.has(player.playerId)) return [];
        const playerIndex = this.getPlayerIndex(player.playerId);
        if (playerIndex === -1) return [];

        const moves = [];
        player.pieces.forEach(piece => {
            const move = this.calculateMoveForPiece(piece, playerIndex, roll);
            if (move) {
                moves.push(move);
            }
        });
        return moves;
    }

    calculateMoveForPiece(piece, playerIndex, roll) {
        if (!piece || piece.state === 'done') return null;

        if (piece.state === 'home') {
            if (roll !== 6) return null;
            const startSpaceId = this.getTrackSpaceId(this.getStartIndexForPlayer(playerIndex));
            if (this.isSpaceBlockedByOwn(playerIndex, startSpaceId)) return null;

            return {
                pieceId: piece.id,
                targetSpaceId: startSpaceId,
                targetState: 'track',
                progress: 0,
                finishIndex: null
            };
        }

        const currentProgress = piece.stepsFromStart ?? 0;

        if (piece.state === 'track') {
            const nextProgress = currentProgress + roll;
            if (nextProgress < this.TRACK_LENGTH) {
                const trackIndex = (this.getStartIndexForPlayer(playerIndex) + nextProgress) % this.TRACK_LENGTH;
                const targetSpaceId = this.getTrackSpaceId(trackIndex);
                if (this.isSpaceBlockedByOwn(playerIndex, targetSpaceId)) return null;
                return {
                    pieceId: piece.id,
                    targetSpaceId,
                    targetState: 'track',
                    progress: nextProgress,
                    finishIndex: null
                };
            }

            const finishIndex = nextProgress - this.TRACK_LENGTH;
            if (finishIndex >= this.finishLength) {
                return null; // Must roll exact to enter or advance in finish lane
            }
            const targetSpaceId = this.getFinishSpaceId(playerIndex, finishIndex);
            if (this.isSpaceBlockedByOwn(playerIndex, targetSpaceId)) return null;
            return {
                pieceId: piece.id,
                targetSpaceId,
                targetState: finishIndex === this.finishLength - 1 ? 'done' : 'finish',
                progress: nextProgress,
                finishIndex
            };
        }

        if (piece.state === 'finish') {
            const currentFinishIndex = Number.isInteger(piece.finishIndex)
                ? piece.finishIndex
                : Math.max(0, (piece.stepsFromStart ?? this.TRACK_LENGTH) - this.TRACK_LENGTH);
            const targetIndex = currentFinishIndex + roll;
            if (targetIndex >= this.finishLength) {
                return null;
            }
            const targetSpaceId = this.getFinishSpaceId(playerIndex, targetIndex);
            if (this.isSpaceBlockedByOwn(playerIndex, targetSpaceId)) return null;
            return {
                pieceId: piece.id,
                targetSpaceId,
                targetState: targetIndex === this.finishLength - 1 ? 'done' : 'finish',
                progress: this.TRACK_LENGTH + targetIndex,
                finishIndex: targetIndex
            };
        }

        return null;
    }

    applyMove(player, piece, move) {
        const playerIndex = this.getPlayerIndex(player.playerId);
        if (move.targetState === 'track') {
            const occupying = this.findPieceOnSpace(move.targetSpaceId, piece.id);
            if (occupying && occupying.playerIndex !== playerIndex) {
                this.sendPieceHome(occupying.piece, occupying.playerIndex);
            } else if (occupying && occupying.playerIndex === playerIndex) {
                // Cannot land on your own piece
                return;
            }
        }

        piece.state = move.targetState;
        piece.stepsFromStart = move.progress;
        piece.finishIndex = move.finishIndex ?? (move.targetState === 'finish' || move.targetState === 'done'
            ? Math.max(0, move.progress - this.TRACK_LENGTH)
            : null);
        piece.currentSpaceId = move.targetSpaceId;
        piece.isSelectable = false;

        this.emitEvent('pieceMoved', {
            playerId: player.playerId,
            pieceId: piece.id,
            toSpaceId: move.targetSpaceId,
            state: piece.state
        });
        this.logPlayerAction(player, `moved to ${move.targetSpaceId}`, { type: 'movement' });

        this.proposeStateChange(this.gameState);
        const boardInteraction = this.getUIComponent('boardInteraction');
        boardInteraction?.clearHighlights?.();
    }

    sendPieceHome(piece, playerIndex) {
        if (!piece) return;
        piece.state = 'home';
        piece.stepsFromStart = null;
        piece.finishIndex = null;
        piece.currentSpaceId = this.getHomeSpaceId(playerIndex, piece.homeIndex ?? 0);
        piece.isSelectable = false;

        this.emitEvent('pieceCaptured', {
            capturedPieceId: piece.id,
            playerIndex
        });
    }

    markSelectablePieces(currentPlayer, validMoves) {
        const selectable = new Set(validMoves.map(move => move.pieceId));
        this.gameState.players.forEach(player => {
            (player.pieces || []).forEach(piece => {
                piece.isSelectable = Boolean(currentPlayer && player.playerId === currentPlayer.playerId && selectable.has(piece.id));
            });
        });
    }

    highlightAllValidMoves(validMoves) {
        const boardInteraction = this.getBoardComponent();
        const uniqueTargets = Array.from(new Set(validMoves.map(m => m.targetSpaceId)));
        console.log('[Trouble] Highlighting targets', uniqueTargets);
        if (boardInteraction?.highlightValidMoves) {
            boardInteraction.highlightValidMoves(uniqueTargets);
        } else {
            this.setupManualSpaceSelection(uniqueTargets);
        }
    }

    startTurnTimer() {
        const timer = this.getUIComponent('timer') || this.uiSystem?.getComponent?.('timer');
        if (timer) {
            timer.gameState = this.gameState;
            timer.startTimer?.();
        }
    }

    stopTurnTimer() {
        const timer = this.getUIComponent('timer') || this.uiSystem?.getComponent?.('timer');
        timer?.stopTimer?.();
    }

    findMoveByTarget(spaceId) {
        return this.targetMoves.get(spaceId) || null;
    }

    async awaitMoveSelection(validMoves, currentPlayer) {
        if (!Array.isArray(validMoves) || validMoves.length === 0) {
            this.endTurnForPlayer(currentPlayer);
            return;
        }

        if (validMoves.length === 1) {
            const move = validMoves[0];
            this.handleMovePiece(currentPlayer.playerId, {
                pieceId: move.pieceId,
                targetSpaceId: move.targetSpaceId
            });
            return;
        }

        // Waiting for player choice: highlight all possible targets and allow piece/space clicks
        this.awaitingMoveChoice = true;
        this.targetMoves.clear();
        validMoves.forEach(move => this.targetMoves.set(move.targetSpaceId, move));
        this.highlightAllValidMoves(validMoves);
        this.setRollButtonActive(false);
        // Wait for user click on highlighted space (or piece)
    }

    getBoardComponent() {
        return this.getUIComponent('boardInteraction') ||
            this.getUIComponent('boardCanvas') ||
            this.uiSystem?.getComponent?.('boardCanvas') ||
            null;
    }

    setupManualSpaceSelection(spaceIds = []) {
        this.cleanupManualSpaceChoice();
        spaceIds.forEach(id => {
            const el = getVisibleElementById(`space-${id}`);
            if (!el) {
                console.warn(`[Trouble] No visible element found for space ${id}`);
                return;
            }
            el.classList.add('highlight');
            const handler = () => {
                const currentPlayer = this.gameState.getCurrentPlayer();
                const move = this.findMoveByTarget(id);
                if (currentPlayer && move) {
                    this.handleMovePiece(currentPlayer.playerId, {
                        pieceId: move.pieceId,
                        targetSpaceId: move.targetSpaceId
                    });
                }
            };
            el.addEventListener('click', handler);
            this.manualSpaceHandlers.set(id, { element: el, handler });
        });
    }

    cleanupManualSpaceChoice() {
        this.manualSpaceHandlers.forEach(({ element, handler }) => {
            if (element && handler) {
                element.classList.remove('highlight');
                element.removeEventListener('click', handler);
            }
        });
        this.manualSpaceHandlers.clear();
    }

    handleWinner(player) {
        if (!player) return;
        this.winners.add(player.playerId);
        try {
            player.setState?.(PlayerStates.WON || PlayerStates.WAITING);
        } catch (e) {
            player.state = 'won';
        }

        this.logPlayerAction(player, 'won the game!', { type: 'victory' });
        this.emitEvent('gameWon', { winner: player });
        ModalUtil.alert?.(`${player.nickname} has won the game! Players may continue moving remaining pieces.`, 'Game Won');
    }

    isSpaceBlockedByOwn(playerIndex, spaceId) {
        const occupying = this.findPieceOnSpace(spaceId);
        return occupying && occupying.playerIndex === playerIndex;
    }

    findPieceOnSpace(spaceId, ignorePieceId = null) {
        for (let pIndex = 0; pIndex < this.gameState.players.length; pIndex++) {
            const player = this.gameState.players[pIndex];
            for (const piece of player.pieces || []) {
                if (piece.id !== ignorePieceId && piece.currentSpaceId === spaceId && piece.state !== 'home') {
                    return { piece, playerIndex: pIndex };
                }
            }
        }
        return null;
    }

    getPlayerIndex(playerId) {
        return this.gameState.players.findIndex(p => p.playerId === playerId);
    }

    getStartIndexForPlayer(playerIndex) {
        return this.startOffsets[playerIndex % this.startOffsets.length];
    }

    getTrackSpaceId(index) {
        const normalized = ((index % this.TRACK_LENGTH) + this.TRACK_LENGTH) % this.TRACK_LENGTH;
        return `t${normalized}`;
    }

    getFinishSpaceId(playerIndex, finishIndex) {
        return `p${playerIndex}-f${finishIndex}`;
    }

    getHomeSpaceId(playerIndex, homeIndex) {
        return `p${playerIndex}-home-${homeIndex}`;
    }

    checkForWinner(player) {
        const finished = (player.pieces || []).every(piece => piece.state === 'done');
        if (finished) {
            this.emitEvent('playerWon', { playerId: player.playerId });
        }
        return finished;
    }

    getRollButtonComponent() {
        return this.getUIComponent('rollButton') || this.uiSystem?.getComponent?.('rollButton') || null;
    }

    wireRollButtonCallbacks() {
        const rollButton = this.getRollButtonComponent();
        if (!rollButton) return;
        const callbacks = {
            onRollDice: () => this.rollDiceForCurrentPlayer(),
            onRollComplete: (result) => this.handleAfterDiceRoll(result)
        };
        if (rollButton.registerCallbacks) {
            rollButton.registerCallbacks(callbacks);
        } else if (rollButton.init) {
            rollButton.init(callbacks);
        }
    }

    /**
     * Keep roll button synced to whose turn it is
     */
    setRollButtonActive(active) {
        const rollButton = this.getRollButtonComponent();
        if (!rollButton) return;
        if (this.awaitingMoveChoice && active) {
            // Do not re-activate while waiting for a move selection
            active = false;
        }
        if (active && rollButton.activate) {
            rollButton.activate();
        } else if (!active && rollButton.deactivate) {
            rollButton.deactivate();
        }
    }

    updateGameState(gameState) {
        this.gameState = gameState;
        const canAct = gameState?.gamePhase !== GamePhases.GAME_ENDED;
        this.setRollButtonActive(this.isClientTurn() && canAct && !this.awaitingMoveChoice);
    }
}
