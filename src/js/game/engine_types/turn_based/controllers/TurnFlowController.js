import BaseTurnController from './BaseTurnController.js';
import TurnPhases from '../phases/TurnPhases.js';
import GamePhases from '../../../GamePhases.js';
import { PlayerStates } from '../../../../elements/models/Player.js';

/**
 * TurnFlowController - orchestrates game/turn phase transitions
 */
export default class TurnFlowController extends BaseTurnController {
    constructor(engine, { effectScheduler, eventPipeline, skipRepeatController, movementController, uiAdapter, modalController }) {
        super();
        this.engine = engine;
        this.effectScheduler = effectScheduler;
        this.eventPipeline = eventPipeline;
        this.skipRepeatController = skipRepeatController;
        this.movementController = movementController;
        this.uiAdapter = uiAdapter;
        this.modalController = modalController;
    }

    registerPhaseHandlers() {
        const psm = this.engine.phaseStateMachine;
        psm.registerGamePhaseHandler(GamePhases.IN_LOBBY, () => this.handleInLobby());
        psm.registerGamePhaseHandler(GamePhases.IN_GAME, () => this.handleInGame());
        psm.registerGamePhaseHandler(GamePhases.PAUSED, () => this.handlePaused());
        psm.registerGamePhaseHandler(GamePhases.GAME_ENDED, () => this.handleGameEnded());

        psm.registerTurnPhaseHandler(TurnPhases.CHANGE_TURN, () => this.handleChangeTurn());
        psm.registerTurnPhaseHandler(TurnPhases.BEGIN_TURN, () => this.handleBeginTurn());
        psm.registerTurnPhaseHandler(TurnPhases.WAITING_FOR_MOVE, () => this.handleWaitingForMove());
        psm.registerTurnPhaseHandler(TurnPhases.PROCESSING_EVENTS, () => this.handleProcessingEvents());
        psm.registerTurnPhaseHandler(TurnPhases.PROCESSING_EVENT, () => this.handleProcessingEvent());
        psm.registerTurnPhaseHandler(TurnPhases.PROCESSING_MOVE, () => this.handleProcessingMove());
        psm.registerTurnPhaseHandler(TurnPhases.PLAYER_CHOOSING_DESTINATION, () => this.handlePlayerChoosingDestination());
        psm.registerTurnPhaseHandler(TurnPhases.END_TURN, () => this.handleEndTurn());
    }

    handleInLobby() {
        this.engine.running = false;
        this.uiAdapter.hideRemainingMoves();
    }

    handleInGame() {
        this.engine.running = true;
        this.effectScheduler.enactAll(this.engine.gameState, this.engine);
        this.uiAdapter.resumeTimer();
        this.uiAdapter.showRemainingMoves();
    }

    handlePaused() {
        this.uiAdapter.pauseTimer();
        this.uiAdapter.deactivateRollButton();
        console.log('Game is currently paused.');
    }

    handleGameEnded() {
        this.engine.running = false;
        this.uiAdapter.stopTimer();
        this.uiAdapter.deactivateRollButton();
        this.uiAdapter.hideRemainingMoves();
        console.log('Game has ended.');
    }

    handleChangeTurn() {
        this.engine.emitEvent('changeTurn', { gameState: this.engine.gameState });

        this.effectScheduler.enactAll(this.engine.gameState, this.engine);

        const currentPlayer = this.engine.turnManager.getCurrentPlayer();
        if (!currentPlayer) {
            console.warn('No current player available during handleChangeTurn.');
            return;
        }
        const shouldSkipTurn = [PlayerStates.COMPLETED_GAME, PlayerStates.SKIPPING_TURN,
            PlayerStates.SPECTATING, PlayerStates.DISCONNECTED].includes(currentPlayer.getState());

        if (this.engine.isClientTurn()) {
            this.engine.handleTurnChangeDecision({
                shouldSkip: shouldSkipTurn,
                onSkip: () => this.engine.changePhase({ newTurnPhase: TurnPhases.END_TURN, delay: 0 }),
                onProceed: () => this.engine.changePhase({ newTurnPhase: TurnPhases.BEGIN_TURN, delay: 0 })
            });
        }
    }

    handlePlayersRemoved(removedPlayers = [], options = {}) {
        if (!Array.isArray(removedPlayers) || removedPlayers.length === 0) return;

        const removedIds = new Set(removedPlayers.map(p => p.playerId));
        const current = this.engine.turnManager?.getCurrentPlayer?.();
        const wasCurrent = options.wasCurrent || (current && removedIds.has(current.playerId));
        if (!current || !wasCurrent) return;

        this.engine.gameState.setRemainingMoves?.(0);

        if (this.engine.gameState.players.length > 0) {
            this.engine.turnManager?.nextTurn?.({ reason: 'playerRemoved' });
            this.engine.changePhase({ newTurnPhase: TurnPhases.BEGIN_TURN, delay: 0 });
        } else {
            this.engine.changePhase({ newTurnPhase: TurnPhases.BEGIN_TURN, delay: 0 });
        }
    }

    handleBeginTurn() {
        this.engine.emitEvent('beginTurn', { gameState: this.engine.gameState });
        this.uiAdapter.startTimer();

        const currentPlayer = this.engine.turnManager.getCurrentPlayer();

        if (this.engine.isClientTurn()) {
            console.log(`It's your turn, ${currentPlayer.nickname}!`);
            this.engine.changePhase({ newTurnPhase: TurnPhases.WAITING_FOR_MOVE, delay: 0 });
        }
    }

    handleWaitingForMove() {
        this.engine.emitEvent('waitingForMove', { gameState: this.engine.gameState });

        const currentPlayer = this.engine.turnManager.getCurrentPlayer();
        if (this.engine.isClientTurn()) {
            this.uiAdapter.activateRollButton();
        } else {
            console.log(`Waiting for ${currentPlayer?.nickname ?? 'player'} to take their turn.`);
            this.uiAdapter.deactivateRollButton();
        }
    }

    handleProcessingEvents() {
        this.movementController.cleanupActiveSpaceChoice();
        this.modalController.clearAutoDismissTimer();
        this.uiAdapter.hideAllModals();
        this.engine.clearActiveEventContext();

        const triggeredEvents = this.eventPipeline.collect(this.engine.gameState, this.engine.eventBus, this.engine.peerId);
        const currentPlayer = this.engine.turnManager.getCurrentPlayer();

        this.engine.processTriggeredEventsFlow(triggeredEvents, {
            onEmpty: () => {
                this.engine.gameState.resetEvents();
                if (this.engine.isClientTurn()) {
                    this.engine.changePhase({ newTurnPhase: TurnPhases.PROCESSING_MOVE });
                }
            },
            onProcess: () => {
                triggeredEvents.forEach(({ event, space }) => {
                    const description = this.describeTriggeredEvent(event, space);
                    this.engine.logPlayerAction(currentPlayer, description, {
                        type: 'event-processing',
                        metadata: { spaceId: space?.id, actionType: event?.action?.type }
                    });
                });
                if (this.engine.isClientTurn()) {
                    this.engine.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENT, delay: 0 });
                }
            }
        });
    }

    handleProcessingEvent() {
        const triggeredEvents = this.eventPipeline.collect(this.engine.gameState, this.engine.eventBus, this.engine.peerId);

        console.log('Remaining triggered events to process:', triggeredEvents.length);

        if (triggeredEvents.length === 0) {
            console.log('No more events to process');
            this.engine.gameState.resetEvents();
            this.engine.changePhase({ newTurnPhase: TurnPhases.PROCESSING_MOVE });
            this.engine.clearActiveEventContext();
            return;
        }

        const eventWithSpace = triggeredEvents[0];
        this.engine.setActiveEventContext(eventWithSpace);

        const { event: gameEvent, space: eventSpace } = eventWithSpace;

        this.engine.emitEvent('gameEventTriggered', {
            gameEvent: gameEvent,
            gameState: this.engine.gameState,
            eventSpace: eventSpace
        });

        gameEvent.executeAction(this.engine, true);
    }

    handlePlayerChoosingDestination() {
        const currentPlayer = this.engine.turnManager.getCurrentPlayer();
        const currentSpaceId = currentPlayer.getCurrentSpaceId();
        const currentSpace = this.engine.gameState.board.getSpace(currentSpaceId);

        if (!currentSpace) {
            console.warn(`Player ${currentPlayer.nickname} is on unknown space ${currentSpaceId}. Resetting remaining moves.`);
            this.engine.gameState.setRemainingMoves(0);
            this.uiAdapter.updateRemainingMoves(0);
            this.engine.changePhase({ newTurnPhase: TurnPhases.END_TURN, delay: 0 });
            return;
        }

        const connections = currentSpace.connections;
        const targetSpaces = connections.map(conn => conn.target);

        console.log(`${currentPlayer.nickname} is choosing a destination...`);
        console.log(`${currentPlayer.nickname} has multiple choices to move to: ${targetSpaces.map(space => space.id).join(', ')}`);

        if (this.engine.isClientTurn()) {
            this.movementController.waitForChoice(currentPlayer, targetSpaces);
        }
    }

    handleProcessingMove() {
        this.movementController.cleanupActiveSpaceChoice();
        this.engine.emitEvent('processingMove', { gameState: this.engine.gameState });

        if (this.engine.isClientTurn()) {
            if (this.engine.gameState.hasMovesLeft()) {
                this.movementController.processSingleMove();
            } else {
                this.engine.changePhase({ newTurnPhase: TurnPhases.END_TURN, delay: 0 });
            }
        }
    }

    handleEndTurn() {
        this.movementController.cleanupActiveSpaceChoice();
        console.log(`Ending turn for ${this.engine.turnManager.getCurrentPlayer().nickname}.`);
        this.engine.emitEvent('turnEnded', { gameState: this.engine.gameState });

        const repeatTurnRequested = this.skipRepeatController.shouldRepeatTurn(
            this.effectScheduler,
            this.engine.gameState,
            this.engine
        );

        this.uiAdapter.stopTimer();
        this.uiAdapter.deactivateRollButton();

        const allCompletedGame = this.engine.gameState.players.every(
            player => player.getState() === PlayerStates.COMPLETED_GAME
        );

        if (allCompletedGame) {
            console.log('All players completed the game. Ending the game.');
            this.engine.log('All players have completed the game.', { type: 'system' });
            this.engine.changePhase({ newGamePhase: GamePhases.GAME_ENDED, newTurnPhase: TurnPhases.CHANGE_TURN, delay: 0 });
            return;
        }

        const currentPlayer = this.engine.turnManager.getCurrentPlayer();
        if (currentPlayer) {
            this.engine.logPlayerAction(currentPlayer, 'ended their turn.', {
                type: 'turn-end',
                metadata: { remainingMoves: this.engine.gameState.remainingMoves }
            });
        }

        if (this.engine.isClientTurn()) {
            if (repeatTurnRequested) {
                console.log(`${currentPlayer.nickname} gets another turn!`);
                this.engine.changePhase({ newTurnPhase: TurnPhases.BEGIN_TURN, delay: 0 });
            } else {
                this.engine.turnManager.nextTurn();
                this.engine.changePhase({ newTurnPhase: TurnPhases.CHANGE_TURN, delay: 0 });
            }
        }

        this.engine.requestAutoSave('turnEnded', {
            turnNumber: this.engine.gameState.getTurnNumber?.(),
            currentPlayerId: currentPlayer?.playerId
        });
    }

    handleTimerEnd() {
        if (this.engine.isClientTurn()) {
            const player = this.engine.turnManager.getCurrentPlayer();
            console.log(`Time's up for ${player.nickname}! Ending turn.`);
            this.engine.emitEvent('timerEnded', { gameState: this.engine.gameState });
            if (player) {
                this.engine.logPlayerAction(player, 'ran out of time.', {
                    type: 'timer',
                    metadata: { turnTimer: this.engine.gameState.settings.turnTimer }
                });
            }

            this.uiAdapter.deactivateRollButton();
            this.engine.changePhase({ newTurnPhase: TurnPhases.END_TURN, delay: 0 });
        }
    }

    togglePauseGame() {
        if (this.engine.gameState.gamePhase === GamePhases.IN_GAME) {
            this.engine.changePhase({ newGamePhase: GamePhases.PAUSED, delay: 0 });
            this.uiAdapter.pauseTimer();
            this.uiAdapter.deactivateRollButton();
            this.engine.emitEvent('gamePaused', { gameState: this.engine.gameState });
            console.log('Game paused.');
            this.engine.log('Game paused', { type: 'system' });
        } else if (this.engine.gameState.gamePhase === GamePhases.PAUSED) {
            this.engine.changePhase({ newGamePhase: GamePhases.IN_GAME, delay: 0 });
            this.uiAdapter.resumeTimer();
            this.engine.emitEvent('gameResumed', { gameState: this.engine.gameState });
            console.log('Game resumed.');
            this.engine.log('Game resumed', { type: 'system' });
        }
    }

    describeTriggeredEvent(event, space) {
        const spaceLabel = space?.name || space?.id || 'a space';
        const action = event?.action;
        if (!action) {
            return `triggered an event on ${spaceLabel}`;
        }

        const actionType = action.type;
        switch (actionType) {
            case this.engine.actions?.PromptAllPlayersAction?.type:
            case this.engine.actions?.PromptCurrentPlayerAction?.type: {
                const message = action.payload?.message;
                if (message) {
                    return `triggered a prompt on ${spaceLabel}: "${this.truncateMessage(message)}"`;
                }
                return `triggered a prompt on ${spaceLabel}`;
            }
            case this.engine.actions?.DisplacePlayerAction?.type: {
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
            case this.engine.actions?.ApplyEffectAction?.type:
                return `triggered a player effect on ${spaceLabel}`;
            case this.engine.actions?.SetPlayerStateAction?.type: {
                const state = action.payload?.state;
                return state
                    ? `triggered a state change to ${state}`
                    : `triggered a state change`;
            }
            case this.engine.actions?.SetPlayerSpaceAction?.type: {
                const target = action.payload?.spaceId;
                return target
                    ? `triggered a teleport to ${target}`
                    : `triggered a teleport event`;
            }
            default:
                return `triggered an event (${actionType}) on ${spaceLabel}`;
        }
    }

    truncateMessage(message, limit = 60) {
        if (typeof message !== 'string') return '';
        if (message.length <= limit) return message;
        return `${message.slice(0, limit - 1)}…`;
    }
}
