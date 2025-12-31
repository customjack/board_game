import TurnPhases from '../phases/TurnPhases.js';

/**
 * RollController - handles dice rolls and post-roll flow
 */
export default class RollController {
    constructor({ turnManager, movementPolicy, uiAdapter, gameState, emitEvent, logPlayerAction, changePhase }) {
        this.turnManager = turnManager;
        this.movementPolicy = movementPolicy;
        this.uiAdapter = uiAdapter;
        this.gameState = gameState;
        this.emitEvent = emitEvent;
        this.logPlayerAction = logPlayerAction;
        this.changePhase = changePhase;
    }

    rollForCurrentPlayer() {
        const currentPlayer = this.turnManager.getCurrentPlayer();
        const rollResult = this.movementPolicy.rollForPlayer(currentPlayer);

        console.log(`${currentPlayer.nickname} rolled a ${rollResult}`);
        this.logPlayerAction(currentPlayer, `rolled a ${rollResult}.`, {
            type: 'dice-roll',
            metadata: { result: rollResult }
        });

        this.uiAdapter.deactivateRollButton();
        return rollResult;
    }

    handleAfterDiceRoll(rollResult) {
        this.gameState.setRemainingMoves(rollResult);
        this.uiAdapter.updateRemainingMoves(rollResult);
        this.emitEvent('playerRoll', { gameState: this.gameState });
        this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });
    }
}
