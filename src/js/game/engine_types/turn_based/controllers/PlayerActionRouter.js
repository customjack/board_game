import TurnPhases from '../phases/TurnPhases.js';

/**
 * PlayerActionRouter - routes player actions to engine operations
 */
export default class PlayerActionRouter {
    constructor(engine) {
        this.engine = engine;
    }

    async route(playerId, actionType, actionData) {
        const currentPlayer = this.engine.gameState.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.playerId !== playerId) {
            return {
                success: false,
                error: 'Not your turn'
            };
        }

        switch (actionType) {
            case 'ROLL_DICE':
                return await this.handleRollDice(actionData);
            case 'SELECT_SPACE':
                return await this.handleSelectSpace(actionData);
            case 'END_TURN':
                return await this.handleEndTurn();
            default:
                return {
                    success: false,
                    error: `Unknown action type: ${actionType}`
                };
        }
    }

    async handleRollDice(actionData) { // eslint-disable-line no-unused-vars
        if (this.engine.gameState.turnPhase !== TurnPhases.WAITING_FOR_MOVE) {
            return {
                success: false,
                error: 'Cannot roll dice at this phase'
            };
        }

        const rollResult = this.engine.rollDiceForCurrentPlayer();
        return {
            success: true,
            data: { rollResult }
        };
    }

    async handleSelectSpace(actionData) {
        if (!actionData?.spaceId) {
            return {
                success: false,
                error: 'Space ID required'
            };
        }

        if (this.engine.gameState.turnPhase !== TurnPhases.PLAYER_CHOOSING_DESTINATION) {
            return {
                success: false,
                error: 'Not in space selection phase'
            };
        }

        this.engine.gameState.movePlayer(actionData.spaceId);
        this.engine.changePhase({ newTurnPhase: TurnPhases.PROCESSING_EVENTS, delay: 0 });

        return {
            success: true,
            data: { spaceId: actionData.spaceId }
        };
    }

    async handleEndTurn() {
        this.engine.changePhase({ newTurnPhase: TurnPhases.END_TURN, delay: 0 });
        return { success: true };
    }
}
