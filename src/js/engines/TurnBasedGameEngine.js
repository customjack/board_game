/**
 * TurnBasedGameEngine - Concrete implementation for turn-based gameplay
 *
 * This engine implements the classic turn-based board game flow:
 * - Players take turns in sequence
 * - Dice rolling determines movement
 * - Events trigger based on space landings
 * - Effects are applied each turn
 */
import BaseGameEngine from './BaseGameEngine.js';
import PhaseStateMachine from './components/PhaseStateMachine.js';
import TurnManager from './components/TurnManager.js';
import EventProcessor from './components/EventProcessor.js';
import UIController from './components/UIController.js';
import TurnPhases from '../enums/TurnPhases.js';
import GamePhases from '../enums/GamePhases.js';
import PlayerStates from '../enums/PlayerStates.js';

export default class TurnBasedGameEngine extends BaseGameEngine {
    /**
     * Create a turn-based game engine
     * @param {Object} dependencies - Core dependencies from BaseGameEngine
     * @param {Object} config - Turn-based specific configuration
     */
    constructor(dependencies, config = {}) {
        super(dependencies, config);

        // Initialize components
        this.phaseStateMachine = new PhaseStateMachine(this.eventBus);
        this.turnManager = new TurnManager(this.gameState, config.turnManager || {});
        this.eventProcessor = new EventProcessor(this.gameState, this.eventBus, config.eventProcessor || {});
        this.uiController = new UIController(
            {
                rollButtonManager: dependencies.rollButtonManager,
                timerManager: dependencies.timerManager
            },
            config.uiController || {}
        );

        // Register phase handlers
        this.registerPhaseHandlers();
    }

    /**
     * Register handlers for all game and turn phases
     */
    registerPhaseHandlers() {
        // Game phase handlers
        this.phaseStateMachine.registerGamePhaseHandler(GamePhases.IN_LOBBY, () => this.handleInLobby());
        this.phaseStateMachine.registerGamePhaseHandler(GamePhases.IN_GAME, () => this.handleInGame());
        this.phaseStateMachine.registerGamePhaseHandler(GamePhases.PAUSED, () => this.handlePaused());
        this.phaseStateMachine.registerGamePhaseHandler(GamePhases.GAME_ENDED, () => this.handleGameEnded());

        // Turn phase handlers
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.CHANGE_TURN, () => this.handleChangeTurn());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.BEGIN_TURN, () => this.handleBeginTurn());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.WAITING_FOR_MOVE, () => this.handleWaitingForMove());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.PROCESSING_EVENTS, () => this.handleProcessingEvents());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.PROCESSING_EVENT, () => this.handleProcessingEvent());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.PROCESSING_MOVE, () => this.handleProcessingMove());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.PLAYER_CHOOSING_DESTINATION, () => this.handlePlayerChoosingDestination());
        this.phaseStateMachine.registerTurnPhaseHandler(TurnPhases.END_TURN, () => this.handleEndTurn());
    }

    /**
     * Initialize the turn-based engine
     */
    init() {
        // Initialize UI with callbacks
        this.uiController.init({
            onRollDice: () => this.rollDiceForCurrentPlayer(),
            onRollComplete: (result) => this.handleAfterDiceRoll(result),
            onTimerEnd: () => this.handleTimerEnd(),
            onPauseToggle: () => this.togglePauseGame()
        });

        this.initialized = true;
        this.running = false;
    }

    /**
     * Update game state and trigger phase handlers
     * @param {GameState} gameState - New game state
     */
    updateGameState(gameState) {
        this.gameState = gameState;

        // Update components
        this.turnManager.gameState = gameState;
        this.eventProcessor.gameState = gameState;
        this.uiController.updateFromGameState(gameState, this.peerId);

        // Handle game phase
        this.phaseStateMachine.handleGamePhase(this.gameState.gamePhase, { gameState });
    }

    /**
     * Handle player actions
     * @param {string} actionType - Type of action
     * @param {*} actionData - Action data
     */
    onPlayerAction(actionType, actionData) {
        // Could be extended for different action types
        console.log(`Turn-based engine received action: ${actionType}`, actionData);
    }

    /**
     * Clean up engine resources
     */
    cleanup() {
        this.uiController.cleanup();
        this.running = false;
        this.initialized = false;
    }

    /**
     * Get engine type identifier
     * @returns {string} Engine type
     */
    getEngineType() {
        return 'turn-based';
    }

    // ===== Game Phase Handlers =====

    handleInLobby() {
        console.log('Game is in the lobby phase.');
        this.running = false;
    }

    handleInGame() {
        this.running = true;
        // Enact all player effects before handling turn phases
        this.enactAllEffects();
        // Resume timer if paused
        this.uiController.resumeTimer();
        // Handle current turn phase
        this.phaseStateMachine.handleTurnPhase(this.gameState.turnPhase, { gameState: this.gameState });
    }

    handlePaused() {
        this.uiController.pauseTimer();
        this.uiController.deactivateRollButton();
        console.log('Game is currently paused.');
    }

    handleGameEnded() {
        this.running = false;
        this.uiController.stopTimer();
        this.uiController.deactivateRollButton();
        console.log('Game has ended.');
    }

    // ===== Turn Phase Handlers =====

    handleChangeTurn() {
        this.emitEvent('changeTurn', { gameState: this.gameState });

        const currentPlayer = this.turnManager.getCurrentPlayer();
        console.log(`Current Player State: ${currentPlayer.getState()},
                    Nickname: ${currentPlayer.nickname},
                    Player ID: ${currentPlayer.playerId},
                    Effects: ${currentPlayer.effects.length},
                    Turns Taken: ${currentPlayer.turnsTaken}`);

        if (this.isClientTurn()) {
            // Check if player should be skipped
            if ([PlayerStates.COMPLETED_GAME, PlayerStates.SKIPPING_TURN,
                 PlayerStates.SPECTATING, PlayerStates.DISCONNECTED].includes(currentPlayer.getState())) {
                this.changePhase({ newTurnPhase: TurnPhases.END_TURN, delay: 0 });
            } else {
                this.changePhase({ newTurnPhase: TurnPhases.BEGIN_TURN, delay: 0 });
            }
        }
    }

    handleBeginTurn() {
        this.emitEvent('beginTurn', { gameState: this.gameState });

        // Start timer for all players
        this.uiController.startTimer();

        if (this.isClientTurn()) {
            console.log(`It's your turn, ${this.turnManager.getCurrentPlayer().nickname}!`);
            this.changePhase({ newTurnPhase: TurnPhases.WAITING_FOR_MOVE, delay: 0 });
        }
    }

    handleWaitingForMove() {
        this.emitEvent('waitingForMove', { gameState: this.gameState });

        if (this.isClientTurn()) {
            this.uiController.activateRollButton();
        } else {
            console.log(`Waiting for ${this.turnManager.getCurrentPlayer().nickname} to take their turn.`);
            this.uiController.deactivateRollButton();
        }
    }

    handleProcessingEvents() {
        // Close any open modals
        this.uiController.hideAllModals();

        const currentPlayer = this.turnManager.getCurrentPlayer();
        console.log(`Processing events for ${currentPlayer.nickname}'s move.`);

        if (this.isClientTurn()) {
            // Check if we're already processing events
            if (this.eventProcessor.hasEventsToProcess()) {
                // Continue with next event in queue
                this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENT, delay: 0 });
            } else {
                // Start new event processing cycle
                const triggeredEvents = this.eventProcessor.determineTriggeredEvents(this.peerId);

                if (triggeredEvents.length === 0) {
                    // No events to process
                    this.eventProcessor.resetAllEvents();
                    this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_MOVE });
                } else {
                    // Start processing events
                    this.eventProcessor.startProcessing(triggeredEvents);
                    this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENT, delay: 0 });
                }
            }
        }
    }

    handleProcessingEvent() {
        // Get the next event to process
        const eventWithSpace = this.eventProcessor.getNextEvent();

        if (!eventWithSpace) {
            console.warn('No event to process in PROCESSING_EVENT phase');
            // No more events, finish processing
            this.eventProcessor.finishProcessing();
            this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_MOVE });
            return;
        }

        // Store for Action.js compatibility (it expects gameEngine.gameEventWithSpace.space)
        this.gameEventWithSpace = eventWithSpace;

        const { event: gameEvent, space: eventSpace } = eventWithSpace;

        // Emit event triggering
        this.emitEvent('gameEventTriggered', {
            gameEvent: gameEvent,
            gameState: this.gameState,
            eventSpace: eventSpace
        });

        // Execute the event action
        // The action's callback will advance to the next event
        gameEvent.executeAction(this, true);

        // Advance to next event after execution
        // Note: This happens immediately, but the callback in GameEvent.js will handle the phase change
        this.eventProcessor.advanceToNextEvent();

        // Note: The executed action's callback will call changePhase back to PROCESSING_EVENTS
        // This is handled by the event's completeActionCallback in GameEvent.js
    }

    handlePlayerChoosingDestination() {
        const currentPlayer = this.turnManager.getCurrentPlayer();
        const currentSpaceId = currentPlayer.getCurrentSpaceId();
        const currentSpace = this.gameState.board.getSpace(currentSpaceId);

        const connections = currentSpace.connections;
        const targetSpaces = connections.map(conn => conn.target);

        console.log(`${currentPlayer.nickname} is choosing a destination...`);
        console.log(`${currentPlayer.nickname} has multiple choices to move to: ${targetSpaces.map(space => space.id).join(', ')}`);

        if (this.isClientTurn()) {
            this.waitForChoice(currentPlayer, targetSpaces);
        }
    }

    handleProcessingMove() {
        this.emitEvent('processingMove', { gameState: this.gameState });

        if (this.isClientTurn()) {
            if (this.gameState.hasMovesLeft()) {
                this.processSingleMove();
            } else {
                this.changePhase({ newTurnPhase: TurnPhases.END_TURN, delay: 0 });
            }
        }
    }

    handleEndTurn() {
        console.log(`Ending turn for ${this.turnManager.getCurrentPlayer().nickname}.`);
        this.emitEvent('turnEnded', { gameState: this.gameState });

        // Stop timer
        this.uiController.stopTimer();

        // Check if all players completed the game
        const allCompletedGame = this.gameState.players.every(
            player => player.getState() === PlayerStates.COMPLETED_GAME
        );

        if (allCompletedGame) {
            console.log("All players completed the game. Ending the game.");
            this.changePhase({ newGamePhase: GamePhases.GAME_ENDED, newTurnPhase: TurnPhases.CHANGE_TURN, delay: 0 });
            return;
        }

        if (this.isClientTurn()) {
            // Move to next player's turn
            this.turnManager.nextTurn();
            this.changePhase({ newTurnPhase: TurnPhases.CHANGE_TURN, delay: 0 });
        }
    }

    handleTimerEnd() {
        if (this.isClientTurn()) {
            console.log(`Time's up for ${this.turnManager.getCurrentPlayer().nickname}! Ending turn.`);
            this.emitEvent('timerEnded', { gameState: this.gameState });

            this.uiController.deactivateRollButton();
            this.changePhase({ newTurnPhase: TurnPhases.END_TURN, delay: 0 });
        }
    }

    // ===== Helper Methods =====

    /**
     * Roll dice for current player
     * @returns {number} Roll result
     */
    rollDiceForCurrentPlayer() {
        const currentPlayer = this.turnManager.getCurrentPlayer();
        const rollResult = currentPlayer.rollDice();
        console.log(`${currentPlayer.nickname} rolled a ${rollResult}`);

        this.uiController.deactivateRollButton();
        return rollResult;
    }

    /**
     * Handle actions after dice roll animation
     * @param {number} rollResult - Dice roll result
     */
    handleAfterDiceRoll(rollResult) {
        this.gameState.setRemainingMoves(rollResult);
        this.emitEvent('playerRoll', { gameState: this.gameState });
        this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
    }

    /**
     * Process a single move
     */
    processSingleMove() {
        const currentPlayer = this.turnManager.getCurrentPlayer();
        const currentSpaceId = currentPlayer.getCurrentSpaceId();
        const currentSpace = this.gameState.board.getSpace(currentSpaceId);

        const connections = currentSpace.connections;

        if (connections.length === 0) {
            // No where to move
            this.gameState.setRemainingMoves(0);
            this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
        } else if (connections.length === 1) {
            // Auto-move to only connection
            const targetSpace = connections[0].target;
            this.gameState.movePlayer(targetSpace.id);
            console.log(`${currentPlayer.nickname} moved to space ${targetSpace.id}`);
            this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
        } else {
            // Multiple choices - let player choose
            this.changePhase({ newTurnPhase: TurnPhases.PLAYER_CHOOSING_DESTINATION, delay: 0 });
        }
    }

    /**
     * Wait for player to choose movement destination
     * @param {Player} currentPlayer - Current player
     * @param {Array} targetSpaces - Available spaces to move to
     */
    waitForChoice(currentPlayer, targetSpaces) {
        // Highlight possible target spaces
        this.uiController.highlightSpaces(targetSpaces);

        // Setup click handlers
        const handlers = this.uiController.setupSpaceClickHandlers(targetSpaces, (selectedSpace) => {
            // Move player to selected space
            this.gameState.movePlayer(selectedSpace.id);
            console.log(`${currentPlayer.nickname} chose to move to space ${selectedSpace.id}`);

            // Transition back to processing events
            this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
        });
    }

    /**
     * Toggle pause/resume game
     */
    togglePauseGame() {
        if (this.gameState.gamePhase === GamePhases.IN_GAME) {
            this.changePhase({ newGamePhase: GamePhases.PAUSED, delay: 0 });
            this.uiController.pauseTimer();
            this.uiController.deactivateRollButton();
            this.emitEvent('gamePaused', { gameState: this.gameState });
            console.log('Game paused.');
        } else if (this.gameState.gamePhase === GamePhases.PAUSED) {
            this.changePhase({ newGamePhase: GamePhases.IN_GAME, delay: 0 });
            this.uiController.resumeTimer();
            this.emitEvent('gameResumed', { gameState: this.gameState });
            console.log('Game resumed.');
        }
    }

    /**
     * Change game/turn phase and propose state
     * @param {Object} options - Phase change options
     */
    changePhase({ newGamePhase, newTurnPhase, delay = -1 } = {}) {
        if (newGamePhase) {
            this.gameState.setGamePhase(newGamePhase);
        }
        if (newTurnPhase) {
            this.gameState.setTurnPhase(newTurnPhase);
        }

        console.log("Changing Phase to:", this.gameState.turnPhase, this.gameState.gamePhase, delay);

        const updateDelay = delay >= 0 ? delay : this.gameState.settings.getMoveDelay();
        this.proposeStateChange(this.gameState, updateDelay);
    }

    /**
     * Show a prompt modal
     * @param {string} message - Message to display
     * @param {Function} callback - Callback when dismissed
     */
    showPromptModal(message, callback) {
        const modal = document.getElementById('gamePromptModal');
        const modalMessage = document.getElementById('gamePromptModalMessage');
        const dismissButton = document.getElementById('gamePromptModalDismissButton');

        modalMessage.textContent = message;  // Set the message in the modal

        // Show the modal
        modal.style.display = 'block';

        // Only show the dismiss button if it's the client's turn
        if (this.isClientTurn()) {
            dismissButton.style.display = 'inline-block'; // Show the dismiss button

            // Remove old listener if exists
            const newButton = dismissButton.cloneNode(true);
            dismissButton.parentNode.replaceChild(newButton, dismissButton);

            newButton.onclick = () => {
                // Close the modal for all players
                modal.style.display = 'none';

                // Call the callback and update the game state
                if (callback) {
                    callback();
                }
            };
        } else {
            dismissButton.style.display = 'none'; // Hide the dismiss button if it's not the client's turn
        }
    }

    /**
     * Enact all player effects
     */
    enactAllEffects() {
        this.gameState.players.forEach(player => {
            // Remove effects marked for removal before enacting
            const initialEffectCount = player.effects.length;
            player.effects = player.effects.filter(effect => !effect.toRemove);
            const removedBeforeCount = initialEffectCount - player.effects.length;

            if (removedBeforeCount > 0) {
                console.log(`Removed ${removedBeforeCount} effects before enacting for player ${player.nickname}`);
            }

            // Enact remaining effects
            player.effects.forEach(effect => effect.enact(this));

            // Remove effects marked for removal after enacting
            const effectCountAfterEnact = player.effects.length;
            player.effects = player.effects.filter(effect => !effect.toRemove);
            const removedAfterCount = effectCountAfterEnact - player.effects.length;

            if (removedAfterCount > 0) {
                console.log(`Removed ${removedAfterCount} effects after enacting for player ${player.nickname}`);
            }
        });
    }
}
