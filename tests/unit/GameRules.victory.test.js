import GameRules from '../../src/js/game/rules/GameRules.js';

describe('GameRules configured victory conditions', () => {
    test('reads REACH_SPACE settings from the editor config object', () => {
        const rules = new GameRules({
            victory: {
                conditions: [{
                    type: 'REACH_SPACE',
                    config: { spaceId: '48' }
                }]
            }
        });
        const winner = { playerId: 'p1', nickname: 'Winner', currentSpaceId: 48 };

        expect(rules.checkVictoryConditions({ players: [winner] })).toMatchObject({
            type: 'REACH_SPACE',
            winner
        });
    });
});
