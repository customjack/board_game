import BoardSchemaValidator from '../../src/js/utils/BoardSchemaValidator.js';

const baseGameDefinition = {
  type: 'game',
  version: '3.0.0',
  metadata: {
    name: 'Test Game',
    author: 'Tester',
    description: 'Example game definition',
    created: '2025-01-01T00:00:00Z',
    tags: ['test']
  },
  requirements: {
    minPlayers: 2,
    maxPlayers: 8,
    plugins: [{ id: 'core', version: '^1.0.0', source: 'builtin' }]
  },
  engine: {
    type: 'turn-based',
    config: {}
  },
  ui: {
    layout: 'standard-board',
    components: []
  },
  rules: {
    startingPositions: {
      mode: 'single',
      spaceIds: ['start']
    },
    recommendedPlayers: {
      min: 3,
      max: 6
    },
    winCondition: {
      type: 'reach-space',
      config: { spaceId: 'finish' }
    }
  },
  board: {
    topology: {
      spaces: [
        {
          id: 'start',
          name: 'Start',
          type: 'start',
          position: { x: 0, y: 0 },
          visual: {
            size: 50,
            color: '#ffffff',
            textColor: '#000000'
          },
          connections: [{ targetId: 'finish', draw: true }],
          triggers: []
        },
        {
          id: 'finish',
          name: 'Finish',
          type: 'finish',
          position: { x: 100, y: 0 },
          visual: {
            size: 50,
            color: '#ffcc00'
          },
          connections: [],
          triggers: []
        }
      ]
    },
    rendering: {}
  }
};

const createGameDefinition = () => JSON.parse(JSON.stringify(baseGameDefinition));

describe('BoardSchemaValidator', () => {
  describe('validate', () => {
    test('accepts a well-formed game definition', () => {
      const gameDef = createGameDefinition();
      const result = BoardSchemaValidator.validate(gameDef);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('rejects non-object input', () => {
      const result = BoardSchemaValidator.validate(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Game definition must be an object');
    });

    test('requires metadata section', () => {
      const gameDef = createGameDefinition();
      delete gameDef.metadata;
      const result = BoardSchemaValidator.validate(gameDef);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('metadata section is required');
    });

    test('validates metadata types', () => {
      const gameDef = createGameDefinition();
      gameDef.metadata.name = 42;
      gameDef.metadata.author = 10;
      gameDef.metadata.description = {};
      gameDef.metadata.created = 5;
      const result = BoardSchemaValidator.validate(gameDef);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        'metadata.name must be a string',
        'metadata.author must be a string',
        'metadata.description must be a string',
        'metadata.created must be a string (ISO 8601 format)'
      ]));
    });

    test('requires board topology spaces', () => {
      const gameDef = createGameDefinition();
      gameDef.board.topology.spaces = [];
      const result = BoardSchemaValidator.validate(gameDef);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('board.topology.spaces must contain at least one space');
    });

    test('validates spaces and visual data', () => {
      const gameDef = createGameDefinition();
      gameDef.board.topology.spaces[0].id = 123;
      delete gameDef.board.topology.spaces[0].position;
      delete gameDef.board.topology.spaces[0].visual;
      const result = BoardSchemaValidator.validate(gameDef);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        'spaces[0].id must be a string',
        'spaces[0].position is required',
        'spaces[0].visual is required'
      ]));
    });

    test('validates requirements player counts', () => {
      const gameDef = createGameDefinition();
      gameDef.requirements.minPlayers = 'two';
      gameDef.requirements.maxPlayers = 0;
      const result = BoardSchemaValidator.validate(gameDef);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        'requirements.minPlayers must be a positive number',
        'requirements.maxPlayers must be a positive number'
      ]));
    });

    test('validates rules sections', () => {
      const gameDef = createGameDefinition();
      gameDef.rules.winCondition = 'win';
      gameDef.rules.startingPositions = 'start';
      const result = BoardSchemaValidator.validate(gameDef);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        'rules.winCondition must be an object',
        'gameRules.startingPositions must be an object'
      ]));
    });
  });

  describe('validateDetailed', () => {
    test('returns summary data', () => {
      const gameDef = createGameDefinition();
      const detailed = BoardSchemaValidator.validateDetailed(gameDef);
      expect(detailed.summary.totalSpaces).toBe(2);
      expect(detailed.summary.totalConnections).toBe(1);
      expect(detailed.summary.engineType).toBe('turn-based');
    });
  });
});
