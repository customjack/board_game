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
import TurnPhases from '../enums/TurnPhases.js';
import GamePhases from '../enums/GamePhases.js';
import PlayerStates from '../enums/PlayerStates.js';
import ActionTypes from '../enums/ActionTypes.js';
import GameLogPopupController from '../controllers/GameLogPopupController.js';
import { getVisibleElementById } from '../utils/helpers.js';

export default class TurnBasedGameEngine extends BaseGameEngine {
    /**
     * Create a turn-based game engine
     * @param {Object} dependencies - Core dependencies from BaseGameEngine
     * @param {Object} config - Turn-based specific configuration
     */
    constructor(dependencies, config = {}) {
        super(dependencies, config);

        this.activeSpaceChoice = null;
        this.modalAutoDismissTimer = null;
        this.modalCountdownInterval = null;

        // Get factories from factoryManager
        const phaseStateMachineFactory = this.factoryManager.getFactory('PhaseStateMachineFactory');
        const turnManagerFactory = this.factoryManager.getFactory('TurnManagerFactory');
        const eventProcessorFactory = this.factoryManager.getFactory('EventProcessorFactory');
        const uiControllerFactory = this.factoryManager.getFactory('UIControllerFactory');

        // Initialize components using factories
        this.phaseStateMachine = phaseStateMachineFactory.create(
            {
                type: config.phaseStateMachine?.type || 'default',
                phases: {
                    gamePhases: Object.values(GamePhases),
                    turnPhases: Object.values(TurnPhases)
                }
            },
            this.eventBus
        );

        this.turnManager = turnManagerFactory.create(
            config.turnManager?.type || 'default',
            this.gameState,
            config.turnManager || {}
        );

        this.eventProcessor = eventProcessorFactory.create(
            config.eventProcessor?.type || 'default',
            this.gameState,
            this.eventBus,
            config.eventProcessor || {}
        );

        // Support both new UISystem and legacy manager approach
        if (dependencies.uiSystem) {
            // New modular approach
            this.uiSystem = dependencies.uiSystem;
            this.rollButton = this.uiSystem.getComponent('rollButton');
            this.timer = this.uiSystem.getComponent('timer');
            this.remainingMoves = this.uiSystem.getComponent('remainingMoves');
            this.gameLog = this.uiSystem.getComponent('gameLog');
            // Still need popup controller for the button
            this.gameLogPopupController = new GameLogPopupController(this.eventBus);
        } else {
            // Legacy approach (backwards compatibility)
            this.uiController = uiControllerFactory.create(
                config.uiController?.type || 'default',
                {
                    rollButtonManager: dependencies.rollButtonManager,
                    timerManager: dependencies.timerManager
                },
                config.uiController || {}
            );
            this.gameLogPopupController = new GameLogPopupController(this.eventBus);
        }

        // Register phase handlers
        this.registerPhaseHandlers();

        // Initialize state machine without committing to a phase so first update triggers transitions
        this.phaseStateMachine.init(null, null);
    }

    // ===== UI Abstraction Methods =====
    // These methods work with both UISystem (new) and UIController (legacy)

    activateRollButton() {
        if (this.rollButton) {
            this.rollButton.activate();
        } else if (this.uiController) {
            this.uiController.activateRollButton();
        }
    }

    deactivateRollButton() {
        if (this.rollButton) {
            this.rollButton.deactivate();
        } else if (this.uiController) {
            this.uiController.deactivateRollButton();
        }
    }

    startTimer() {
        if (this.timer) {
            this.timer.startTimer();
        } else if (this.uiController) {
            this.uiController.startTimer();
        }
    }

    stopTimer() {
        if (this.timer) {
            this.timer.stopTimer();
        } else if (this.uiController) {
            this.uiController.stopTimer();
        }
    }

    pauseTimer() {
        if (this.timer) {
            this.timer.pauseTimer();
        } else if (this.uiController) {
            this.uiController.pauseTimer();
        }
    }

    resumeTimer() {
        if (this.timer) {
            this.timer.resumeTimer();
        } else if (this.uiController) {
            this.uiController.resumeTimer();
        }
    }

    showRemainingMoves() {
        if (this.remainingMoves) {
            this.remainingMoves.show();
        } else if (this.uiController) {
            this.uiController.showRemainingMoves();
        }
    }

    hideRemainingMoves() {
        if (this.remainingMoves) {
            this.remainingMoves.hide();
        } else if (this.uiController) {
            this.uiController.hideRemainingMoves();
        }
    }

    updateRemainingMoves(moves) {
        if (this.remainingMoves) {
            this.remainingMoves.updateMoves(moves);
        } else if (this.uiController) {
            this.uiController.updateRemainingMoves(moves);
        }
    }

    hideAllModals() {
        this.clearModalAutoDismissTimer();

        if (this.uiController) {
            this.uiController.hideAllModals();
        } else {
            // When using UISystem, manually hide modal DOM elements
            const modals = [
                document.getElementById('gamePromptModal'),
                document.getElementById('choiceModal'),
                document.getElementById('notificationModal')
            ];

            modals.forEach(modal => {
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        }
    }

    updateUIFromGameState(gameState, peerId) {
        if (this.uiSystem) {
            // UISystem handles this internally via components
            // Nothing needed here as it's handled by BaseEventHandler
        } else if (this.uiController) {
            this.uiController.updateFromGameState(gameState, peerId);
        }
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
        if (this.uiSystem) {
            // New modular approach
            if (this.rollButton) {
                this.rollButton.init({
                    onRollDice: () => this.rollDiceForCurrentPlayer(),
                    onRollComplete: (result) => this.handleAfterDiceRoll(result)
                });
            }
            if (this.timer) {
                this.timer.init({
                    onTimerEnd: () => this.handleTimerEnd(),
                    onPauseToggle: () => this.handlePauseToggle()
                });
            }
            if (this.gameLog) {
                this.gameLog.init();
            }
            // Init popup controller for the button
            if (this.gameLogPopupController) {
                this.gameLogPopupController.init();
            }
        } else {
            // Legacy approach
            this.uiController.init({
                onRollDice: () => this.rollDiceForCurrentPlayer(),
                onRollComplete: (result) => this.handleAfterDiceRoll(result),
                onTimerEnd: () => this.handleTimerEnd(),
                onPauseToggle: () => this.togglePauseGame()
            });

            this.gameLogPopupController.init();
        }

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
        this.updateUIFromGameState(gameState, this.peerId);

        const currentGamePhase = this.gameState.gamePhase;
        const currentTurnPhase = this.gameState.turnPhase;

        const gamePhaseChanged = !this.phaseStateMachine.isInGamePhase(currentGamePhase);
        const turnPhaseChanged = !this.phaseStateMachine.isInTurnPhase(currentTurnPhase);

        if (gamePhaseChanged) {
            this.phaseStateMachine.transitionGamePhase(currentGamePhase, { gameState: this.gameState });
        }

        const hasTurnPhase = currentTurnPhase !== undefined && currentTurnPhase !== null;
        const shouldHandleTurnPhase = hasTurnPhase && [GamePhases.IN_GAME, GamePhases.PAUSED].includes(currentGamePhase);

        if (shouldHandleTurnPhase && (gamePhaseChanged || turnPhaseChanged)) {
            this.phaseStateMachine.transitionTurnPhase(currentTurnPhase, { gameState: this.gameState });
        }
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
        this.cleanupActiveSpaceChoice();
        if (this.uiSystem) {
            // UI components are managed by UISystem
        } else if (this.uiController) {
            this.uiController.cleanup();
            this.gameLogPopupController.destroy();
        }
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
        this.hideRemainingMoves();
    }

    handleInGame() {
        this.running = true;
        // Enact all player effects before handling turn phases
        this.enactAllEffects();
        // Resume timer if paused
        this.resumeTimer();
        // Show remaining moves counter
        this.showRemainingMoves();
    }

    handlePaused() {
        this.pauseTimer();
        this.deactivateRollButton();
        console.log('Game is currently paused.');
    }

    handleGameEnded() {
        this.running = false;
        this.stopTimer();
        this.deactivateRollButton();
        this.hideRemainingMoves();
        console.log('Game has ended.');
    }

    // ===== Turn Phase Handlers =====

    handleChangeTurn() {
        this.emitEvent('changeTurn', { gameState: this.gameState });

        const currentPlayer = this.turnManager.getCurrentPlayer();
        if (!currentPlayer) {
            console.warn('No current player available during handleChangeTurn.');
            return;
        }
        const shouldSkipTurn = [PlayerStates.COMPLETED_GAME, PlayerStates.SKIPPING_TURN,
            PlayerStates.SPECTATING, PlayerStates.DISCONNECTED].includes(currentPlayer.getState());

        if (this.isClientTurn()) {
            // Check if player should be skipped
            if (shouldSkipTurn) {
                this.changePhase({ newTurnPhase: TurnPhases.END_TURN, delay: 0 });
            } else {
                this.changePhase({ newTurnPhase: TurnPhases.BEGIN_TURN, delay: 0 });
            }
        }
    }

    handleBeginTurn() {
        this.emitEvent('beginTurn', { gameState: this.gameState });

        // Start timer for all players
        this.startTimer();

        const currentPlayer = this.turnManager.getCurrentPlayer();

        if (this.isClientTurn()) {
            console.log(`It's your turn, ${currentPlayer.nickname}!`);
            this.changePhase({ newTurnPhase: TurnPhases.WAITING_FOR_MOVE, delay: 0 });
        }
    }

    handleWaitingForMove() {
        this.emitEvent('waitingForMove', { gameState: this.gameState });

        const currentPlayer = this.turnManager.getCurrentPlayer();
        if (this.isClientTurn()) {
            this.activateRollButton();
        } else {
            console.log(`Waiting for ${currentPlayer?.nickname ?? 'player'} to take their turn.`);
            this.deactivateRollButton();
        }
    }

    handleProcessingEvents() {
        this.cleanupActiveSpaceChoice();
        // Close any open modals
        this.hideAllModals();

        // Re-determine triggered events each time (matches old GameEngine behavior)
        // This automatically excludes completed events since their state changed
        const triggeredEvents = this.gameState.determineTriggeredEvents(this.eventBus, this.peerId);
        const currentPlayer = this.turnManager.getCurrentPlayer();

        if (triggeredEvents.length === 0) {
            // No events to process, reset all events and move on
            this.gameState.resetEvents();
            if (this.isClientTurn()) {
                this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_MOVE });
            }
        } else {
            triggeredEvents.forEach(({ event, space }) => {
                const description = this.describeTriggeredEvent(event, space);
                this.logPlayerAction(currentPlayer, description, {
                    type: 'event-processing',
                    metadata: { spaceId: space?.id, actionType: event?.action?.type }
                });
            });
            if (this.isClientTurn()) {
                // Transition to process the first event
                this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENT, delay: 0 });
            }
        }
    }

    handleProcessingEvent() {
        // Re-determine triggered events (same as old GameEngine approach)
        // This is called each time we process an event, and gets the current list
        const triggeredEvents = this.gameState.determineTriggeredEvents(this.eventBus, this.peerId);

        if (triggeredEvents.length === 0) {
            // No more events to process
            console.log('No more events to process');
            this.gameState.resetEvents();
            this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_MOVE });
            return;
        }

        // Get the first event (matches old GameEngine behavior)
        const eventWithSpace = triggeredEvents[0];

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
        gameEvent.executeAction(this, true);

        // Note: The executed action's callback will call changePhase back to PROCESSING_EVENTS
        // At that point, the event's state will be COMPLETED_ACTION and won't appear in triggered events anymore
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
        this.cleanupActiveSpaceChoice();
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
        this.cleanupActiveSpaceChoice();
        console.log(`Ending turn for ${this.turnManager.getCurrentPlayer().nickname}.`);
        this.emitEvent('turnEnded', { gameState: this.gameState });

        // Stop timer
        this.stopTimer();

        // Check if all players completed the game
        const allCompletedGame = this.gameState.players.every(
            player => player.getState() === PlayerStates.COMPLETED_GAME
        );

        if (allCompletedGame) {
            console.log("All players completed the game. Ending the game.");
            this.log('All players have completed the game.', { type: 'system' });
            this.changePhase({ newGamePhase: GamePhases.GAME_ENDED, newTurnPhase: TurnPhases.CHANGE_TURN, delay: 0 });
            return;
        }

        const currentPlayer = this.turnManager.getCurrentPlayer();
        if (currentPlayer) {
            this.logPlayerAction(currentPlayer, 'ended their turn.', {
                type: 'turn-end',
                metadata: { remainingMoves: this.gameState.remainingMoves }
            });
        }

        if (this.isClientTurn()) {
            // Move to next player's turn
            this.turnManager.nextTurn();
            this.changePhase({ newTurnPhase: TurnPhases.CHANGE_TURN, delay: 0 });
        }
    }

    handleTimerEnd() {
        if (this.isClientTurn()) {
            const player = this.turnManager.getCurrentPlayer();
            console.log(`Time's up for ${player.nickname}! Ending turn.`);
            this.emitEvent('timerEnded', { gameState: this.gameState });
            if (player) {
                this.logPlayerAction(player, 'ran out of time.', {
                    type: 'timer',
                    metadata: { turnTimer: this.gameState.settings.turnTimer }
                });
            }

            this.deactivateRollButton();
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
        this.logPlayerAction(currentPlayer, `rolled a ${rollResult}.`, {
            type: 'dice-roll',
            metadata: { result: rollResult }
        });

        this.deactivateRollButton();
        return rollResult;
    }

    /**
     * Handle actions after dice roll animation
     * @param {number} rollResult - Dice roll result
     */
    handleAfterDiceRoll(rollResult) {
        this.gameState.setRemainingMoves(rollResult);
        this.updateRemainingMoves(rollResult);
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
            this.updateRemainingMoves(0);
            this.logPlayerAction(currentPlayer, 'cannot move from their current space.', {
                type: 'movement',
                metadata: { spaceId: currentSpaceId, reason: 'no-connections' }
            });
            this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
        } else if (connections.length === 1) {
            // Auto-move to only connection
            const targetSpace = connections[0].target;
            this.gameState.movePlayer(targetSpace.id);
            console.log(`${currentPlayer.nickname} moved to space ${targetSpace.id}`);
            this.logPlayerAction(currentPlayer, `moved to ${targetSpace.name || targetSpace.id}.`, {
                type: 'movement',
                metadata: { spaceId: targetSpace.id }
            });
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
        if (this.uiController) {
            // Legacy UI controller path
            this.uiController.highlightSpaces(targetSpaces);
            this.uiController.setupSpaceClickHandlers(targetSpaces, (selectedSpace) => {
                this.gameState.movePlayer(selectedSpace.id);
                console.log(`${currentPlayer.nickname} chose to move to space ${selectedSpace.id}`);
                this.logPlayerAction(currentPlayer, `moved to ${selectedSpace.name || selectedSpace.id}.`, {
                    type: 'movement',
                    metadata: { spaceId: selectedSpace.id, selected: true }
                });
                this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
            });
            return;
        }

        if (this.uiSystem) {
            this.cleanupActiveSpaceChoice();

            const handlers = new Map();
            const uniqueSpaces = Array.from(new Map(targetSpaces.map(space => [space.id, space])).values());

            uniqueSpaces.forEach(space => {
                const spaceElement = getVisibleElementById(`space-${space.id}`);
                if (!spaceElement) {
                    console.warn(`No visible element found for space ${space.id}`);
                    return;
                }

                spaceElement.classList.add('highlight');

                const handler = () => {
                    this.cleanupActiveSpaceChoice();
                    this.gameState.movePlayer(space.id);
                    console.log(`${currentPlayer.nickname} chose to move to space ${space.id}`);
                    this.logPlayerAction(currentPlayer, `moved to ${space.name || space.id}.`, {
                        type: 'movement',
                        metadata: { spaceId: space.id, selected: true }
                    });
                    this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
                };

                spaceElement.addEventListener('click', handler);
                handlers.set(space.id, { element: spaceElement, handler });
            });

            this.activeSpaceChoice = {
                spaces: uniqueSpaces,
                handlers
            };
            return;
        }

        console.warn('Board interaction not available - auto-selecting first space');
        if (targetSpaces.length > 0) {
            const selectedSpace = targetSpaces[0];
            this.gameState.movePlayer(selectedSpace.id);
            this.logPlayerAction(currentPlayer, `moved to ${selectedSpace.name || selectedSpace.id}.`, {
                type: 'movement',
                metadata: { spaceId: selectedSpace.id, selected: true }
            });
            this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
        }
    }

    clearModalAutoDismissTimer() {
        if (this.modalAutoDismissTimer) {
            clearTimeout(this.modalAutoDismissTimer);
            this.modalAutoDismissTimer = null;
        }
        if (this.modalCountdownInterval) {
            clearInterval(this.modalCountdownInterval);
            this.modalCountdownInterval = null;
        }
        const countdownEl = document.getElementById('gamePromptModalCountdown');
        if (countdownEl) {
            countdownEl.style.display = 'none';
            countdownEl.textContent = '';
        }
    }

    startModalCountdown(countdownEl, durationMs) {
        if (!countdownEl) return;
        const endTime = Date.now() + durationMs;
        countdownEl.style.display = 'block';

        const updateText = () => {
            const remainingMs = Math.max(0, endTime - Date.now());
            const remainingSeconds = Math.ceil(remainingMs / 1000);
            countdownEl.textContent = remainingSeconds > 0
                ? `Auto-closing in ${remainingSeconds}s`
                : 'Closing...';

            if (remainingMs <= 0) {
                clearInterval(this.modalCountdownInterval);
                this.modalCountdownInterval = null;
            }
        };

        updateText();
        this.modalCountdownInterval = setInterval(updateText, 250);
    }

    cleanupActiveSpaceChoice() {
        if (!this.activeSpaceChoice) {
            return;
        }

        const { spaces = [], handlers = new Map() } = this.activeSpaceChoice;

        spaces.forEach(space => {
            const entry = handlers.get(space.id);
            if (entry?.element && entry.handler) {
                entry.element.removeEventListener('click', entry.handler);
            }

            const element = getVisibleElementById(`space-${space.id}`);
            if (element) {
                element.classList.remove('highlight');
            }
        });

        this.activeSpaceChoice = null;
    }

    describeTriggeredEvent(event, space) {
        const spaceLabel = space?.name || space?.id || 'a space';
        const action = event?.action;
        if (!action) {
            return `triggered an event on ${spaceLabel}`;
        }

        const actionType = action.type;
        switch (actionType) {
            case ActionTypes.PROMPT_ALL_PLAYERS:
            case ActionTypes.PROMPT_CURRENT_PLAYER: {
                const message = action.payload?.message;
                if (message) {
                    return `triggered a prompt on ${spaceLabel}: "${this.truncateMessage(message)}"`;
                }
                return `triggered a prompt on ${spaceLabel}`;
            }
            case ActionTypes.DISPLACE_PLAYER: {
                const steps = action.payload?.steps;
                if (typeof steps === 'number' && steps !== 0) {
                    const absSteps = Math.abs(steps);
                    const stepLabel = `space${absSteps === 1 ? '' : 's'}`;
                    return steps > 0
                        ? `triggered a move forward ${absSteps} ${stepLabel} on ${spaceLabel}`
                        : `triggered a move back ${absSteps} ${stepLabel} on ${spaceLabel}`;
                }
                return `triggered a movement effect on ${spaceLabel}`;
            }
            case ActionTypes.APPLY_EFFECT:
                return `triggered a player effect on ${spaceLabel}`;
            case ActionTypes.SET_PLAYER_STATE: {
                const state = action.payload?.state;
                return state
                    ? `triggered a state change to ${state}`
                    : `triggered a state change`;
            }
            case ActionTypes.SET_PLAYER_SPACE: {
                const target = action.payload?.spaceId;
                return target
                    ? `triggered a teleport to ${target}`
                    : `triggered a teleport event`;
            }
            case ActionTypes.CUSTOM:
                return `triggered a custom event on ${spaceLabel}`;
            default:
                return `triggered an event (${actionType}) on ${spaceLabel}`;
        }
    }

    truncateMessage(message, limit = 60) {
        if (typeof message !== 'string') return '';
        if (message.length <= limit) return message;
        return `${message.slice(0, limit - 1)}…`;
    }

    /**
     * Toggle pause/resume game
     */
    togglePauseGame() {
        if (this.gameState.gamePhase === GamePhases.IN_GAME) {
            this.changePhase({ newGamePhase: GamePhases.PAUSED, delay: 0 });
            this.pauseTimer();
            this.deactivateRollButton();
            this.emitEvent('gamePaused', { gameState: this.gameState });
            console.log('Game paused.');
            this.log('Game paused', { type: 'system' });
        } else if (this.gameState.gamePhase === GamePhases.PAUSED) {
            this.changePhase({ newGamePhase: GamePhases.IN_GAME, delay: 0 });
            this.resumeTimer();
            this.emitEvent('gameResumed', { gameState: this.gameState });
            console.log('Game resumed.');
            this.log('Game resumed', { type: 'system' });
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
        const countdownEl = document.getElementById('gamePromptModalCountdown');

        if (!modal || !modalMessage || !dismissButton) {
            console.warn('Prompt modal elements missing; cannot display prompt.');
            if (typeof callback === 'function' && this.isClientTurn()) {
                callback();
            }
            return;
        }

        modalMessage.textContent = message;
        if (countdownEl) {
            countdownEl.style.display = 'none';
            countdownEl.textContent = '';
        }
        modal.style.display = 'block';

        this.clearModalAutoDismissTimer();

        let resolved = false;
        const resolveOnce = () => {
            if (resolved) return;
            resolved = true;
            if (typeof callback === 'function') {
                callback();
            }
        };

        const closeModal = (shouldResolve = false) => {
            modal.style.display = 'none';
            this.clearModalAutoDismissTimer();
            if (countdownEl) {
                countdownEl.style.display = 'none';
            }
            if (shouldResolve) {
                resolveOnce();
            }
        };

        const timeoutSeconds = this.gameState?.settings?.getModalTimeoutSeconds?.() ?? 0;
        if (timeoutSeconds > 0) {
            const timeoutMs = timeoutSeconds * 1000;
            this.modalAutoDismissTimer = setTimeout(() => {
                this.modalAutoDismissTimer = null;
                const shouldResolve = this.isClientTurn();
                closeModal(shouldResolve);
            }, timeoutMs);
            this.startModalCountdown(countdownEl, timeoutMs);
        }

        if (this.isClientTurn()) {
            dismissButton.style.display = 'inline-block';

            const newButton = dismissButton.cloneNode(true);
            dismissButton.parentNode.replaceChild(newButton, dismissButton);

            newButton.onclick = () => closeModal(true);
        } else {
            dismissButton.style.display = 'none';
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
