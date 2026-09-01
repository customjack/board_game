import MapStorageManager from '../../src/js/systems/storage/MapStorageManager.js';

describe('MapStorageManager built-in maps', () => {
    const originalDebugFlag = process.env.ENABLE_DEBUG_BOARD;

    afterEach(() => {
        if (originalDebugFlag === undefined) {
            delete process.env.ENABLE_DEBUG_BOARD;
        } else {
            process.env.ENABLE_DEBUG_BOARD = originalDebugFlag;
        }
    });

    test('uses Eels and Escalators as default and hides the debug board', () => {
        delete process.env.ENABLE_DEBUG_BOARD;
        const maps = MapStorageManager.getBuiltInMaps();

        expect(maps).toEqual(expect.arrayContaining([
            expect.objectContaining({
                id: 'default',
                name: 'Eels and Escalators',
                path: 'assets/maps/eels-and-escalators.zip',
                isBuiltIn: true
            }),
            expect.objectContaining({
                id: 'drinking-board-game',
                path: 'assets/maps/drinking-board-game.zip',
                isBuiltIn: true
            })
        ]));
        expect(maps.some((map) => map.id === 'debug-board')).toBe(false);
    });

    test('shows the debug board only when its environment flag is enabled', () => {
        process.env.ENABLE_DEBUG_BOARD = 'true';

        expect(MapStorageManager.getBuiltInMaps()).toEqual(expect.arrayContaining([
            expect.objectContaining({
                id: 'debug-board',
                name: 'Debug Board',
                path: 'assets/maps/debug-board.zip'
            })
        ]));
    });
});
