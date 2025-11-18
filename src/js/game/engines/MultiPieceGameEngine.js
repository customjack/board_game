/**
 * MultiPieceGameEngine - Game engine for games where players control multiple pieces
 *
 * This engine implements gameplay similar to Sorry!, Parcheesi, or Ludo:
 * - Each player controls 2-4 pieces
 * - Players select which piece to move
 * - Dice rolling determines movement
 * - Pieces can interact (capture, block, etc.)
 *
 * This demonstrates how the modular architecture supports different game types.
 */
import BaseGameEngine from './BaseGameEngine.js';
import TurnPhases from '../game/phases/TurnPhases.js';
import GamePhases from '../game/phases/GamePhases.js';
import PlayerStates from '../game/phases/PlayerStates.js';

export default class MultiPieceGameEngine extends BaseGameEngine {
    /**
     * Create a multi-piece game engine
     * @param {Object} dependencies - Core dependencies from BaseGameEngine
     * @param {Object} config - Multi-piece specific configuration
     */
    constructor(dependencies, config = {}) {
        super(dependencies, config);

        // Multi-piece specific config
        this.piecesPerPlayer = config.piecesPerPlayer || 4;
        this.allowCapture = config.allowCapture !== false;
        this.safeSpaces = new Set(config.safeSpaces || []);

        // Track selected piece for current turn
        this.selectedPieceId = null;
    }

    // ===== IGameEngine Implementation =====

    /**
     * Initialize the multi-piece engine
     */
    init() {
        // Initialize UI components
        const pieceSelector = this.getUIComponent('pieceSelector');
        if (pieceSelector && pieceSelector.init) {
            pieceSelector.init({
                onPieceSelected: (pieceId) => this.handlePieceSelection(pieceId)
            });
        }

        const rollButton = this.getUIComponent('rollButton');
        if (rollButton && rollButton.init) {
            rollButton.init({
                onRollDice: () => this.rollDiceForCurrentPlayer(),
                onRollComplete: (result) => this.handleAfterDiceRoll(result)
            });
        }

        const timer = this.getUIComponent('timer');
        if (timer && timer.init) {
            timer.init({
                onTimerEnd: () => this.handleTimerEnd(),
                onPauseToggle: () => this.togglePauseGame()
            });
        }

        this.initialized = true;
        this.running = false;

        console.log(`[MultiPieceGameEngine] Initialized with ${this.piecesPerPlayer} pieces per player`);
    }

    /**
     * Update game state
     * @param {GameState} gameState - New game state
     */
    updateGameState(gameState) {
        this.gameState = gameState;
        // Trigger phase transitions based on state changes
        // (Implementation would be similar to TurnBasedGameEngine)
    }

    /**
     * Handle player actions
     * @param {string} playerId - Player identifier
     * @param {string} actionType - Type of action
     * @param {Object} actionData - Action data
     * @returns {Promise<Object>} Action result
     */
    async onPlayerAction(playerId, actionType, actionData) {
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.playerId !== playerId) {
            return {
                success: false,
                error: 'Not your turn'
            };
        }

        switch (actionType) {
            case 'SELECT_PIECE':
                return await this.handleSelectPiece(playerId, actionData);

            case 'ROLL_DICE':
                return await this.handleRollDice(playerId, actionData);

            case 'MOVE_PIECE':
                return await this.handleMovePiece(playerId, actionData);

            case 'END_TURN':
                return await this.handleEndTurn(playerId);

            default:
                return {
                    success: false,
                    error: `Unknown action type: ${actionType}`
                };
        }
    }

    /**
     * Clean up engine resources
     */
    cleanup() {
        this.selectedPieceId = null;
        this.running = false;
        this.initialized = false;
    }

    // ===== UI Component Specifications =====

    /**
     * Get engine type identifier
     * @returns {string} Engine type
     */
    getEngineType() {
        return 'multi-piece';
    }

    // REMOVED: getCapabilities() - No longer using capability prediction system
    // The engine's needs are expressed through getRequiredUIComponents() and getOptionalUIComponents()

    /**
     * Get required UI components for this engine
     * @returns {UIComponentSpec[]}
     */
    getRequiredUIComponents() {
        return [
            {
                id: 'pieceSelector',
                type: 'selector',
                required: true,
                description: 'Selector for choosing which piece to move',
                config: {
                    maxPieces: this.piecesPerPlayer,
                    allowMultiSelect: false
                },
                events: {
                    emits: ['pieceSelected', 'pieceDeselected'],
                    listens: ['turnStarted', 'turnEnded', 'piecesMoved']
                }
            },
            {
                id: 'rollButton',
                type: 'button',
                required: false, // Can auto-roll if not available
                description: 'Button to roll dice',
                config: {},
                events: {
                    emits: ['rollDice', 'rollComplete'],
                    listens: ['turnStarted', 'turnEnded', 'gamePaused']
                }
            },
            {
                id: 'timer',
                type: 'timer',
                required: false,
                description: 'Turn timer display and countdown',
                config: {},
                events: {
                    emits: ['timerExpired'],
                    listens: ['turnStarted', 'turnEnded', 'gamePaused', 'gameResumed']
                }
            },
            {
                id: 'boardInteraction',
                type: 'board',
                required: true,
                description: 'Board with piece visualization and movement',
                config: {
                    showMultiplePieces: true,
                    highlightMovablePieces: true
                },
                events: {
                    emits: ['pieceClicked', 'spaceClicked'],
                    listens: ['pieceMoved', 'gameStateUpdated']
                }
            }
        ];
    }

    /**
     * Get optional UI components that enhance this engine
     * @returns {UIComponentSpec[]}
     */
    getOptionalUIComponents() {
        return [
            {
                id: 'gameLog',
                type: 'display',
                required: false,
                description: 'Game event log',
                config: {},
                events: {
                    emits: [],
                    listens: ['*']
                }
            },
            {
                id: 'playerList',
                type: 'display',
                required: false,
                description: 'List of all players with piece counts',
                config: {
                    showPieceCount: true
                },
                events: {
                    emits: ['playerSelected'],
                    listens: ['gameStateUpdated', 'playerAdded', 'playerRemoved']
                }
            },
            {
                id: 'captureAnimation',
                type: 'animation',
                required: false,
                description: 'Animation for when pieces capture each other',
                config: {},
                events: {
                    emits: [],
                    listens: ['pieceCaptured']
                }
            }
        ];
    }

    /**
     * Get current phase for engine state
     * @returns {string}
     */
    getCurrentPhase() {
        return `${this.gameState?.gamePhase || 'unknown'}:${this.gameState?.turnPhase || 'unknown'}`;
    }

    /**
     * Get engine-specific metadata
     * @returns {Object}
     */
    getEngineMetadata() {
        return {
            currentPlayer: this.gameState?.getCurrentPlayer()?.nickname || 'none',
            turnNumber: this.gameState?.getTurnNumber() || 0,
            selectedPieceId: this.selectedPieceId,
            piecesPerPlayer: this.piecesPerPlayer,
            allowCapture: this.allowCapture,
            gamePhase: this.gameState?.gamePhase,
            turnPhase: this.gameState?.turnPhase
        };
    }

    /**
     * Check if engine can run without UI
     * @returns {boolean}
     */
    canRunHeadless() {
        return true;
    }

    // ===== Action Handlers =====

    /**
     * Handle piece selection
     */
    async handleSelectPiece(playerId, actionData) {
        if (!actionData.pieceId) {
            return {
                success: false,
                error: 'Piece ID required'
            };
        }

        // Validate piece belongs to player
        const player = this.gameState.getPlayerById(playerId);
        const piece = player?.pieces?.find(p => p.id === actionData.pieceId);

        if (!piece) {
            return {
                success: false,
                error: 'Invalid piece'
            };
        }

        this.selectedPieceId = actionData.pieceId;
        this.emitEvent('pieceSelected', {
            playerId,
            pieceId: actionData.pieceId,
            piece
        });

        return {
            success: true,
            data: { pieceId: actionData.pieceId }
        };
    }

    /**
     * Handle dice roll
     */
    async handleRollDice(playerId, actionData) {
        const player = this.gameState.getPlayerById(playerId);
        const rollResult = player.rollDice();

        this.emitEvent('diceRolled', {
            playerId,
            result: rollResult
        });

        return {
            success: true,
            data: { rollResult }
        };
    }

    /**
     * Handle piece movement
     */
    async handleMovePiece(playerId, actionData) {
        if (!this.selectedPieceId) {
            return {
                success: false,
                error: 'No piece selected'
            };
        }

        if (!actionData.targetSpaceId) {
            return {
                success: false,
                error: 'Target space required'
            };
        }

        // Validate move
        const player = this.gameState.getPlayerById(playerId);
        const piece = player?.pieces?.find(p => p.id === this.selectedPieceId);

        if (!piece) {
            return {
                success: false,
                error: 'Invalid piece'
            };
        }

        // Check if piece can move to target
        const canMove = this.canPieceMoveToSpace(piece, actionData.targetSpaceId);
        if (!canMove) {
            return {
                success: false,
                error: 'Invalid move'
            };
        }

        // Move piece
        const oldSpaceId = piece.currentSpaceId;
        piece.currentSpaceId = actionData.targetSpaceId;

        // Check for captures
        if (this.allowCapture) {
            this.handleCaptures(piece, actionData.targetSpaceId);
        }

        this.emitEvent('pieceMoved', {
            playerId,
            pieceId: this.selectedPieceId,
            fromSpaceId: oldSpaceId,
            toSpaceId: actionData.targetSpaceId
        });

        this.selectedPieceId = null;

        return {
            success: true,
            data: {
                pieceId: piece.id,
                fromSpaceId: oldSpaceId,
                toSpaceId: actionData.targetSpaceId
            }
        };
    }

    /**
     * Handle end turn
     */
    async handleEndTurn(playerId) {
        this.selectedPieceId = null;
        this.emitEvent('turnEnded', { playerId });
        return { success: true };
    }

    // ===== Helper Methods =====

    /**
     * Roll dice for current player
     */
    rollDiceForCurrentPlayer() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        const rollResult = currentPlayer.rollDice();
        console.log(`${currentPlayer.nickname} rolled a ${rollResult}`);

        this.emitEvent('playerRoll', {
            gameState: this.gameState,
            result: rollResult
        });

        return rollResult;
    }

    /**
     * Handle after dice roll
     */
    handleAfterDiceRoll(rollResult) {
        console.log(`After dice roll: ${rollResult}`);
        // Activate piece selector
        const pieceSelector = this.getUIComponent('pieceSelector');
        if (pieceSelector && pieceSelector.activate) {
            pieceSelector.activate(rollResult);
        }
    }

    /**
     * Handle timer end
     */
    handleTimerEnd() {
        if (this.isClientTurn()) {
            const player = this.gameState.getCurrentPlayer();
            console.log(`Time's up for ${player.nickname}!`);
            this.emitEvent('timerEnded', { gameState: this.gameState });
            // Auto end turn
            this.handleEndTurn(player.playerId);
        }
    }

    /**
     * Toggle pause game
     */
    togglePauseGame() {
        if (this.gameState.gamePhase === GamePhases.IN_GAME) {
            this.gameState.setGamePhase(GamePhases.PAUSED);
            this.emitEvent('gamePaused', { gameState: this.gameState });
        } else if (this.gameState.gamePhase === GamePhases.PAUSED) {
            this.gameState.setGamePhase(GamePhases.IN_GAME);
            this.emitEvent('gameResumed', { gameState: this.gameState });
        }
    }

    /**
     * Check if a piece can move to a space
     */
    canPieceMoveToSpace(piece, targetSpaceId) {
        // Placeholder - would implement actual movement validation
        // Check distance, path, obstacles, etc.
        return true;
    }

    /**
     * Handle piece captures
     */
    handleCaptures(piece, spaceId) {
        // Check if space is safe
        if (this.safeSpaces.has(spaceId)) {
            return;
        }

        // Find other pieces on this space
        const otherPieces = this.findPiecesOnSpace(spaceId).filter(
            p => p.playerId !== piece.playerId && p.id !== piece.id
        );

        // Capture them (send back to start)
        otherPieces.forEach(capturedPiece => {
            console.log(`Piece ${piece.id} captured piece ${capturedPiece.id}!`);
            capturedPiece.currentSpaceId = capturedPiece.startSpaceId;

            this.emitEvent('pieceCaptured', {
                capturingPieceId: piece.id,
                capturedPieceId: capturedPiece.id,
                spaceId
            });
        });
    }

    /**
     * Find all pieces on a space
     */
    findPiecesOnSpace(spaceId) {
        const pieces = [];
        this.gameState.players.forEach(player => {
            if (player.pieces) {
                player.pieces.forEach(piece => {
                    if (piece.currentSpaceId === spaceId) {
                        pieces.push({
                            ...piece,
                            playerId: player.playerId
                        });
                    }
                });
            }
        });
        return pieces;
    }

    /**
     * Handle piece selection from UI
     */
    handlePieceSelection(pieceId) {
        this.selectedPieceId = pieceId;
        console.log(`Selected piece: ${pieceId}`);

        // Highlight valid moves for this piece
        const boardInteraction = this.getUIComponent('boardInteraction');
        if (boardInteraction && boardInteraction.highlightValidMoves) {
            const validMoves = this.getValidMovesForPiece(pieceId);
            boardInteraction.highlightValidMoves(validMoves);
        }
    }

    /**
     * Get valid moves for a piece
     */
    getValidMovesForPiece(pieceId) {
        // Placeholder - would implement actual valid move calculation
        return [];
    }
}
