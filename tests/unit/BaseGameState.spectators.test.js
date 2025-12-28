import BaseGameState from '../../src/js/game/state/BaseGameState.js';
import Board from '../../src/js/elements/models/Board.js';
import GameRules from '../../src/js/game/rules/GameRules.js';

const createGameState = () => {
    const board = new Board([], { name: 'Test Board' }, new GameRules());
    return new BaseGameState({ board, factoryManager: {} });
};

describe('BaseGameState spectators', () => {
    test('adds and removes spectators', () => {
        const gameState = createGameState();

        expect(gameState.getSpectators()).toHaveLength(0);

        gameState.addSpectator('peer-1');
        expect(gameState.isSpectator('peer-1')).toBe(true);
        expect(gameState.getSpectators()).toHaveLength(1);

        const removed = gameState.removeSpectator('peer-1');
        expect(removed).toBe(true);
        expect(gameState.isSpectator('peer-1')).toBe(false);
    });

    test('tracks unclaimed peer slots', () => {
        const gameState = createGameState();

        gameState.setUnclaimedPeerIds(['peer-a', 'peer-b']);
        expect(gameState.unclaimedPeerIds).toEqual(['peer-a', 'peer-b']);
    });
});
