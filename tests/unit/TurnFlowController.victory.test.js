import TurnFlowController from '../../src/js/game/engine_types/turn_based/controllers/TurnFlowController.js';
import GamePhases from '../../src/js/game/GamePhases.js';

describe('TurnFlowController victory handling', () => {
    test('ends the game before advancing to another turn', () => {
        const winner = { playerId: 'p1', nickname: 'Winner' };
        const victory = { type: 'REACH_SPACE', winner, message: 'Winner reached the goal!' };
        const engine = {
            gameState: {
                board: { gameRules: { checkVictoryConditions: jest.fn(() => victory) } }
            },
            turnManager: { getCurrentPlayer: jest.fn(() => winner) },
            emitEvent: jest.fn(),
            log: jest.fn(),
            changePhase: jest.fn()
        };
        const uiAdapter = {
            stopTimer: jest.fn(),
            deactivateRollButton: jest.fn()
        };
        const controller = new TurnFlowController(engine, {
            movementController: { cleanupActiveSpaceChoice: jest.fn() },
            uiAdapter
        });

        controller.handleEndTurn();

        expect(engine.log).toHaveBeenCalledWith(
            'Winner reached the goal!',
            expect.objectContaining({ type: 'victory' })
        );
        expect(engine.changePhase).toHaveBeenCalledWith(expect.objectContaining({
            newGamePhase: GamePhases.GAME_ENDED,
            delay: 0
        }));
    });
});
