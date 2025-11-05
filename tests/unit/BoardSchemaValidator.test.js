import BoardSchemaValidator from '../../src/js/utils/BoardSchemaValidator.js';

const createBoard = (overrides = {}) => {
  const baseBoard = {
    metadata: {
      name: 'Test Board',
      author: 'Tester',
      description: 'A fun test board',
      gameEngine: {
        type: 'turn-based',
        config: {},
      },
      renderConfig: {
        connectionColor: '#000000',
        connectionThickness: 2,
        arrowColor: '#ffffff',
        arrowSize: 8,
      },
    },
    spaces: [
      {
        id: 'start',
        name: 'Start',
        visualDetails: {
          x: 0,
          y: 0,
          size: 50,
          color: '#3498db',
        },
        connections: [],
        events: [],
      },
    ],
  };

  return {
    ...baseBoard,
    ...overrides,
    metadata: {
      ...baseBoard.metadata,
      ...(overrides.metadata || {}),
    },
    spaces: overrides.spaces
      ? overrides.spaces
      : baseBoard.spaces.map((space, index) => ({
          ...space,
          ...(overrides.spaceOverrides?.[index] || {}),
        })),
  };
};

describe('BoardSchemaValidator', () => {
  describe('validate', () => {
    test('returns valid for a minimal correct board', () => {
      const board = createBoard();
      const result = BoardSchemaValidator.validate(board);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('rejects input that is not an object', () => {
      const result = BoardSchemaValidator.validate(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Board JSON must be an object');
    });

    test('requires metadata object', () => {
      const board = {
        spaces: [
          {
            id: 'start',
            name: 'Start',
            visualDetails: { x: 0, y: 0 },
          },
        ],
      };
      const result = BoardSchemaValidator.validate(board);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Metadata is required');
    });

    test('validates metadata field types', () => {
      const board = createBoard({
        metadata: {
          name: 42,
          author: 123,
          description: {},
          createdDate: 123,
          gameEngine: {
            type: 7,
            config: 'invalid',
          },
          renderConfig: {
            connectionColor: 'not-a-color',
            connectionThickness: 'heavy',
          },
        },
      });

      const result = BoardSchemaValidator.validate(board);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'metadata.name must be a string',
          'metadata.author must be a string',
          'metadata.description must be a string',
          'metadata.createdDate must be a string (ISO 8601 format)',
          'metadata.gameEngine.type must be a string',
          'metadata.gameEngine.config must be an object',
          'metadata.renderConfig.connectionColor must be a valid CSS color',
          'metadata.renderConfig.connectionThickness must be a number',
        ])
      );
    });

    test('requires spaces array with at least one entry', () => {
      const board = createBoard({ spaces: [] });
      const result = BoardSchemaValidator.validate(board);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('spaces array must contain at least one space');
    });

    test('validates space structure and uniqueness', () => {
      const board = createBoard({
        spaces: [
          {
            id: 'start',
            name: 'Start',
            visualDetails: { x: 0, y: 0, size: 'big' },
          },
          {
            id: 'start',
            name: 200,
            visualDetails: null,
          },
        ],
      });

      const result = BoardSchemaValidator.validate(board);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'spaces[0].visualDetails.size must be a number',
          'spaces[1].name must be a string',
          'spaces[1].visualDetails is required',
          'Duplicate space ID: start',
        ])
      );
    });

    test('validates visual detail requirements', () => {
      const board = createBoard({
        spaces: [
          {
            id: 'detail',
            name: 'Needs details',
            visualDetails: {
              y: '0',
              color: '#XYZ',
              borderColor: '#123456',
              borderWidth: 'thick',
            },
          },
        ],
      });

      const result = BoardSchemaValidator.validate(board);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'spaces[0].visualDetails.x is required',
          'spaces[0].visualDetails.y must be a number',
          'spaces[0].visualDetails.color must be a valid CSS color',
          'spaces[0].visualDetails.borderWidth must be a number',
        ])
      );
    });

    test('validates connections and references', () => {
      const board = createBoard({
        spaces: [
          {
            id: 'A',
            name: 'A',
            visualDetails: { x: 0, y: 0 },
            connections: [
              {},
              { targetId: 'missing', bidirectional: 'sometimes' },
            ],
          },
        ],
      });

      const result = BoardSchemaValidator.validate(board);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'spaces[0].connections[0].targetId is required',
          'spaces[0].connections[1].bidirectional must be a boolean',
          'spaces[0].connections[1].targetId "missing" does not reference an existing space',
        ])
      );
    });

    test('validates event definitions', () => {
      const board = createBoard({
        spaces: [
          {
            id: 'A',
            name: 'A',
            visualDetails: { x: 0, y: 0 },
            events: [
              null,
              {
                trigger: { type: 7 },
                action: { type: 'PROMPT', payload: 'message' },
                priority: 'INVALID',
              },
              {
                trigger: {},
                action: {},
              },
            ],
          },
        ],
      });

      const result = BoardSchemaValidator.validate(board);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'spaces[0].events[0] must be an object',
          'spaces[0].events[1].trigger.type must be a string',
          'spaces[0].events[1].action.payload must be an object',
          'spaces[0].events[1].priority must be one of: LOW, MID, HIGH, CRITICAL',
          'spaces[0].events[2].trigger.type is required',
          'spaces[0].events[2].action.type is required',
        ])
      );
    });
  });

  describe('isValidColor', () => {
    test('accepts supported color formats', () => {
      expect(BoardSchemaValidator.isValidColor('#123456')).toBe(true);
      expect(BoardSchemaValidator.isValidColor('#123')).toBe(true);
      expect(BoardSchemaValidator.isValidColor('#12345678')).toBe(true);
      expect(BoardSchemaValidator.isValidColor('rgb(0, 0, 0)')).toBe(true);
      expect(BoardSchemaValidator.isValidColor('rgba(0, 0, 0, 0.5)')).toBe(true);
      expect(BoardSchemaValidator.isValidColor('transparent')).toBe(true);
    });

    test('rejects clearly invalid colors', () => {
      expect(BoardSchemaValidator.isValidColor('not-a-color')).toBe(false);
      expect(BoardSchemaValidator.isValidColor('#GGGGGG')).toBe(false);
      expect(BoardSchemaValidator.isValidColor(123)).toBe(false);
    });
  });

  describe('validateDetailed', () => {
    test('provides summary statistics based on board content', () => {
      const board = createBoard({
        spaces: [
          {
            id: 'start',
            name: 'Start',
            visualDetails: { x: 0, y: 0 },
            connections: [{ targetId: 'end' }],
            events: [{ trigger: { type: 'ON_ENTER' }, action: { type: 'NOTIFY' } }],
          },
          {
            id: 'end',
            name: 'End',
            visualDetails: { x: 1, y: 1 },
            connections: [],
            events: [],
          },
        ],
      });

      const detailed = BoardSchemaValidator.validateDetailed(board);

      expect(detailed.valid).toBe(true);
      expect(detailed.summary).toEqual({
        totalSpaces: 2,
        totalConnections: 1,
        totalEvents: 1,
        engineType: 'turn-based',
        hasCustomRenderConfig: true,
      });
    });
  });
});
