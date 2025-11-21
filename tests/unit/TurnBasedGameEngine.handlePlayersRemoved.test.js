import TurnBasedGameEngine from '../../src/js/game/engines/TurnBasedGameEngine.js';
import TurnPhases from '../../src/js/game/phases/TurnPhases.js';

// Create a lightweight engine instance with mocked dependencies
function createEngine({ players }) {
    const engine = Object.create(TurnBasedGameEngine.prototype);
    engine.gameState = {
        players: [...players],
        setRemainingMoves: jest.fn()
    };
    engine.turnManager = {
        getCurrentPlayer: jest.fn(() => engine.gameState.players[0]),
        nextTurn: jest.fn()
    };
    engine.changePhase = jest.fn();
    return engine;
}

describe('TurnBasedGameEngine.handlePlayersRemoved', () => {
    test('advances turn when removed player was current', () => {
        const players = [{ playerId: 'p1' }, { playerId: 'p2' }];
        const engine = createEngine({ players });

        engine.handlePlayersRemoved([{ playerId: 'p1' }], { wasCurrent: true });

        expect(engine.gameState.setRemainingMoves).toHaveBeenCalledWith(0);
        expect(engine.turnManager.nextTurn).toHaveBeenCalledWith({ reason: 'playerRemoved' });
        expect(engine.changePhase).toHaveBeenCalledWith({ newTurnPhase: TurnPhases.BEGIN_TURN, delay: 0 });
    });

    test('does nothing when removed player was not current', () => {
        const players = [{ playerId: 'p1' }, { playerId: 'p2' }];
        const engine = createEngine({ players });

        engine.handlePlayersRemoved([{ playerId: 'p2' }], { wasCurrent: false });

        expect(engine.gameState.setRemainingMoves).not.toHaveBeenCalled();
        expect(engine.turnManager.nextTurn).not.toHaveBeenCalled();
        expect(engine.changePhase).not.toHaveBeenCalled();
    });
});
