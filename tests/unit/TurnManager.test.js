import TurnManager from '../../src/js/engines/components/TurnManager.js';

describe('TurnManager', () => {
  let gameState;
  let turnManager;

  beforeEach(() => {
    // Mock GameState
    gameState = {
      players: [
        { playerId: 'p1', nickname: 'Player 1', turnsTaken: 0, getState: () => 'ACTIVE' },
        { playerId: 'p2', nickname: 'Player 2', turnsTaken: 0, getState: () => 'ACTIVE' },
        { playerId: 'p3', nickname: 'Player 3', turnsTaken: 0, getState: () => 'ACTIVE' },
      ],
      getTurnNumber: jest.fn(() => {
        const minTurns = Math.min(...gameState.players.map(p => p.turnsTaken));
        return minTurns + 1;
      }),
      getCurrentPlayer: jest.fn(() => {
        return gameState.players.reduce((min, player) =>
          player.turnsTaken < min.turnsTaken ? player : min
        );
      }),
      getPlayerByPlayerId: jest.fn((id) => {
        return gameState.players.find(p => p.playerId === id);
      }),
    };

    turnManager = new TurnManager(gameState);
  });

  describe('getCurrentPlayer', () => {
    test('should return player with fewest turns', () => {
      const currentPlayer = turnManager.getCurrentPlayer();
      expect(currentPlayer.playerId).toBe('p1');
      expect(currentPlayer.turnsTaken).toBe(0);
    });

    test('should return next player after turn increment', () => {
      gameState.players[0].turnsTaken = 1;
      const currentPlayer = turnManager.getCurrentPlayer();
      expect(currentPlayer.playerId).toBe('p2');
    });
  });

  describe('getCurrentTurnNumber', () => {
    test('should return 1 for first turn', () => {
      expect(turnManager.getCurrentTurnNumber()).toBe(1);
    });

    test('should increment after players take turns', () => {
      gameState.players[0].turnsTaken = 1;
      gameState.players[1].turnsTaken = 1;
      gameState.players[2].turnsTaken = 1;
      expect(turnManager.getCurrentTurnNumber()).toBe(2);
    });
  });

  describe('nextTurn', () => {
    test('should increment current player turns', () => {
      const player = turnManager.getCurrentPlayer();
      expect(player.turnsTaken).toBe(0);

      turnManager.nextTurn();

      expect(player.turnsTaken).toBe(1);
    });

    test('should rotate to next player', () => {
      const firstPlayer = turnManager.getCurrentPlayer();
      expect(firstPlayer.playerId).toBe('p1');

      turnManager.nextTurn();

      const secondPlayer = turnManager.getCurrentPlayer();
      expect(secondPlayer.playerId).toBe('p2');
    });

    test('should call registered callbacks', () => {
      const callback = jest.fn();
      turnManager.on('turnChanged', callback);

      turnManager.nextTurn();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          previousPlayer: expect.any(Object),
          currentPlayer: expect.any(Object),
          turnNumber: 2,
        })
      );
    });
  });

  describe('getNextPlayer', () => {
    test('should return player who will go next', () => {
      const nextPlayer = turnManager.getNextPlayer();
      expect(nextPlayer.playerId).toBe('p2');
    });

    test('should return first player after all take turns', () => {
      gameState.players[0].turnsTaken = 1;
      gameState.players[1].turnsTaken = 1;
      const nextPlayer = turnManager.getNextPlayer();
      expect(nextPlayer.playerId).toBe('p3');
    });
  });

  describe('skipTurn', () => {
    test('should skip a player turn', () => {
      const result = turnManager.skipTurn('p2', 'testing');
      expect(result).toBe(true);
      expect(gameState.players[1].turnsTaken).toBe(1);
    });

    test('should return false for invalid player', () => {
      const result = turnManager.skipTurn('invalid', 'testing');
      expect(result).toBe(false);
    });
  });

  describe('getTurnStats', () => {
    test('should return accurate statistics', () => {
      gameState.players[0].turnsTaken = 2;
      gameState.players[1].turnsTaken = 1;
      gameState.players[2].turnsTaken = 1;

      const stats = turnManager.getTurnStats();

      expect(stats.totalTurns).toBe(4);
      expect(stats.minTurns).toBe(1);
      expect(stats.maxTurns).toBe(2);
      expect(stats.averageTurns).toBeCloseTo(1.33, 2);
      expect(stats.turnNumber).toBe(2);
    });
  });

  describe('maxTurns configuration', () => {
    test('should return false when no limit', () => {
      turnManager = new TurnManager(gameState, { maxTurns: 0 });
      expect(turnManager.hasReachedMaxTurns()).toBe(false);
    });

    test('should return true when limit reached', () => {
      turnManager = new TurnManager(gameState, { maxTurns: 2 });
      gameState.players.forEach(p => p.turnsTaken = 2);
      expect(turnManager.hasReachedMaxTurns()).toBe(true);
    });
  });

  describe('isPlayerTurn', () => {
    test('should return true for current player', () => {
      expect(turnManager.isPlayerTurn('p1')).toBe(true);
      expect(turnManager.isPlayerTurn('p2')).toBe(false);
    });
  });

  describe('resetTurnOrder', () => {
    test('should reset all turn counts', () => {
      gameState.players.forEach(p => p.turnsTaken = 5);
      turnManager.resetTurnOrder(false);
      expect(gameState.players.every(p => p.turnsTaken === 0)).toBe(true);
    });

    test('should preserve turn counts when specified', () => {
      gameState.players.forEach(p => p.turnsTaken = 5);
      turnManager.resetTurnOrder(true);
      expect(gameState.players.every(p => p.turnsTaken === 5)).toBe(true);
    });
  });
});
