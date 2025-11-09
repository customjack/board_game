/**
 * Unit tests for GameRules
 * Tests game rules validation, player count checking, and starting positions
 */

import GameRules from '../../src/js/models/GameRules.js';
import Board from '../../src/js/models/Board.js';

describe('GameRules', () => {
    describe('Constructor', () => {
        test('should create with default values', () => {
            const rules = new GameRules();

            expect(rules.players.min).toBe(1);
            expect(rules.players.max).toBe(null);
            expect(rules.players.startingPositions.mode).toBe('single');
        });

        test('should create with custom config', () => {
            const config = {
                players: {
                    min: 2,
                    max: 8,
                    recommended: { min: 4, max: 6 },
                    startingPositions: {
                        mode: 'spread',
                        spaceIds: [1, 2, 3],
                        distribution: 'round-robin'
                    }
                }
            };

            const rules = new GameRules(config);

            expect(rules.players.min).toBe(2);
            expect(rules.players.max).toBe(8);
            expect(rules.players.recommended.min).toBe(4);
            expect(rules.players.recommended.max).toBe(6);
            expect(rules.players.startingPositions.mode).toBe('spread');
            expect(rules.players.startingPositions.spaceIds).toEqual([1, 2, 3]);
        });
    });

    describe('validatePlayerCount', () => {
        test('should validate within min/max range', () => {
            const rules = new GameRules({
                players: { min: 2, max: 8 }
            });

            const result = rules.validatePlayerCount(5);

            expect(result.valid).toBe(true);
            expect(result.status).toBe('valid');
            expect(result.messages).toHaveLength(0);
        });

        test('should reject below minimum', () => {
            const rules = new GameRules({
                players: { min: 2, max: 8 }
            });

            const result = rules.validatePlayerCount(1);

            expect(result.valid).toBe(false);
            expect(result.status).toBe('invalid');
            expect(result.messages).toContain('Requires at least 2 players');
        });

        test('should reject above maximum', () => {
            const rules = new GameRules({
                players: { min: 2, max: 8 }
            });

            const result = rules.validatePlayerCount(10);

            expect(result.valid).toBe(false);
            expect(result.status).toBe('invalid');
            expect(result.messages).toContain('Maximum 8 players allowed');
        });

        test('should warn if below recommended minimum', () => {
            const rules = new GameRules({
                players: {
                    min: 1,
                    max: 10,
                    recommended: { min: 4, max: 8 }
                }
            });

            const result = rules.validatePlayerCount(2);

            expect(result.valid).toBe(true);
            expect(result.status).toBe('warning');
            expect(result.messages.length).toBeGreaterThan(0);
            expect(result.messages[0]).toContain('Recommended: 4+ players');
        });

        test('should warn if above recommended maximum', () => {
            const rules = new GameRules({
                players: {
                    min: 1,
                    max: 10,
                    recommended: { min: 4, max: 6 }
                }
            });

            const result = rules.validatePlayerCount(9);

            expect(result.valid).toBe(true);
            expect(result.status).toBe('warning');
            expect(result.messages.some(msg => msg.includes('6 or fewer'))).toBe(true);
        });
    });

    describe('getStartingSpaceForPlayer', () => {
        let board;

        beforeEach(() => {
            // Create a simple board with numbered spaces
            const boardData = {
                metadata: { name: 'Test', author: 'Test' },
                spaces: [
                    { id: 1, name: 'Space 1', type: 'start', visualDetails: { x: 0, y: 0 }, connections: [], events: [] },
                    { id: 2, name: 'Space 2', type: 'action', visualDetails: { x: 100, y: 0 }, connections: [], events: [] },
                    { id: 3, name: 'Space 3', type: 'action', visualDetails: { x: 200, y: 0 }, connections: [], events: [] }
                ]
            };
            board = Board.fromJSON(boardData);
        });

        test('should return same space for all players in single mode', () => {
            const rules = new GameRules({
                players: {
                    startingPositions: {
                        mode: 'single',
                        spaceIds: [1]
                    }
                }
            });

            const space1 = rules.getStartingSpaceForPlayer(0, 3, board);
            const space2 = rules.getStartingSpaceForPlayer(1, 3, board);
            const space3 = rules.getStartingSpaceForPlayer(2, 3, board);

            expect(space1).toBe(1);
            expect(space2).toBe(1);
            expect(space3).toBe(1);
        });

        test('should distribute players with round-robin in spread mode', () => {
            const rules = new GameRules({
                players: {
                    startingPositions: {
                        mode: 'spread',
                        spaceIds: [1, 2, 3],
                        distribution: 'round-robin'
                    }
                }
            });

            const space1 = rules.getStartingSpaceForPlayer(0, 5, board);
            const space2 = rules.getStartingSpaceForPlayer(1, 5, board);
            const space3 = rules.getStartingSpaceForPlayer(2, 5, board);
            const space4 = rules.getStartingSpaceForPlayer(3, 5, board);

            expect(space1).toBe(1); // 0 % 3 = 0
            expect(space2).toBe(2); // 1 % 3 = 1
            expect(space3).toBe(3); // 2 % 3 = 2
            expect(space4).toBe(1); // 3 % 3 = 0 (wraps around)
        });

        test('should use sequential distribution in spread mode', () => {
            const rules = new GameRules({
                players: {
                    startingPositions: {
                        mode: 'spread',
                        spaceIds: [1, 2],
                        distribution: 'sequential'
                    }
                }
            });

            // 4 players across 2 spaces = 2 per space
            const space1 = rules.getStartingSpaceForPlayer(0, 4, board); // First half
            const space2 = rules.getStartingSpaceForPlayer(1, 4, board); // First half
            const space3 = rules.getStartingSpaceForPlayer(2, 4, board); // Second half
            const space4 = rules.getStartingSpaceForPlayer(3, 4, board); // Second half

            expect(space1).toBe(1);
            expect(space2).toBe(1);
            expect(space3).toBe(2);
            expect(space4).toBe(2);
        });

        test('should fallback to start type spaces when no spaceIds', () => {
            const rules = new GameRules({
                players: {
                    startingPositions: {
                        mode: 'single',
                        spaceIds: []
                    }
                }
            });

            const spaceId = rules.getStartingSpaceForPlayer(0, 1, board);

            expect(spaceId).toBe(1); // Should find space with type: 'start'
        });

        test('should fallback to first space if no start type found', () => {
            // Board with no 'start' type
            const boardData = {
                metadata: { name: 'Test', author: 'Test' },
                spaces: [
                    { id: 10, name: 'Space 1', type: 'action', visualDetails: { x: 0, y: 0 }, connections: [], events: [] },
                    { id: 20, name: 'Space 2', type: 'action', visualDetails: { x: 100, y: 0 }, connections: [], events: [] }
                ]
            };
            const noStartBoard = Board.fromJSON(boardData);

            const rules = new GameRules({
                players: {
                    startingPositions: {
                        mode: 'single',
                        spaceIds: []
                    }
                }
            });

            const spaceId = rules.getStartingSpaceForPlayer(0, 1, noStartBoard);

            expect(spaceId).toBe(10); // First space in array
        });
    });

    describe('toJSON and fromJSON', () => {
        test('should serialize and deserialize correctly', () => {
            const original = new GameRules({
                players: {
                    min: 2,
                    max: 8,
                    recommended: { min: 4, max: 6 },
                    startingPositions: {
                        mode: 'spread',
                        spaceIds: [1, 2, 3],
                        distribution: 'round-robin'
                    }
                },
                turns: {
                    maxTurns: 20
                }
            });

            const json = original.toJSON();
            const restored = GameRules.fromJSON(json);

            expect(restored.players.min).toBe(original.players.min);
            expect(restored.players.max).toBe(original.players.max);
            expect(restored.players.recommended.min).toBe(original.players.recommended.min);
            expect(restored.players.startingPositions.mode).toBe(original.players.startingPositions.mode);
            expect(restored.turns.maxTurns).toBe(original.turns.maxTurns);
        });
    });

    describe('getSummary', () => {
        test('should generate readable summary', () => {
            const rules = new GameRules({
                players: {
                    min: 2,
                    max: 8,
                    recommended: { min: 4, max: 6 }
                },
                turns: {
                    maxTurns: 20
                }
            });

            const summary = rules.getSummary();

            expect(summary.players).toBe('2-8 players');
            expect(summary.recommendedPlayers).toBe('4-6 recommended');
            expect(summary.turnLimit).toBe('20 turns max');
        });

        test('should handle unlimited max players', () => {
            const rules = new GameRules({
                players: {
                    min: 2,
                    max: null
                }
            });

            const summary = rules.getSummary();

            expect(summary.players).toBe('2-∞ players');
        });
    });
});
