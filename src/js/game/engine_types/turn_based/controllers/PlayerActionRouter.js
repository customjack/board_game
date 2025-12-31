import TurnPhases from '../phases/TurnPhases.js';

/**
 * PlayerActionRouter - routes player actions to engine operations
 */
export default class PlayerActionRouter {
    constructor({ turnManager, changePhase, getGameState, rollController }) {
        this.turnManager = turnManager;
        this.changePhase = changePhase;
        this.getGameState = getGameState;
        this.rollController = rollController;
    }

    async route(playerId, actionType, actionData) {
        const gameState = this.getGameState();
        const currentPlayer = this.turnManager.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.playerId !== playerId) {
            return {
                success: false,
                error: 'Not your turn'
            };
        }

        switch (actionType) {
            case 'ROLL_DICE':
                return await this.handleRollDice(actionData, gameState);
            case 'SELECT_SPACE':
                return await this.handleSelectSpace(actionData, gameState);
            case 'END_TURN':
                return await this.handleEndTurn();
            default:
                return {
                    success: false,
                    error: `Unknown action type: ${actionType}`
                };
        }
    }

    async handleRollDice(actionData, gameState) { // eslint-disable-line no-unused-vars
        if (gameState.turnPhase !== TurnPhases.WAITING_FOR_MOVE) {
            return {
                success: false,
                error: 'Cannot roll dice at this phase'
            };
        }

        const rollResult = this.rollController.rollForCurrentPlayer();
        return {
            success: true,
            data: { rollResult }
        };
    }

    async handleSelectSpace(actionData, gameState) {
        if (!actionData?.spaceId) {
            return {
                success: false,
                error: 'Space ID required'
            };
        }

        if (gameState.turnPhase !== TurnPhases.PLAYER_CHOOSING_DESTINATION) {
            return {
                success: false,
                error: 'Not in space selection phase'
            };
        }

        gameState.movePlayer(actionData.spaceId);
        this.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });

        return {
            success: true,
            data: { spaceId: actionData.spaceId }
        };
    }

    async handleEndTurn() {
        this.changePhase({ newTurnPhase: TurnPhases.END_TURN, delay: 0 });
        return { success: true };
    }
}
