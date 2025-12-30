import PhaseStateMachine from '../../src/js/game/engines/turn_based/components/PhaseStateMachine.js';

describe('PhaseStateMachine', () => {
  let config;
  let eventBus;
  let stateMachine;

  const createStateMachine = (overrides = {}) => {
    const mergedConfig = {
      gamePhases: ['IN_LOBBY', 'IN_GAME', 'PAUSED'],
      turnPhases: ['BEGIN_TURN', 'ROLLING', 'END_TURN'],
      ...overrides,
    };

    const machine = new PhaseStateMachine(mergedConfig, eventBus);
    machine.init('IN_LOBBY', 'BEGIN_TURN');
    return machine;
  };

  beforeEach(() => {
    eventBus = {
      emit: jest.fn(),
    };

    config = {
      gamePhases: ['IN_LOBBY', 'IN_GAME', 'PAUSED'],
      turnPhases: ['BEGIN_TURN', 'ROLLING', 'END_TURN'],
    };

    stateMachine = new PhaseStateMachine(config, eventBus);
    stateMachine.init('IN_LOBBY', 'BEGIN_TURN');
  });

  describe('initialization', () => {
    test('should set initial phases and record init transition', () => {
      expect(stateMachine.getGamePhase()).toBe('IN_LOBBY');
      expect(stateMachine.getTurnPhase()).toBe('BEGIN_TURN');

      const history = stateMachine.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        type: 'INIT',
        from: null,
        to: {
          gamePhase: 'IN_LOBBY',
          turnPhase: 'BEGIN_TURN',
        },
      });
    });

    test('should allow registration helpers to populate handlers', () => {
      const gameHandler = jest.fn();
      const turnHandler = jest.fn();

      stateMachine.registerGamePhaseHandlers({
        IN_GAME: gameHandler,
      });

      stateMachine.registerTurnPhaseHandlers({
        ROLLING: turnHandler,
      });

      expect(stateMachine.gamePhaseHandlers.get('IN_GAME')).toBe(gameHandler);
      expect(stateMachine.turnPhaseHandlers.get('ROLLING')).toBe(turnHandler);
    });
  });

  describe('game phase transitions', () => {
    test('should transition to allowed game phase and emit event', () => {
      const handler = jest.fn();
      stateMachine.registerGamePhaseHandler('IN_GAME', handler);

      const context = { reason: 'auto-start' };
      const result = stateMachine.transitionGamePhase('IN_GAME', context);

      expect(result).toBe(true);
      expect(stateMachine.getGamePhase()).toBe('IN_GAME');
      expect(eventBus.emit).toHaveBeenCalledWith('gamePhaseChanged', {
        from: 'IN_LOBBY',
        to: 'IN_GAME',
        reason: 'auto-start',
      });
      expect(handler).toHaveBeenCalledWith(context);
    });

    test('should reject transition to phase not in config', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = stateMachine.transitionGamePhase('UNKNOWN');

      expect(result).toBe(false);
      expect(stateMachine.getGamePhase()).toBe('IN_LOBBY');
      expect(eventBus.emit).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    test('should swallow handler errors but still update state', () => {
      const noisyHandler = jest.fn(() => {
        throw new Error('boom');
      });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      stateMachine.registerGamePhaseHandler('IN_GAME', noisyHandler);

      const result = stateMachine.transitionGamePhase('IN_GAME');

      expect(result).toBe(true);
      expect(stateMachine.getGamePhase()).toBe('IN_GAME');
      expect(noisyHandler).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });

  describe('turn phase transitions', () => {
    test('should transition to allowed turn phase and emit event', () => {
      const handler = jest.fn();
      stateMachine.registerTurnPhaseHandler('ROLLING', handler);

      const context = { playerId: 'abc' };
      const result = stateMachine.transitionTurnPhase('ROLLING', context);

      expect(result).toBe(true);
      expect(stateMachine.getTurnPhase()).toBe('ROLLING');
      expect(eventBus.emit).toHaveBeenCalledWith('turnPhaseChanged', {
        from: 'BEGIN_TURN',
        to: 'ROLLING',
        playerId: 'abc',
      });
      expect(handler).toHaveBeenCalledWith(context);
    });

    test('should reject transition when turn phase not allowed', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = stateMachine.transitionTurnPhase('INVALID');

      expect(result).toBe(false);
      expect(stateMachine.getTurnPhase()).toBe('BEGIN_TURN');

      warnSpy.mockRestore();
    });

    test('should allow any turn phase when none configured', () => {
      stateMachine = createStateMachine({ turnPhases: [] });
      const result = stateMachine.transitionTurnPhase('SOME_PHASE');

      expect(result).toBe(true);
      expect(stateMachine.getTurnPhase()).toBe('SOME_PHASE');
    });
  });

  describe('state helpers', () => {
    test('isInGamePhase should reflect current phase', () => {
      expect(stateMachine.isInGamePhase('IN_LOBBY')).toBe(true);
      expect(stateMachine.isInGamePhase('IN_GAME')).toBe(false);

      stateMachine.transitionGamePhase('IN_GAME');
      expect(stateMachine.isInGamePhase('IN_GAME')).toBe(true);
    });

    test('isInTurnPhase should reflect current phase', () => {
      expect(stateMachine.isInTurnPhase('BEGIN_TURN')).toBe(true);

      stateMachine.transitionTurnPhase('ROLLING');
      expect(stateMachine.isInTurnPhase('ROLLING')).toBe(true);
    });

    test('getHistory should return a defensive copy', () => {
      stateMachine.transitionGamePhase('IN_GAME');
      const history = stateMachine.getHistory();

      expect(history).toHaveLength(2);
      history.push('mutated');

      // Internal history should remain unchanged
      expect(stateMachine.getHistory()).toHaveLength(2);
    });
  });

  describe('history management', () => {
    test('should record transitions with capped history', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      for (let i = 0; i < 60; i += 1) {
        const nextPhase = i % 2 === 0 ? 'IN_GAME' : 'IN_LOBBY';
        const nextTurn = i % 2 === 0 ? 'ROLLING' : 'END_TURN';

        stateMachine.transitionGamePhase(nextPhase);
        stateMachine.transitionTurnPhase(nextTurn);
      }

      const history = stateMachine.getHistory();
      expect(history.length).toBeLessThanOrEqual(stateMachine.maxHistoryLength);
      expect(history[history.length - 1].timestamp).toBeDefined();

      warnSpy.mockRestore();
    });
  });

  describe('reset', () => {
    test('should clear phases and history', () => {
      stateMachine.transitionGamePhase('IN_GAME');
      stateMachine.transitionTurnPhase('ROLLING');

      stateMachine.reset();

      expect(stateMachine.getGamePhase()).toBeNull();
      expect(stateMachine.getTurnPhase()).toBeNull();
      expect(stateMachine.getHistory()).toHaveLength(0);
    });

    test('should not throw when eventBus missing', () => {
      const machine = new PhaseStateMachine(config, null);
      machine.init('IN_LOBBY');

      expect(() => machine.transitionGamePhase('IN_GAME')).not.toThrow();
    });
  });
});
