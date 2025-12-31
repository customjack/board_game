import { getVisibleElementById } from '../../../../infrastructure/utils/helpers.js';
import TurnPhases from '../phases/TurnPhases.js';

/**
 * MovementController - handles movement sequencing and selection
 */
export default class MovementController {
    constructor(engine) {
        this.engine = engine;
        this.activeSpaceChoice = null;
    }

    processSingleMove() {
        const currentPlayer = this.engine.turnManager.getCurrentPlayer();
        const currentSpaceId = currentPlayer.getCurrentSpaceId();
        const currentSpace = this.engine.gameState.board.getSpace(currentSpaceId);

        if (!currentSpace) {
            console.warn(`Player ${currentPlayer.nickname} is on unknown space ${currentSpaceId}. Resetting remaining moves.`);
            this.engine.gameState.setRemainingMoves(0);
            this.engine.updateRemainingMoves(0);
            this.engine.changePhase({ newTurnPhase: TurnPhases.END_TURN, delay: 0 });
            return;
        }

        const connections = currentSpace.connections;

        if (connections.length === 0) {
            this.engine.gameState.setRemainingMoves(0);
            this.engine.updateRemainingMoves(0);
            this.engine.logPlayerAction(currentPlayer, 'cannot move from their current space.', {
                type: 'movement',
                metadata: { spaceId: currentSpaceId, reason: 'no-connections' }
            });
            this.engine.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
        } else if (connections.length === 1) {
            const targetSpace = connections[0].target;
            this.engine.gameState.movePlayer(targetSpace.id);
            console.log(`${currentPlayer.nickname} moved to space ${targetSpace.id}`);
            this.engine.logPlayerAction(currentPlayer, `moved to ${targetSpace.name || targetSpace.id}.`, {
                type: 'movement',
                metadata: { spaceId: targetSpace.id }
            });
            this.engine.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
        } else {
            this.engine.changePhase({ newTurnPhase: TurnPhases.PLAYER_CHOOSING_DESTINATION, delay: 0 });
        }
    }

    waitForChoice(currentPlayer, targetSpaces) {
        if (this.engine.uiController) {
            this.engine.uiController.highlightSpaces(targetSpaces);
            this.engine.uiController.setupSpaceClickHandlers(targetSpaces, (selectedSpace) => {
                this.engine.gameState.movePlayer(selectedSpace.id);
                console.log(`${currentPlayer.nickname} chose to move to space ${selectedSpace.id}`);
                this.engine.logPlayerAction(currentPlayer, `moved to ${selectedSpace.name || selectedSpace.id}.`, {
                    type: 'movement',
                    metadata: { spaceId: selectedSpace.id, selected: true }
                });
                this.engine.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
            });
            return;
        }

        const boardInteraction = this.engine.getUIComponent('boardInteraction');
        if (boardInteraction && boardInteraction.setupSpaceSelection) {
            boardInteraction.setupSpaceSelection(targetSpaces, (selectedSpace) => {
                this.engine.gameState.movePlayer(selectedSpace.id);
                console.log(`${currentPlayer.nickname} chose to move to space ${selectedSpace.id}`);
                this.engine.logPlayerAction(currentPlayer, `moved to ${selectedSpace.name || selectedSpace.id}.`, {
                    type: 'movement',
                    metadata: { spaceId: selectedSpace.id, selected: true }
                });
                this.engine.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
            });
            return;
        }

        const hasUI = this.engine.uiSystem || !this.engine.isHeadless();

        if (hasUI) {
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
                    this.engine.gameState.movePlayer(space.id);
                    console.log(`${currentPlayer.nickname} chose to move to space ${space.id}`);
                    this.engine.logPlayerAction(currentPlayer, `moved to ${space.name || space.id}.`, {
                        type: 'movement',
                        metadata: { spaceId: space.id, selected: true }
                    });
                    this.engine.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
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

        console.log('[Headless] Auto-selecting first space');
        if (targetSpaces.length > 0) {
            const selectedSpace = targetSpaces[0];
            this.engine.gameState.movePlayer(selectedSpace.id);
            this.engine.logPlayerAction(currentPlayer, `moved to ${selectedSpace.name || selectedSpace.id}.`, {
                type: 'movement',
                metadata: { spaceId: selectedSpace.id, selected: true, autoSelected: true }
            });
            this.engine.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
        }
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
}
