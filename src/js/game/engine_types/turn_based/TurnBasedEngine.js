/**
 * TurnBasedGameEngine - Concrete implementation for turn-based gameplay
 *
 * This engine implements the classic turn-based board game flow:
 * - Players take turns in sequence
 * - Dice rolling determines movement
 * - Events trigger based on space landings
 * - Effects are applied each turn
 */
import BaseTurnEngine from './BaseTurnEngine.js';
import TurnPhases from './phases/TurnPhases.js';
import GamePhases from '../../GamePhases.js';
import ApplyEffectAction from '../../../elements/actions/ApplyEffectAction.js';
import DisplacePlayerAction from '../../../elements/actions/DisplacePlayerAction.js';
import PromptAllPlayersAction from '../../../elements/actions/PromptAllPlayersAction.js';
import PromptCurrentPlayerAction from '../../../elements/actions/PromptCurrentPlayerAction.js';
import SetPlayerSpaceAction from '../../../elements/actions/SetPlayerSpaceAction.js';
import SetPlayerStateAction from '../../../elements/actions/SetPlayerStateAction.js';
import PromptModal from '../../../ui/modals/prompts/PromptModal.js';
import TurnBasedUIAdapter from './ui/TurnBasedUIAdapter.js';
import DefaultEffectScheduler from './effects/DefaultEffectScheduler.js';
import EventResolutionPipeline from './pipelines/EventResolutionPipeline.js';
import DiceMovementPolicy from './policies/DiceMovementPolicy.js';
import PlayerActionRouter from './controllers/PlayerActionRouter.js';
import SkipRepeatController from './controllers/SkipRepeatController.js';
import TurnFlowController from './controllers/TurnFlowController.js';
import MovementController from './controllers/MovementController.js';
import ModalController from './controllers/ModalController.js';

export default class TurnBasedGameEngine extends BaseTurnEngine {
    /**
     * Create a turn-based game engine
     * @param {Object} dependencies - Core dependencies from BaseGameEngine
     * @param {Object} config - Turn-based specific configuration
     */
    constructor(dependencies, config = {}) {
        super(dependencies, config);

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

        // Prompt modal instance (lazy init)
        this.promptModal = new PromptModal({ id: 'gamePromptModal', title: 'Message' });
        this.uiAdapter = new TurnBasedUIAdapter({
            uiSystem: dependencies.uiSystem,
            uiController: dependencies.rollButtonManager || dependencies.timerManager ? uiControllerFactory.create(
                config.uiController?.type || 'default',
                {
                    rollButtonManager: dependencies.rollButtonManager,
                    timerManager: dependencies.timerManager
                },
                config.uiController || {}
            ) : null,
            promptModal: this.promptModal,
            getUIComponent: this.getUIComponent.bind(this)
        });

        // Support UISystem (current approach) for backwards compatibility
        if (dependencies.uiSystem) {
            this.uiSystem = dependencies.uiSystem;
        }

        // Legacy UIController approach (backwards compatibility)
        // Will be replaced by UIComponentRegistry in the future
        this.uiController = this.uiAdapter.uiController || null;

        // Expose actions for controllers
        this.actions = {
            ApplyEffectAction,
            DisplacePlayerAction,
            PromptAllPlayersAction,
            PromptCurrentPlayerAction,
            SetPlayerSpaceAction,
            SetPlayerStateAction
        };

        // Subsystem modules
        this.effectScheduler = new DefaultEffectScheduler();
        this.eventPipeline = new EventResolutionPipeline(this.eventBus, this.peerId);
        this.movementPolicy = new DiceMovementPolicy();
        this.actionRouter = new PlayerActionRouter(this);
        this.skipRepeatController = new SkipRepeatController(this.eventBus);
        this.modalController = new ModalController(this.promptModal, this);
        this.movementController = new MovementController(this);
        this.turnFlowController = new TurnFlowController(this, {
            effectScheduler: this.effectScheduler,
            eventPipeline: this.eventPipeline,
            skipRepeatController: this.skipRepeatController
        });

        // Register phase handlers through controller
        this.turnFlowController.registerPhaseHandlers();

        // Initialize state machine without committing to a phase so first update triggers transitions
        this.phaseStateMachine.init(null, null);
    }

    // ===== UI Abstraction Methods =====
    // These methods work with UIComponentRegistry, UISystem, and UIController via the adapter

    activateRollButton() { return this.uiAdapter.activateRollButton(); }
    deactivateRollButton() { return this.uiAdapter.deactivateRollButton(); }
    startTimer() { return this.uiAdapter.startTimer(); }
    stopTimer() { return this.uiAdapter.stopTimer(); }
    pauseTimer() { return this.uiAdapter.pauseTimer(); }
    resumeTimer() { return this.uiAdapter.resumeTimer(); }
    showRemainingMoves() { return this.uiAdapter.showRemainingMoves(); }
    hideRemainingMoves() { return this.uiAdapter.hideRemainingMoves(); }
    updateRemainingMoves(moves) { return this.uiAdapter.updateRemainingMoves(moves); }
    hideAllModals() {
        this.modalController.clearAutoDismissTimer();
        return this.uiAdapter.hideAllModals();
    }
    updateUIFromGameState(gameState, peerId) {
        return this.uiAdapter.updateUIFromGameState(gameState, peerId);
    }

    /**
     * Initialize the turn-based engine
     */
    init() {
        // Try UIComponentRegistry components (future)
        let rollButton = this.getUIComponent('rollButton');
        let timer = this.getUIComponent('timer');
        let gameLog = this.getUIComponent('gameLog');

        // If not found, try UISystem components (current)
        if (!rollButton && this.uiSystem) {
            rollButton = this.uiSystem.getComponent('rollButton');
        }
        if (!timer && this.uiSystem) {
            timer = this.uiSystem.getComponent('timer');
        }
        if (!gameLog && this.uiSystem) {
            gameLog = this.uiSystem.getComponent('gameLog');
        }

        // Initialize roll button
        if (rollButton && rollButton.init) {
            rollButton.init({
                onRollDice: () => this.rollDiceForCurrentPlayer(),
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

        // Initialize game log
        if (gameLog && gameLog.init) {
            gameLog.init();
        }

        // Legacy UI controller path
        this.uiAdapter.initLegacyUI({
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
     * Clean up engine resources
     */
    cleanup() {
        this.cleanupActiveSpaceChoice();

        // UI components registered through UIComponentRegistry are cleaned up by the registry
        // No manual cleanup needed here for those components

        // Legacy UI controller cleanup
        if (this.uiController) {
            this.uiController.cleanup();
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

    // REMOVED: getCapabilities() - No longer using capability prediction system
    // The engine's needs are expressed through getRequiredUIComponents() and getOptionalUIComponents()

    /**
     * Get required UI components for this engine
     * @returns {UIComponentSpec[]}
     */
    getRequiredUIComponents() {
        return [
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
                required: false, // Optional turn timer
                description: 'Turn timer display and countdown',
                config: {},
                events: {
                    emits: ['timerExpired'],
                    listens: ['turnStarted', 'turnEnded', 'gamePaused', 'gameResumed']
                }
            },
            {
                id: 'remainingMoves',
                type: 'display',
                required: false, // Optional moves counter
                description: 'Display remaining moves in current turn',
                config: {},
                events: {
                    emits: [],
                    listens: ['playerRolled', 'playerMoved']
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
                    listens: ['*'] // Listens to all events
                }
            },
            {
                id: 'playerList',
                type: 'display',
                required: false,
                description: 'List of all players',
                config: {},
                events: {
                    emits: ['playerSelected'],
                    listens: ['gameStateUpdated', 'playerAdded', 'playerRemoved']
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
            remainingMoves: this.gameState?.remainingMoves || 0,
            gamePhase: this.gameState?.gamePhase,
            turnPhase: this.gameState?.turnPhase
        };
    }

    /**
     * Handle generic player action
     * @param {string} playerId - Player ID
     * @param {string} actionType - Action type
     * @param {Object} actionData - Action data
     * @returns {Promise<Object>} Action result
     */
    async onPlayerAction(playerId, actionType, actionData) {
        return this.actionRouter.route(playerId, actionType, actionData);
    }

    // ===== Game Phase Handlers =====

    handleInLobby() { return this.turnFlowController.handleInLobby(); }
    handleInGame() { return this.turnFlowController.handleInGame(); }
    handlePaused() { return this.turnFlowController.handlePaused(); }
    handleGameEnded() { return this.turnFlowController.handleGameEnded(); }

    // ===== Turn Phase Handlers =====

    handleChangeTurn() { return this.turnFlowController.handleChangeTurn(); }
    handlePlayersRemoved(removedPlayers = [], options = {}) { return this.turnFlowController.handlePlayersRemoved(removedPlayers, options); }
    handleBeginTurn() { return this.turnFlowController.handleBeginTurn(); }
    handleWaitingForMove() { return this.turnFlowController.handleWaitingForMove(); }
    handleProcessingEvents() { return this.turnFlowController.handleProcessingEvents(); }
    handleProcessingEvent() { return this.turnFlowController.handleProcessingEvent(); }
    handlePlayerChoosingDestination() { return this.turnFlowController.handlePlayerChoosingDestination(); }
    handleProcessingMove() { return this.turnFlowController.handleProcessingMove(); }
    handleEndTurn() { return this.turnFlowController.handleEndTurn(); }
    handleTimerEnd() { return this.turnFlowController.handleTimerEnd(); }

    // ===== Helper Methods =====

    /**
     * Roll dice for current player
     * @returns {number} Roll result
     */
    rollDiceForCurrentPlayer() {
        const currentPlayer = this.turnManager.getCurrentPlayer();
        const rollResult = this.movementPolicy.rollForPlayer(currentPlayer);

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
    processSingleMove() { return this.movementController.processSingleMove(); }
    waitForChoice(currentPlayer, targetSpaces) { return this.movementController.waitForChoice(currentPlayer, targetSpaces); }
    clearModalAutoDismissTimer() { return this.modalController.clearAutoDismissTimer(); }
    startModalCountdown(countdownEl, durationMs) { return this.modalController.startModalCountdown(countdownEl, durationMs); }
    cleanupActiveSpaceChoice() { return this.movementController.cleanupActiveSpaceChoice(); }

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
        return this.modalController.showPromptModal(message, callback);
    }

    /**
     * Enact all player effects
     */
    enactAllEffects() {
        return this.effectScheduler.enactAll(this.gameState, this);
    }
}
