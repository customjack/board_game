import GameEngineFactory from '../../src/js/engines/GameEngineFactory.js';
import TurnBasedGameEngine from '../../src/js/engines/TurnBasedGameEngine.js';

jest.mock('../../src/js/engines/TurnBasedGameEngine.js');

describe('GameEngineFactory', () => {
  let dependencies;
  let logSpy;
  let warnSpy;

  const createDependencies = () => ({
    gameState: {
      board: {
        metadata: {
          gameEngine: {
            type: 'turn-based',
            config: { turnLength: 30 },
          },
        },
      },
    },
    peerId: 'peer-123',
    proposeGameState: jest.fn(),
    eventBus: { emit: jest.fn(), on: jest.fn() },
    registryManager: {},
    factoryManager: {},
    isHost: true,
    rollButtonManager: {},
    timerManager: {},
  });

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    GameEngineFactory.engineRegistry = new Map();
    GameEngineFactory.register('turn-based', TurnBasedGameEngine);

    dependencies = createDependencies();
    TurnBasedGameEngine.mockImplementation(() => ({ engineType: 'turn-based' }));
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  describe('create', () => {
    test('creates default turn-based engine when no config provided', () => {
      const engine = GameEngineFactory.create(dependencies);

      expect(TurnBasedGameEngine).toHaveBeenCalledWith(dependencies, {});
      expect(engine).toEqual({ engineType: 'turn-based' });
    });

    test('passes explicit engine config to constructor', () => {
      const engineConfig = { difficulty: 'hard' };
      GameEngineFactory.create(dependencies, { type: 'turn-based', engineConfig });

      expect(TurnBasedGameEngine).toHaveBeenCalledWith(dependencies, engineConfig);
    });

    test('resolves engine type from board metadata when config omitted', () => {
      const CustomEngine = jest.fn(() => ({ engineType: 'custom' }));
      GameEngineFactory.register('custom', CustomEngine);

      dependencies.gameState.board.metadata.gameEngine.type = 'custom';
      const engine = GameEngineFactory.create(dependencies);

      expect(CustomEngine).toHaveBeenCalledWith(dependencies, {});
      expect(engine).toEqual({ engineType: 'custom' });
    });

    test('falls back to turn-based when requested type not registered', () => {
      const engine = GameEngineFactory.create(dependencies, {
        type: 'unknown',
        engineConfig: { some: 'config' },
      });

      expect(warnSpy).toHaveBeenCalledWith(
        "Engine type 'unknown' not found, falling back to 'turn-based'"
      );
      expect(TurnBasedGameEngine).toHaveBeenCalledWith(dependencies, { some: 'config' });
      expect(engine).toEqual({ engineType: 'turn-based' });
    });

    test('throws when fallback engine is missing', () => {
      GameEngineFactory.engineRegistry = new Map(); // remove default registration

      expect(() => GameEngineFactory.create(dependencies, { type: 'unknown' })).toThrow(
        'Default turn-based engine not registered'
      );
    });
  });

  describe('dependency validation', () => {
    test('requires all core dependencies', () => {
      const required = [
        'gameState',
        'peerId',
        'proposeGameState',
        'eventBus',
        'registryManager',
        'factoryManager',
      ];

      for (const key of required) {
        const invalid = { ...dependencies };
        delete invalid[key];

        expect(() => GameEngineFactory.create(invalid)).toThrow(
          new RegExp(`Missing required dependency: ${key}`)
        );
      }
    });

    test('requires isHost flag even if false', () => {
      const invalid = { ...dependencies, isHost: undefined };

      expect(() => GameEngineFactory.create(invalid)).toThrow(
        'Missing required dependency: isHost'
      );
    });
  });

  describe('registry management', () => {
    test('registers, enumerates, and unregisters custom engines', () => {
      class CustomEngine {}

      expect(GameEngineFactory.isRegistered('custom')).toBe(false);

      GameEngineFactory.register('custom', CustomEngine);
      expect(GameEngineFactory.isRegistered('custom')).toBe(true);

      expect(GameEngineFactory.getRegisteredTypes()).toEqual(
        expect.arrayContaining(['turn-based', 'custom'])
      );

      const list = GameEngineFactory.listEngines();
      expect(list).toContainEqual({
        type: 'custom',
        className: 'CustomEngine',
        isRegistered: true,
      });

      expect(GameEngineFactory.unregister('custom')).toBe(true);
      expect(GameEngineFactory.isRegistered('custom')).toBe(false);
    });

    test('gracefully fails to unregister unknown type', () => {
      expect(GameEngineFactory.unregister('missing')).toBe(false);
    });
  });

  describe('configuration helpers', () => {
    test('determineEngineType prioritizes explicit config', () => {
      const type = GameEngineFactory.determineEngineType(dependencies, {
        type: 'explicit',
      });
      expect(type).toBe('explicit');
    });

    test('determineEngineType uses metadata when config absent', () => {
      const type = GameEngineFactory.determineEngineType(dependencies, {});
      expect(type).toBe('turn-based');
    });

    test('determineEngineType defaults to turn-based when metadata missing', () => {
      const deps = { ...dependencies, gameState: {} };
      const type = GameEngineFactory.determineEngineType(deps, {});
      expect(type).toBe('turn-based');
    });

    test('extractEngineConfig pulls config from metadata', () => {
      const config = GameEngineFactory.extractEngineConfig(dependencies.gameState);
      expect(config).toEqual({ turnLength: 30 });
    });

    test('createFromBoardMetadata uses metadata config and type', () => {
      const CustomEngine = jest.fn(() => ({ engineType: 'custom' }));
      GameEngineFactory.register('custom', CustomEngine);

      dependencies.gameState.board.metadata.gameEngine = {
        type: 'custom',
        config: { special: true },
      };

      const engine = GameEngineFactory.createFromBoardMetadata(dependencies);

      expect(CustomEngine).toHaveBeenCalledWith(dependencies, { special: true });
      expect(engine).toEqual({ engineType: 'custom' });
    });
  });
});
