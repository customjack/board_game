import SchemaValidator from '../SchemaValidator';
import ActionTypes from '../../enums/ActionTypes';

describe('SchemaValidator', () => {
    describe('validateField', () => {
        test('validates required fields', () => {
            const schema = { type: 'string', required: true };
            const errors = SchemaValidator.validateField(null, schema, 'testField');
            expect(errors).toContain('testField is required');
        });

        test('allows optional fields to be missing', () => {
            const schema = { type: 'string', required: false };
            const errors = SchemaValidator.validateField(undefined, schema, 'testField');
            expect(errors).toHaveLength(0);
        });

        test('validates string type', () => {
            const schema = { type: 'string', required: true };
            const errors = SchemaValidator.validateField(123, schema, 'testField');
            expect(errors).toContain('testField must be of type string, got number');
        });

        test('validates number type', () => {
            const schema = { type: 'number', required: true };
            const errors = SchemaValidator.validateField('abc', schema, 'testField');
            expect(errors).toContain('testField must be of type number, got string');
        });

        test('validates boolean type', () => {
            const schema = { type: 'boolean', required: true };
            const errors = SchemaValidator.validateField('true', schema, 'testField');
            expect(errors).toContain('testField must be of type boolean, got string');
        });

        test('validates array type', () => {
            const schema = { type: 'array', required: true };
            const errors = SchemaValidator.validateField({}, schema, 'testField');
            expect(errors).toContain('testField must be of type array, got object');
        });

        test('validates string minLength', () => {
            const schema = { type: 'string', minLength: 5 };
            const errors = SchemaValidator.validateField('abc', schema, 'testField');
            expect(errors).toContain('testField must be at least 5 characters long');
        });

        test('validates string maxLength', () => {
            const schema = { type: 'string', maxLength: 5 };
            const errors = SchemaValidator.validateField('abcdefgh', schema, 'testField');
            expect(errors).toContain('testField must be at most 5 characters long');
        });

        test('validates string enum', () => {
            const schema = { type: 'string', enum: ['red', 'green', 'blue'] };
            const errors = SchemaValidator.validateField('yellow', schema, 'testField');
            expect(errors).toContain('testField must be one of: red, green, blue');
        });

        test('validates number minimum', () => {
            const schema = { type: 'number', min: 0 };
            const errors = SchemaValidator.validateField(-5, schema, 'testField');
            expect(errors).toContain('testField must be at least 0');
        });

        test('validates number maximum', () => {
            const schema = { type: 'number', max: 100 };
            const errors = SchemaValidator.validateField(150, schema, 'testField');
            expect(errors).toContain('testField must be at most 100');
        });

        test('validates integer constraint', () => {
            const schema = { type: 'number', integer: true };
            const errors = SchemaValidator.validateField(3.14, schema, 'testField');
            expect(errors).toContain('testField must be an integer');
        });

        test('validates array minItems', () => {
            const schema = { type: 'array', minItems: 2 };
            const errors = SchemaValidator.validateField([1], schema, 'testField');
            expect(errors).toContain('testField must have at least 2 items');
        });

        test('validates array maxItems', () => {
            const schema = { type: 'array', maxItems: 3 };
            const errors = SchemaValidator.validateField([1, 2, 3, 4], schema, 'testField');
            expect(errors).toContain('testField must have at most 3 items');
        });

        test('validates array items', () => {
            const schema = {
                type: 'array',
                items: { type: 'number', min: 0 }
            };
            const errors = SchemaValidator.validateField([1, -5, 3], schema, 'testField');
            expect(errors).toContain('testField[1] must be at least 0');
        });

        test('validates nested object properties', () => {
            const schema = {
                type: 'object',
                properties: {
                    name: { type: 'string', required: true },
                    age: { type: 'number', min: 0 }
                }
            };
            const errors = SchemaValidator.validateField({ age: -5 }, schema, 'testField');
            expect(errors).toContain('testField.name is required');
            expect(errors).toContain('testField.age must be at least 0');
        });
    });

    describe('validatePayload', () => {
        test('validates complete payload', () => {
            const payloadSchema = {
                message: { type: 'string', required: true },
                duration: { type: 'number', min: 1, max: 10 }
            };
            const payload = { message: 'Test', duration: 5 };
            const result = SchemaValidator.validatePayload(payload, payloadSchema);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('validates payload with missing required field', () => {
            const payloadSchema = {
                message: { type: 'string', required: true },
                duration: { type: 'number' }
            };
            const payload = { duration: 5 };
            const result = SchemaValidator.validatePayload(payload, payloadSchema);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('message is required');
        });

        test('validates payload with invalid type', () => {
            const payloadSchema = {
                message: { type: 'string', required: true },
                duration: { type: 'number' }
            };
            const payload = { message: 123, duration: '5' };
            const result = SchemaValidator.validatePayload(payload, payloadSchema);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('message must be of type string, got number');
            expect(result.errors).toContain('duration must be of type number, got string');
        });

        test('detects unknown fields in strict mode', () => {
            const payloadSchema = {
                message: { type: 'string', required: true },
                _strict: true
            };
            const payload = { message: 'Test', unknownField: 'value' };
            const result = SchemaValidator.validatePayload(payload, payloadSchema);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Unknown fields: unknownField');
        });

        test('allows unknown fields in non-strict mode', () => {
            const payloadSchema = {
                message: { type: 'string', required: true }
            };
            const payload = { message: 'Test', unknownField: 'value' };
            const result = SchemaValidator.validatePayload(payload, payloadSchema);
            expect(result.valid).toBe(true);
        });

        test('handles null payload gracefully', () => {
            const payloadSchema = {
                message: { type: 'string', required: false }
            };
            const result = SchemaValidator.validatePayload(null, payloadSchema);
            expect(result.valid).toBe(true);
        });

        test('handles undefined schema gracefully', () => {
            const payload = { message: 'Test' };
            const result = SchemaValidator.validatePayload(payload, undefined);
            expect(result.valid).toBe(true);
        });
    });

    describe('validateSpace', () => {
        test('validates complete space', () => {
            const space = {
                id: 'space_1',
                x: 100,
                y: 200,
                label: 'Test Space',
                color: '#FF0000',
                actions: [{ type: ActionTypes.PROMPT_ALL_PLAYERS, payload: { message: 'Test' } }],
                effects: []
            };
            const result = SchemaValidator.validateSpace(space);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('validates space with missing required fields', () => {
            const space = { label: 'Test' };
            const result = SchemaValidator.validateSpace(space);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Space must have a valid id (string)');
            expect(result.errors).toContain('Space must have a valid x coordinate (number)');
            expect(result.errors).toContain('Space must have a valid y coordinate (number)');
        });

        test('warns about missing optional fields', () => {
            const space = { id: 'space_1', x: 100, y: 200 };
            const result = SchemaValidator.validateSpace(space);
            expect(result.valid).toBe(true);
            expect(result.warnings).toContain('Space is missing a label (recommended for better UX)');
            expect(result.warnings).toContain('Space is missing a color (will use default)');
        });

        test('validates actions array', () => {
            const space = {
                id: 'space_1',
                x: 100,
                y: 200,
                actions: 'not an array'
            };
            const result = SchemaValidator.validateSpace(space);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Space.actions must be an array');
        });

        test('validates action objects in array', () => {
            const space = {
                id: 'space_1',
                x: 100,
                y: 200,
                actions: [{}, { type: ActionTypes.PROMPT_ALL_PLAYERS }]
            };
            const result = SchemaValidator.validateSpace(space);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Space action at index 0 is missing type');
        });

        test('handles null space', () => {
            const result = SchemaValidator.validateSpace(null);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Space is null or undefined');
        });
    });

    describe('validateBoard', () => {
        test('validates complete board', () => {
            const board = {
                name: 'Test Board',
                description: 'A test board',
                gameRules: {
                    minPlayers: 2,
                    maxPlayers: 6
                },
                spaces: [
                    { id: 'space_1', x: 100, y: 200, label: 'Start', color: '#00FF00' },
                    { id: 'space_2', x: 200, y: 200, label: 'End', color: '#FF0000' }
                ]
            };
            const result = SchemaValidator.validateBoard(board);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('validates board with missing required fields', () => {
            const board = { description: 'Test' };
            const result = SchemaValidator.validateBoard(board);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Board must have a valid name (string)');
            expect(result.errors).toContain('Board must have a spaces array');
        });

        test('validates board with empty spaces array', () => {
            const board = {
                name: 'Test Board',
                spaces: []
            };
            const result = SchemaValidator.validateBoard(board);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Board must have at least one space');
        });

        test('validates individual spaces in board', () => {
            const board = {
                name: 'Test Board',
                spaces: [
                    { id: 'space_1', x: 100, y: 200 },
                    { x: 200, y: 200 } // Missing id
                ]
            };
            const result = SchemaValidator.validateBoard(board);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Space must have a valid id'))).toBe(true);
        });

        test('detects duplicate space IDs', () => {
            const board = {
                name: 'Test Board',
                spaces: [
                    { id: 'space_1', x: 100, y: 200 },
                    { id: 'space_1', x: 200, y: 200 } // Duplicate ID
                ]
            };
            const result = SchemaValidator.validateBoard(board);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Duplicate space IDs found: space_1');
        });

        test('validates gameRules', () => {
            const board = {
                name: 'Test Board',
                spaces: [{ id: 'space_1', x: 100, y: 200 }],
                gameRules: {
                    minPlayers: -1,
                    maxPlayers: 0
                }
            };
            const result = SchemaValidator.validateBoard(board);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('gameRules.minPlayers must be a number >= 1');
            expect(result.errors).toContain('gameRules.maxPlayers must be a number >= 1');
        });

        test('validates minPlayers <= maxPlayers', () => {
            const board = {
                name: 'Test Board',
                spaces: [{ id: 'space_1', x: 100, y: 200 }],
                gameRules: {
                    minPlayers: 6,
                    maxPlayers: 2
                }
            };
            const result = SchemaValidator.validateBoard(board);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('gameRules.minPlayers cannot be greater than maxPlayers');
        });

        test('warns about missing optional fields', () => {
            const board = {
                name: 'Test Board',
                spaces: [{ id: 'space_1', x: 100, y: 200 }]
            };
            const result = SchemaValidator.validateBoard(board);
            expect(result.valid).toBe(true);
            expect(result.warnings).toContain('Board is missing a description (recommended for better UX)');
            expect(result.warnings).toContain('Board is missing gameRules (recommended for better game setup)');
        });

        test('handles null board', () => {
            const result = SchemaValidator.validateBoard(null);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Board is null or undefined');
        });
    });
});
