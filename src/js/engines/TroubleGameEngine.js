import BaseGameEngine from './BaseGameEngine.js';
import TurnPhases from '../enums/TurnPhases.js';
import GamePhases from '../enums/GamePhases.js';
import PlayerStates from '../enums/PlayerStates.js';

/**
 * TroubleGameEngine - Implements the classic Pop-O-Matic Trouble rule-set.
 *
 * The engine keeps track of four pegs per player, handles the special movement
 * rules (rolling a six to leave home, bumping opponents, exact finish rolls,
 * and bonus turns on sixes) and exposes a very small API surface that can be
 * driven entirely through the existing player action channel.
 *
 * Supported player actions:
 * - ROLL_DICE: Rolls the Pop-O-Matic die for the current player.
 * - SELECT_PIECE: When multiple pegs can move, the active player selects which
 *   peg index (0-3) should be advanced using the previously rolled value.
 */
export default class TroubleGameEngine extends BaseGameEngine {
    constructor(dependencies, config = {}) {
        super(dependencies, config);

        this.trackLength = config.trackLength || 28;
        this.finishLength = config.finishLength || 4;
        this.piecesPerPlayer = config.piecesPerPlayer || 4;

        this.turnIndex = 0;
        this.pendingRoll = null;
        this.pendingMoveOptions = null;
        this.pendingLocalRoll = null;
        this.playerState = new Map();
        this.entryOffsets = new Map();
        this.running = false;
        this.paused = false;
        this.lastKnownPlayerId = null;
    }

    init() {
        this.setupPlayerState();

        // Initialize UI components (similar to TurnBasedGameEngine)
        // Try UIComponentRegistry components (future)
        let rollButton = this.getUIComponent('rollButton');
        let timer = this.getUIComponent('timer');

        // If not found, try UISystem components (current)
        if (!rollButton && this.uiSystem) {
            rollButton = this.uiSystem.getComponent('rollButton');
        }
        if (!timer && this.uiSystem) {
            timer = this.uiSystem.getComponent('timer');
        }

        // Initialize roll button
        if (rollButton && rollButton.init) {
            rollButton.init({
                onRollDice: () => this.handleRollDiceForCurrentPlayer(),
                onRollComplete: (result) => this.handleAfterDiceRoll(result)
            });
        }

        // Initialize timer
        if (timer && timer.init) {
            timer.init({
                onTimerEnd: () => this.handleTimerEnd(),
                onPauseToggle: () => this.togglePauseGame()
            });
        }

        this.gameState.gamePhase = GamePhases.IN_GAME;
        this.gameState.turnPhase = TurnPhases.WAITING_FOR_MOVE;
        this.turnIndex = 0;
        this.gameState.setCurrentPlayerIndex(0);

        this.initialized = true;
        this.running = true;
        this.emitStateUpdate();

        // Activate roll button for first player
        this.activateRollButton();
    }

    start() {
        this.running = true;
        this.emitEvent('engineStarted');
    }

    pause() {
        this.paused = true;
        this.emitEvent('enginePaused');
    }

    resume() {
        this.paused = false;
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
        this.playerState.clear();
    }

    updateGameState(gameState) {
        const previousPlayerId = this.getActivePlayer()?.playerId || null;
        this.gameState = gameState;

        const serializedState = gameState?.pluginState?.trouble || null;
        if (serializedState) {
            this.hydratePlayerState(serializedState);
        } else {
            this.setupPlayerState();
        }

        const activePlayerId = this.getActivePlayer()?.playerId || null;
        if (activePlayerId !== previousPlayerId) {
            console.debug('[Trouble] Turn updated', {
                peerId: this.peerId,
                previousPlayerId,
                activePlayerId
            });
            this.lastKnownPlayerId = activePlayerId;
        }

        if (this.initialized) {
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
            paused: this.paused,
            currentPhase: this.gameState.turnPhase,
            metadata: {
                pendingRoll: this.pendingRoll,
                troubleState: this.serializeState()
            }
        };
    }

    async onPlayerAction(playerId, actionType, actionData = {}) {
        if (!this.running) {
            return { success: false, error: 'Game is not running' };
        }

        const currentPlayer = this.getActivePlayer();
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

    getRequiredUIComponents() {
        // The engine can run headless, but exposing the roll button keeps parity
        // with the existing UI.
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

    getEngineType() {
        return 'trouble';
    }

    getPieceManagerType() {
        return 'trouble';
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

    // ===== UI Helper Methods =====

    handleRollDiceForCurrentPlayer() {
        const currentPlayer = this.getActivePlayer();
        if (!currentPlayer) return 0;

        // Don't allow rolling if not this player's turn
        if (!this.isClientTurn()) {
            console.warn('Not your turn!');
            return 0;
        }

        const rollResult = Math.floor(Math.random() * 6) + 1;
        this.pendingLocalRoll = rollResult;
        console.log(`${currentPlayer.nickname} rolled a ${rollResult}`);

        this.deactivateRollButton();
        return rollResult;
    }

    handleAfterDiceRoll(rollResult) {
        const currentPlayer = this.getActivePlayer();
        if (!currentPlayer) return;

        // Don't process if not this player's turn
        if (!this.isClientTurn()) {
            return;
        }

        const resolvedRoll = typeof rollResult === 'number' ? rollResult : this.pendingLocalRoll;
        this.pendingLocalRoll = null;
        this.handleRoll(currentPlayer, resolvedRoll);
    }

    handleTimerEnd() {
        // Auto-end turn when timer expires
        const currentPlayer = this.getActivePlayer();
        if (currentPlayer) {
            console.log(`Time's up for ${currentPlayer.nickname}!`);
            this.advanceTurn(false);
        }
    }

    togglePauseGame() {
        if (this.paused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    activateRollButton() {
        // Only activate if it's this client's turn
        if (!this.isClientTurn()) {
            console.debug('[Trouble] Not activating roll button (not this client turn)', {
                peerId: this.peerId,
                currentPlayerId: this.gameState.getCurrentPlayer()?.playerId
            });
            return;
        }

        if (this.uiSystem) {
            const btn = this.uiSystem.getComponent('rollButton');
            if (btn && btn.activate) {
                btn.activate();
                console.debug('[Trouble] Roll button activated', {
                    peerId: this.peerId,
                    currentPlayerId: this.gameState.getCurrentPlayer()?.playerId
                });
            }
        }
    }

    deactivateRollButton() {
        if (this.uiSystem) {
            const btn = this.uiSystem.getComponent('rollButton');
            if (btn && btn.deactivate) {
                btn.deactivate();
                console.debug('[Trouble] Roll button deactivated', {
                    peerId: this.peerId,
                    currentPlayerId: this.gameState.getCurrentPlayer()?.playerId
                });
            }
        }
    }

    // ===== Internal helpers =====

    setupPlayerState() {
        this.initializePlayerContainers();
        const players = this.gameState.players || [];
        players.forEach(player => {
            player.turnsTaken = 0;
            player.setState?.(PlayerStates.PLAYING);
        });

        this.pendingRoll = null;
        this.pendingMoveOptions = null;
    }

    initializePlayerContainers() {
        this.playerState.clear();
        this.entryOffsets.clear();

        const players = this.gameState.players || [];
        const segment = Math.floor(this.trackLength / Math.max(players.length, 1));

        players.forEach((player, index) => {
            this.entryOffsets.set(player.playerId, segment * index);
            this.playerState.set(player.playerId, {
                pieces: Array.from({ length: this.piecesPerPlayer }, (_, pieceIndex) => ({
                    id: `${player.playerId}-piece-${pieceIndex}`,
                    pieceIndex,
                    status: 'HOME',
                    stepsFromStart: 0,
                    spaceId: this.getHomeSpaceId(index, pieceIndex)
                })),
                finished: 0
            });
        });
    }

    hydratePlayerState(serializedState) {
        this.initializePlayerContainers();

        const players = this.gameState.players || [];
        serializedState?.pieces?.forEach(pieceState => {
            const ownerState = this.playerState.get(pieceState.playerId);
            if (!ownerState) {
                return;
            }

            const pieceIndex = Math.max(0, Math.min(this.piecesPerPlayer - 1, pieceState.pieceIndex || 0));
            const piece = ownerState.pieces[pieceIndex];
            piece.status = pieceState.status || piece.status;
            piece.stepsFromStart = typeof pieceState.stepsFromStart === 'number'
                ? pieceState.stepsFromStart
                : piece.stepsFromStart;
            piece.spaceId = pieceState.spaceId || piece.spaceId;
            piece.id = pieceState.id || piece.id;

            if (piece.status === 'DONE') {
                ownerState.finished += 1;
            }
        });

        const currentPlayerId = serializedState.currentPlayerId || this.gameState.getCurrentPlayer()?.playerId;
        const idx = players.findIndex(player => player.playerId === currentPlayerId);
        if (idx >= 0) {
            this.turnIndex = idx;
        }

        this.pendingRoll = typeof serializedState.pendingRoll === 'number' ? serializedState.pendingRoll : null;

        if (serializedState.pendingSelection && this.pendingRoll && currentPlayerId) {
            const options = this.findMovablePieces(currentPlayerId, this.pendingRoll);
            this.pendingMoveOptions = {
                playerId: currentPlayerId,
                roll: this.pendingRoll,
                options
            };
        } else {
            this.pendingMoveOptions = null;
        }
    }

    getActivePlayer() {
        const players = this.gameState.players || [];
        if (players.length === 0) return null;
        return players[this.turnIndex % players.length];
    }

    handleRoll(player, forcedRoll = null) {
        if (this.pendingRoll !== null) {
            return { success: false, error: 'Resolve the previous roll before rolling again' };
        }

        const roll = forcedRoll ?? player.rollDice(1, 6);
        this.pendingRoll = roll;
        const moveOptions = this.findMovablePieces(player.playerId, roll);

        this.logPlayerAction(player, `rolled a ${roll}`, { type: 'dice-roll' });

        if (moveOptions.length === 0) {
            const extraTurn = roll === 6;
            this.logPlayerAction(player, 'has no legal moves.', { type: 'movement', metadata: { roll } });
            this.pendingRoll = null;
            this.pendingMoveOptions = null;
            this.advanceTurn(extraTurn);
            return {
                success: true,
                data: { roll, movablePieces: [] }
            };
        }

        if (moveOptions.length === 1) {
            const result = this.executeMove(player, moveOptions[0], roll);
            return {
                success: true,
                data: { roll, movedPiece: result }
            };
        }

        this.pendingMoveOptions = {
            playerId: player.playerId,
            roll,
            options: moveOptions
        };
        this.gameState.turnPhase = TurnPhases.PLAYER_CHOOSING_DESTINATION;
        const selectablePieces = moveOptions.map(option => {
            const piece = this.getPlayerPiece(player.playerId, option.pieceIndex);
            return {
                pieceIndex: option.pieceIndex,
                pieceId: piece?.id || `${player.playerId}-piece-${option.pieceIndex}`
            };
        });
        this.emitStateUpdate({ awaitingSelection: true, roll, selectablePieces });
        return {
            success: true,
            data: {
                roll,
                requiresSelection: true,
                selectablePieces: moveOptions.map(option => ({
                    pieceIndex: option.pieceIndex,
                    destination: option.destinationSpaceId,
                    status: option.destinationStatus
                }))
            }
        };
    }

    handlePieceSelection(player, pieceIndex) {
        if (!this.pendingMoveOptions || this.pendingMoveOptions.playerId !== player.playerId) {
            return { success: false, error: 'No pending selection for this player' };
        }

        const selected = this.pendingMoveOptions.options.find(option => option.pieceIndex === pieceIndex);
        if (!selected) {
            return { success: false, error: 'Invalid piece selection' };
        }

        const result = this.executeMove(player, selected, this.pendingMoveOptions.roll);
        this.pendingMoveOptions = null;
        return {
            success: true,
            data: {
                roll: this.pendingRoll,
                movedPiece: result
            }
        };
    }

    findMovablePieces(playerId, roll) {
        const state = this.playerState.get(playerId);
        if (!state) return [];

        const options = [];
        state.pieces.forEach((piece, index) => {
            if (piece.status === 'DONE') return;

            if (piece.status === 'HOME') {
                if (roll === 6 && !this.isEntryBlocked(playerId)) {
                    options.push({
                        pieceIndex: index,
                        targetSteps: 0,
                        destinationStatus: 'TRACK',
                        destinationSpaceId: this.getTrackSpaceId(this.computeGlobalTrackIndex(playerId, 0))
                    });
                }
                return;
            }

            const targetSteps = piece.stepsFromStart + roll;
            const maxSteps = this.trackLength + this.finishLength;
            if (targetSteps > maxSteps) {
                return;
            }

            if (targetSteps === maxSteps) {
                options.push({
                    pieceIndex: index,
                    targetSteps,
                    destinationStatus: 'DONE',
                    destinationSpaceId: this.getFinishSpaceId(this.getPlayerIndex(playerId), this.finishLength - 1)
                });
                return;
            }

            if (targetSteps >= this.trackLength) {
                const finishIndex = targetSteps - this.trackLength;
                if (this.isFinishBlocked(playerId, finishIndex)) {
                    return;
                }
                options.push({
                    pieceIndex: index,
                    targetSteps,
                    destinationStatus: 'FINISH',
                    destinationSpaceId: this.getFinishSpaceId(this.getPlayerIndex(playerId), finishIndex)
                });
            } else {
                const landingIndex = this.computeGlobalTrackIndex(playerId, targetSteps);
                if (this.isOwnPieceOnTrack(playerId, landingIndex)) {
                    return;
                }
                options.push({
                    pieceIndex: index,
                    targetSteps,
                    destinationStatus: 'TRACK',
                    destinationSpaceId: this.getTrackSpaceId(landingIndex)
                });
            }
        });

        return options;
    }

    executeMove(player, option, roll) {
        const state = this.playerState.get(player.playerId);
        const piece = state.pieces[option.pieceIndex];

        if (piece.status === 'HOME' && roll === 6) {
            piece.stepsFromStart = 0;
        } else {
            piece.stepsFromStart = option.targetSteps;
        }

        if (option.destinationStatus === 'DONE') {
            piece.status = 'DONE';
            piece.spaceId = this.getFinishSpaceId(this.getPlayerIndex(player.playerId), this.finishLength - 1);
            state.finished += 1;
            this.logPlayerAction(player, `moved piece ${option.pieceIndex + 1} into HOME`, { type: 'movement' });
        } else if (option.destinationStatus === 'FINISH') {
            piece.status = 'FINISH';
            piece.spaceId = option.destinationSpaceId;
            this.logPlayerAction(player, `advanced piece ${option.pieceIndex + 1} toward home`, {
                type: 'movement',
                metadata: { finishIndex: piece.stepsFromStart - this.trackLength }
            });
        } else {
            piece.status = 'TRACK';
            const landingIndex = this.computeGlobalTrackIndex(player.playerId, piece.stepsFromStart);
            piece.spaceId = option.destinationSpaceId;
            this.handleBump(player.playerId, landingIndex);
            this.logPlayerAction(player, `moved piece ${option.pieceIndex + 1} to track ${landingIndex}`, {
                type: 'movement',
                metadata: { landingIndex }
            });
        }

        const extraTurn = roll === 6 && state.finished < this.piecesPerPlayer;
        this.pendingRoll = null;
        this.pendingMoveOptions = null;

        if (state.finished >= this.piecesPerPlayer) {
            player.setState(PlayerStates.COMPLETED_GAME);
            this.emitEvent('trouble:playerFinished', { playerId: player.playerId });
        }

        this.advanceTurn(extraTurn);

        return {
            pieceIndex: option.pieceIndex,
            status: piece.status,
            spaceId: piece.spaceId,
            finishedPieces: state.finished,
            extraTurn
        };
    }

    advanceTurn(extraTurn) {
        const players = this.gameState.players || [];
        const previousPlayer = this.getActivePlayer();

        if (!extraTurn) {
            previousPlayer.turnsTaken += 1;
            for (let i = 0; i < players.length; i++) {
                this.turnIndex = (this.turnIndex + 1) % players.length;
                if (players[this.turnIndex].getState?.() !== PlayerStates.COMPLETED_GAME) {
                    break;
                }
            }
        } else {
            this.logPlayerAction(previousPlayer, 'earned an extra turn!', { type: 'bonus' });
        }

        const unfinished = players.filter(p => p.getState?.() !== PlayerStates.COMPLETED_GAME);
        if (unfinished.length === 0) {
            this.running = false;
            this.emitEvent('trouble:gameCompleted', {});
            return;
        }

        this.gameState.setCurrentPlayerIndex(this.turnIndex);
        this.gameState.turnPhase = TurnPhases.WAITING_FOR_MOVE;
        this.emitStateUpdate();
        this.lastKnownPlayerId = this.getActivePlayer()?.playerId || null;

        // Activate roll button for the new current player
        this.activateRollButton();
    }

    isEntryBlocked(playerId) {
        const entryIndex = this.computeGlobalTrackIndex(playerId, 0);
        return this.isAnyPieceOnTrack(entryIndex, playerId);
    }

    isFinishBlocked(playerId, finishIndex) {
        const state = this.playerState.get(playerId);
        if (!state) return false;
        return state.pieces.some(
            piece => piece.status === 'FINISH' && (piece.stepsFromStart - this.trackLength) === finishIndex
        );
    }

    isOwnPieceOnTrack(playerId, trackIndex) {
        const state = this.playerState.get(playerId);
        if (!state) return false;
        return state.pieces.some(
            piece => piece.status === 'TRACK' && this.computeGlobalTrackIndex(playerId, piece.stepsFromStart) === trackIndex
        );
    }

    isAnyPieceOnTrack(trackIndex, excludePlayerId = null) {
        for (const [playerId, state] of this.playerState.entries()) {
            for (const piece of state.pieces) {
                if (piece.status !== 'TRACK') continue;
                const globalIndex = this.computeGlobalTrackIndex(playerId, piece.stepsFromStart);
                if (globalIndex === trackIndex && playerId !== excludePlayerId) {
                    return true;
                }
            }
        }
        return false;
    }

    handleBump(activePlayerId, landingIndex) {
        for (const [playerId, state] of this.playerState.entries()) {
            if (playerId === activePlayerId) continue;
            state.pieces.forEach((piece, pieceIndex) => {
                if (piece.status !== 'TRACK') return;
                const globalIndex = this.computeGlobalTrackIndex(playerId, piece.stepsFromStart);
                if (globalIndex === landingIndex) {
                    piece.status = 'HOME';
                    piece.stepsFromStart = 0;
                    piece.spaceId = this.getHomeSpaceId(this.getPlayerIndex(playerId), pieceIndex);
                    const player = this.gameState.players.find(p => p.playerId === playerId);
                    this.logPlayerAction(player, `had piece ${pieceIndex + 1} bumped home!`, { type: 'bump' });
                }
            });
        }
    }

    computeGlobalTrackIndex(playerId, stepsFromStart) {
        const offset = this.entryOffsets.get(playerId) || 0;
        return (offset + (stepsFromStart % this.trackLength) + this.trackLength) % this.trackLength;
    }

    getPlayerIndex(playerId) {
        const players = this.gameState.players || [];
        return Math.max(0, players.findIndex(player => player.playerId === playerId));
    }

    getTrackSpaceId(index) {
        return `track-${index}`;
    }

    getFinishSpaceId(playerIndex, finishIndex) {
        return `finish-${playerIndex}-${finishIndex}`;
    }

    getHomeSpaceId(playerIndex, pieceIndex) {
        return `home-${playerIndex}-${pieceIndex}`;
    }

    getPlayerPiece(playerId, pieceIndex) {
        const state = this.playerState.get(playerId);
        if (!state) return null;
        return state.pieces[pieceIndex] || null;
    }

    serializeState() {
        const pieces = [];
        for (const [playerId, state] of this.playerState.entries()) {
            state.pieces.forEach((piece, idx) => {
                const pieceIndex = piece.pieceIndex ?? idx;
                pieces.push({
                    id: piece.id || `${playerId}-piece-${pieceIndex}`,
                    playerId,
                    pieceIndex,
                    status: piece.status,
                    spaceId: piece.spaceId,
                    stepsFromStart: piece.stepsFromStart
                });
            });
        }

        return {
            currentPlayerId: this.getActivePlayer()?.playerId || null,
            pendingRoll: this.pendingRoll,
            pendingSelection: !!this.pendingMoveOptions,
            pieces
        };
    }

    emitStateUpdate(extra = {}) {
        const state = {
            ...this.serializeState(),
            ...extra
        };

        this.emitEvent('trouble:stateUpdated', {
            troubleState: state
        });

        if (!this.gameState.pluginState) {
            this.gameState.pluginState = {};
        }
        this.gameState.pluginState.trouble = state;
        this.gameState.incrementVersion();
        this.proposeStateChange(this.gameState);
    }
}
