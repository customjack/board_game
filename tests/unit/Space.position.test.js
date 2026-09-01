import Space from '../../src/js/elements/models/Space.js';

describe('Space position normalization', () => {
    test('uses position coordinates over stale coordinates in visual data', () => {
        const space = Space.fromJSON({
            id: '1',
            name: 'One',
            type: 'normal',
            position: { x: 100, y: 200 },
            visual: { x: 400, y: 500, size: 50, color: '#ffffff' },
            connections: [],
            triggers: []
        }, null);

        expect(space.visualDetails.x).toBe(100);
        expect(space.visualDetails.y).toBe(200);
        expect(space.toJSON()).toMatchObject({
            position: { x: 100, y: 200 },
            visual: { size: 50, color: '#ffffff' }
        });
        expect(space.toJSON().visual).not.toHaveProperty('x');
        expect(space.toJSON().visual).not.toHaveProperty('y');
    });
});
