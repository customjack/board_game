// GameEngine.js

import GameState from '../models/GameState';
import GameEvent from '../models/GameEvent';
import TurnPhases from '../enums/TurnPhases';
import GamePhases from '../enums/GamePhases';
import PlayerStates from '../enums/PlayerStates';
import ParticleAnimation from '../animations/ParticleAnimation';
import RollButtonManager from './managers/RollButtonManager';
import TimerManager from './managers/TimerManager';
import TimerAnimation from '../animations/TimerAnimation';
import PauseButtonManager from './managers/PauseButtonManager';
import GameLogPopupController from './GameLogPopupController.js';


export default class GameEngine {
    /**
     * Constructs the GameEngine instance
     * @param {GameState} gameState - The current game state
     * @param {String} peerId - The peer ID of the current player
     * @param {Function} proposeGameState - Function to propose a new game state to the host
     * @param {EventBus} eventBus - Event bus to emit events
     * @param {RegistryManager} registryManager - The registry manager to handle various registries
     * @param {FactoryManager} factoryManager - The manager to handle effect and object creation
     * @param {Boolean} isHost - Whether this peer is the host
     */
    constructor(gameState, peerId, proposeGameState, eventBus, registryManager, factoryManager, isHost = false) {
        this.gameState = gameState;
        this.peerId = peerId;
        this.eventBus = eventBus;
        this.proposeGameState = proposeGameState;
        this.registryManager = registryManager;
        this.factoryManager = factoryManager;
        this.isHost = isHost;

        // Dynamically populated game events
        this.gameEventsWithSpaces = null;
        this.gameEVentWithSpace = null;

        // Initialize the roll button manager
        const particleAnimation = new ParticleAnimation();
        this.rollButtonManager = new RollButtonManager(particleAnimation);

        // Initialize the timer manager with the TimerAnimation and gameState
        const timerAnimation = new TimerAnimation(this.isHost);
        this.timerManager = new TimerManager(timerAnimation, this.gameState);

        this.gameLogPopupController = new GameLogPopupController(this.eventBus);

        // Bind state handlers for game phases
        this.stateHandlers = {
            [GamePhases.IN_LOBBY]: this.handleInLobby.bind(this),
            [GamePhases.IN_GAME]: this.handleInGame.bind(this),
            [GamePhases.PAUSED]: this.handlePaused.bind(this),
            [GamePhases.GAME_ENDED]: this.handleGameEnded.bind(this),
        };

        // Bind state handlers for turn phases
        this.turnPhaseHandlers = {
            [TurnPhases.CHANGE_TURN]: this.handleChangeTurn.bind(this),
            [TurnPhases.BEGIN_TURN]: this.handleBeginTurn.bind(this),
            [TurnPhases.WAITING_FOR_MOVE]: this.handleWaitingForMove.bind(this),
            [TurnPhases.PROCESSING_EVENTS]: this.handleProcessingEvents.bind(this),
            [TurnPhases.PROCESSING_EVENT]: this.handleProcessingEvent.bind(this),
            [TurnPhases.PROCESSING_MOVE]: this.handleProcessingMove.bind(this),
            [TurnPhases.PLAYER_CHOOSING_DESTINATION]: this.handlePlayerChoosingDestination.bind(this),
            [TurnPhases.END_TURN]: this.handleEndTurn.bind(this),
        };
    }


    // Initialize the GameEngine
    init() {
        const existingRollButton = document.getElementById('rollButton');
        this.rollButtonManager.init(
            existingRollButton,
            () => this.rollDiceForCurrentPlayer(),  // Perform the dice roll
            (rollResult) => this.handleAfterDiceRoll(rollResult) // After animation completes
        );

        // Initialize the timer manager
        this.timerManager.init(
            () => this.handleTimerEnd(),
            this.isHost ? () => this.togglePauseGame() : null // Pause callback only for host
        );

        this.gameLogPopupController.init();
    }

    // Main method to update the game state
    updateGameState(gameState) {
        this.gameState = gameState;

        // Update the gameState in TimerManager to ensure it has the latest settings
        this.timerManager.gameState = gameState;

        // Handle game phase
        const gamePhaseHandler = this.stateHandlers[this.gameState.gamePhase];
        if (gamePhaseHandler) {
            gamePhaseHandler();
        } else {
            console.error(`No handler for game phase: ${this.gameState.gamePhase}`);
        }
    }

    // Game phase handlers
    handleInLobby() {
        console.log('Game is in the lobby phase.');
    }

    handleInGame() {
        // Handle turn phases within the in-game phase
        const turnPhaseHandler = this.turnPhaseHandlers[this.gameState.turnPhase];
        if (turnPhaseHandler) {
            this.enactAllEffects(); // Enact all player effects before handling turn phases
            this.timerManager.resumeTimer(); //Resumes timer if paused (does nothing otherwise)
            turnPhaseHandler();
        } else {
            console.error(`No handler for turn phase: ${this.gameState.turnPhase}`);
        }
    }

    handlePaused() {
        this.timerManager.pauseTimer();
        this.rollButtonManager.deactivate();
        console.log('Game is currently paused.');
    }

    handleGameEnded() {
        console.log('Game has ended.');
    }

    handleChangeTurn() {
        this.eventBus.emit('changeTurn', { gamestate: this.gameState });
        const currentPlayer = this.gameState.getCurrentPlayer();
        console.log(`Current Player State: ${currentPlayer.getState()}, 
                    Nickname: ${currentPlayer.nickname}, 
                    Player ID: ${currentPlayer.playerId}, 
                    Effects: ${currentPlayer.effects.length}, 
                    Turns Taken: ${currentPlayer.turnsTaken}`);   
        if (this.isClientTurn()) {         
            if ( [PlayerStates.COMPLETED_GAME, PlayerStates.SKIPPING_TURN, PlayerStates.SPECTATING, PlayerStates.DISCONNECTED].includes(this.gameState.getCurrentPlayer().getState()) ) {
                // Transition to END_TURN phase with no delay
                this.changePhase({ newTurnPhase: TurnPhases.END_TURN, delay: 0 });
            } else {
                // Transition to WAITING_FOR_MOVE phase with no delay
                this.changePhase({ newTurnPhase: TurnPhases.BEGIN_TURN, delay: 0});
            }
        }
    }

    // Turn phase handlers
    handleBeginTurn() {
        this.eventBus.emit('beginTurn', { gamestate: this.gameState });

        // Resets timer for all players
        this.timerManager.startTimer();

        if (this.isClientTurn()) {
            console.log(`It's your turn, ${this.gameState.getCurrentPlayer().nickname}!`);
            // Transition to WAITING_FOR_MOVE phase with no delay
            this.changePhase({ newTurnPhase: TurnPhases.WAITING_FOR_MOVE, delay: 0});
        }
    }

    handleWaitingForMove() {
        this.eventBus.emit('waitingForMove', { gamestate: this.gameState });

        if (this.isClientTurn()) {
            this.rollButtonManager.activate();
        } else {
            console.log(`Waiting for ${this.gameState.getCurrentPlayer().nickname} to take their turn.`);
            this.rollButtonManager.deactivate();
        }
    }
    
    handleProcessingEvents() {
        // Close any open modals
        const modal = document.getElementById('gamePromptModal');
        modal.style.display = 'none'; // Hide the modal if it's open

        const currentPlayer = this.gameState.getCurrentPlayer();
        console.log(`Processing events for ${currentPlayer.nickname}'s move.`);
    
        // Get the array of events and their spaces
        this.gameEventsWithSpaces = this.gameState.determineTriggeredEvents(this.eventBus, this.peerId);
    
        // Check if there are any events to process
        if (this.gameEventsWithSpaces.length === 0) {
            // No events to process, transition to PROCESSING_MOVE phase
            this.gameState.resetEvents(); // Reset events for the next move
            if (this.isClientTurn()) {
                // Move on to PROCESSING_MOVE phase
                this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_MOVE });
            }
        } else {
            if (this.isClientTurn()) {
                // Change phase to PROCESSING_EVENT to handle the event
                this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENT, delay: 0 });
            }
        }
    }

    handleProcessingEvent() {
        const currentPlayer = this.gameState.getCurrentPlayer();
    
        // Get the array of events and their spaces
        // We have to redetermine the triggered events, because the old objects are no
        // longer part of our gamestate since we updated when changing phases. This is inefficient (who cares)
        // but I spent 2 hours debugging this shit and I want to kill myself
        this.gameEventsWithSpaces = this.gameState.determineTriggeredEvents(this.eventBus, this.peerId);
        this.gameEventWithSpace = this.gameEventsWithSpaces[0]; // Get the first event
        const { event: gameEvent, space: eventSpace } = this.gameEventWithSpace; 
        
        // Emit event triggering
        this.eventBus.emit('gameEventTriggered', { gameEvent: gameEvent, gamestate: this.gameState, eventSpace: eventSpace });

        gameEvent.executeAction(this, true);  // Apply event effects

        //The executed action MUST set the game state back to PROCESSING_EVENTS or else this is never resolved
        //Need to toss execute action some callback to update the gamestate (and send that same callback over the eventBus)
    }
    
    
    
    // New handler method for PLAYER_CHOOSING_DESTINATION
    handlePlayerChoosingDestination() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        const currentSpaceId = currentPlayer.getCurrentSpaceId();
        const currentSpace = this.gameState.board.getSpace(currentSpaceId);
    
        // Get the connections from the current space
        const connections = currentSpace.connections;
        const targetSpaces = connections.map(conn => conn.target);
        console.log(`${currentPlayer.nickname} is choosing a destination...`);
        
        console.log(`${currentPlayer.nickname} has multiple choices to move to: ${targetSpaces.map(space => space.id).join(', ')}`);
        
        // Wait for a click event to determine the destination space
        if (this.isClientTurn()) {
            this.waitForChoice(currentPlayer,targetSpaces);
        }
    }

    handleProcessingMove() {
        this.eventBus.emit('processingMove', { gamestate: this.gameState });

        if (this.isClientTurn()) {
            if (this.gameState.hasMovesLeft()) {
                this.processSingleMove();
            } else {
                // Transition to END_TURN phase
                this.changePhase({ newTurnPhase: TurnPhases.END_TURN, delay: 0});
            }
        }
    }

    handleEndTurn() {
        console.log(`Ending turn for ${this.gameState.getCurrentPlayer().nickname}.`);
        this.eventBus.emit('turnEnded', { gamestate: this.gameState });

        // Stop the timer for all players
        this.timerManager.stopTimer();

        // Check if all players are spectators
        const allCompletedGame = this.gameState.players.every(player => player.getState() === PlayerStates.COMPLETED_GAME);

        if (allCompletedGame) {
            console.log("All players are spectators. Ending the game.");
            this.changePhase({ newGamePhase: GamePhases.GAME_ENDED, newTurnPhase: TurnPhases.CHANGE_TURN, delay: 0}); //End the game

            return; // No need to proceed further
        }

        if (this.isClientTurn()) {

            // Move to the next player's turn
            this.gameState.nextPlayerTurn();
            
            // Transition to CHANGE_TURN phase
            this.changePhase({ newTurnPhase: TurnPhases.CHANGE_TURN, delay: 0});
        }
    }

    // When the timer ends
    handleTimerEnd() {
        if (this.isClientTurn()) {
            console.log(`Time's up for ${this.gameState.getCurrentPlayer().nickname}! Ending turn.`);
            this.eventBus.emit('timerEnded', { gamestate: this.gameState});

            // Deactivate the roll button
            this.rollButtonManager.deactivate();

            // Transition to END_TURN phase with no delay
            this.changePhase({ newTurnPhase: TurnPhases.END_TURN, delay: 0});
        }
    }


    //Helper methods below


    // Perform the dice roll and return the result
    rollDiceForCurrentPlayer() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        const rollResult = currentPlayer.rollDice();
        console.log(`${currentPlayer.nickname} rolled a ${rollResult}`);

        // Deactivate the roll button after rolling
        this.rollButtonManager.deactivate();

        // Return the roll result to be used by RollButtonManager
        return rollResult;
    }

    /**
     * Method to handle actions after the dice roll animation ends.
     * @param {number} rollResult - The result of the dice roll.
     */
    handleAfterDiceRoll(rollResult) {
        // Update remaining moves and transition to the next phase
        this.gameState.setRemainingMoves(rollResult);
        this.eventBus.emit('playerRoll', { gamestate: this.gameState});
        this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0}); // Transition back to PROCESSING_EVENTS phase
    }

    processSingleMove() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        const currentSpaceId = currentPlayer.getCurrentSpaceId();
        const currentSpace = this.gameState.board.getSpace(currentSpaceId); // Get the current space
    
        // Get the connections from the current space
        const connections = currentSpace.connections;
        if (connections.length === 0) {
            this.gameState.setRemainingMoves(0); //No where to move, so they have to land there
            this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0}); // Transition back to PROCESSING_EVENTS phase
        }
        else if (connections.length === 1) {
            // Move the player automatically if there's only one connection
            const targetSpace = connections[0].target;
            this.gameState.movePlayer(targetSpace.id);
            console.log(`${currentPlayer.nickname} moved to space ${targetSpace.id}`);
            this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0}); // Transition back to PROCESSING_EVENTS phase
        } else if (connections.length > 1) {
            // Set a flag indicating the player is choosing a connection
            this.changePhase({ newTurnPhase: TurnPhases.PLAYER_CHOOSING_DESTINATION, delay: 0}); // Transition back to PLAYER_CHOOSING_DESTINATION phase immediately
        }
        
    }

    // Method to wait for the player's choice for movement
    waitForChoice(currentPlayer, targetSpaces) {
        // Highlight possible target spaces
        this.gameState.board.highlightSpaces(targetSpaces);

        // Track handlers so they can be removed
        const handlers = {};

        // Helper to create a unique handler for each space
        const createClickHandler = (space) => {
            return () => {
                // Move the player to the selected space
                this.gameState.movePlayer(space.id);
                console.log(`${currentPlayer.nickname} chose to move to space ${space.id}`);
        
                // Clear highlights
                this.gameState.board.removeHighlightFromSpaces(targetSpaces);
        
                // Transition back to PROCESSING_EVENTS phase
                this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
        
                // Remove click listeners from all target spaces
                targetSpaces.forEach(targetSpace => {
                    const spaceElement = document.getElementById(`space-${targetSpace.id}`);
                    spaceElement.removeEventListener('click', handlers[targetSpace.id]);
                });
            };
        };

        // Add click listeners to target spaces
        targetSpaces.forEach(targetSpace => {
            const spaceElement = document.getElementById(`space-${targetSpace.id}`);
            const handler = createClickHandler(targetSpace);
            handlers[targetSpace.id] = handler; // Save handler reference for removal
            spaceElement.addEventListener('click', handler);
        });
    }

    

    // Toggle between play and pause
    togglePauseGame() {
        if (this.gameState.gamePhase === GamePhases.IN_GAME) {
            this.changePhase({ newGamePhase: GamePhases.PAUSED, delay: 0 }); // Set only the game phase to PAUSED with no delay
            this.timerManager.pauseTimer(); // Pause the timer
            this.rollButtonManager.deactivate();
            this.eventBus.emit('gamePaused', { gamestate: this.gameState });
            console.log('Game paused.');
        } else if (this.gameState.gamePhase === GamePhases.PAUSED) {
            this.changePhase({ newGamePhase: GamePhases.IN_GAME, delay: 0 }); // Set only the game phase to IN_GAME with no delay
            this.timerManager.resumeTimer(); // Resume the timer
            this.eventBus.emit('gameResumed', { gamestate: this.gameState });
            console.log('Game resumed.');
        }
    }

    // Wrapper to propose the game state with delay
    proposeGameStateWrapper(customDelay = -1) {
        const updateDelay = customDelay >= 0 ? customDelay : this.gameState.settings.getMoveDelay();  // Use custom delay if provided, otherwise default

        if (updateDelay > 0) {
            setTimeout(() => {
                this.proposeGameState(this.gameState);
            }, updateDelay);  // Apply the move delay or custom delay
        } else {
            this.proposeGameState(this.gameState);  // Directly call if no delay
        }
    }


    /**
     * Changes the game phase or turn phase and proposes the game state.
     * Is kinda different than the projects general code style, but makes code more clear overall
     * @param {Object} options - Options for phase changes and delay.
     * @param {GamePhases} [options.newGamePhase] - The new game phase (optional).
     * @param {TurnPhases} [options.newTurnPhase] - The new turn phase (optional).
     * @param {number} [options.delay=-1] - Custom delay for the state proposal (optional).
     */
    changePhase({ newGamePhase, newTurnPhase, delay = -1 } = {}) {
        if (newGamePhase) {
            this.gameState.setGamePhase(newGamePhase);
        }
        if (newTurnPhase) {
            this.gameState.setTurnPhase(newTurnPhase);
        }
        console.log("Changing Phase to:", this.gameState.turnPhase, this.gameState.gamePhase, delay);
        this.proposeGameStateWrapper(delay);
    }

    isClientTurn() {
        const currentPlayer = this.gameState.getCurrentPlayer();
        return currentPlayer.peerId === this.peerId
    }

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
            dismissButton.onclick = () => {
                // Close the modal for all players
                modal.style.display = 'none';
    
                // Call the callback and update the game state
                callback();           
            };
        } else {
            dismissButton.style.display = 'none'; // Hide the dismiss button if it's not the client's turn
        }
    }

    /**
     * Enacts all effects for all players.
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
