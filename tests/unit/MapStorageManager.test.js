/**
 * Unit tests for MapStorageManager
 */

import MapStorageManager from '../../src/js/managers/MapStorageManager.js';
import BoardSchemaValidator from '../../src/js/utils/BoardSchemaValidator.js';

describe('MapStorageManager', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        jest.clearAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('Built-in Maps', () => {
        test('should return array of built-in maps', () => {
            const maps = MapStorageManager.getBuiltInMaps();

            expect(Array.isArray(maps)).toBe(true);
            expect(maps.length).toBeGreaterThan(0);
        });

        test('should have required properties for built-in maps', () => {
            const maps = MapStorageManager.getBuiltInMaps();

            maps.forEach(map => {
                expect(map).toHaveProperty('id');
                expect(map).toHaveProperty('name');
                expect(map).toHaveProperty('author');
                expect(map).toHaveProperty('description');
                expect(map).toHaveProperty('isBuiltIn');
                expect(map).toHaveProperty('path');
                expect(map.isBuiltIn).toBe(true);
            });
        });

        test('should include default map', () => {
            const maps = MapStorageManager.getBuiltInMaps();
            const defaultMap = maps.find(m => m.id === 'default');

            expect(defaultMap).toBeDefined();
            expect(defaultMap.name).toBe('Default Board');
        });

        test('should include test maps', () => {
            const maps = MapStorageManager.getBuiltInMaps();
            const circularMap = maps.find(m => m.id === 'circular-party');
            const miniMap = maps.find(m => m.id === 'mini-test');

            expect(circularMap).toBeDefined();
            expect(miniMap).toBeDefined();
        });
    });

    describe('Custom Maps', () => {
        test('should return empty array when no custom maps exist', () => {
            const customMaps = MapStorageManager.getCustomMaps();

            expect(Array.isArray(customMaps)).toBe(true);
            expect(customMaps.length).toBe(0);
        });

        test('should add custom map to localStorage', () => {
            const mockMapData = {
                metadata: {
                    name: 'Custom Test Map',
                    author: 'Test Author',
                    description: 'A test map'
                },
                spaces: [
                    {
                        id: 'start',
                        name: 'Start',
                        visualDetails: { x: 100, y: 100, size: 50 },
                        connections: [],
                        events: []
                    }
                ]
            };

            jest.spyOn(BoardSchemaValidator, 'validate').mockReturnValue({
                valid: true,
                errors: []
            });

            const mapObject = MapStorageManager.addCustomMap(mockMapData);

            expect(mapObject).toBeDefined();
            expect(mapObject.id).toMatch(/^custom-/);
            expect(mapObject.name).toBe('Custom Test Map');
            expect(mapObject.author).toBe('Test Author');
            expect(mapObject.isBuiltIn).toBe(false);
            expect(mapObject.boardData).toEqual(mockMapData);
        });

        test('should throw error when adding invalid map', () => {
            const invalidMapData = {
                metadata: {},
                spaces: [] // Invalid: no spaces
            };

            jest.spyOn(BoardSchemaValidator, 'validate').mockReturnValue({
                valid: false,
                errors: ['spaces array must contain at least one space']
            });

            expect(() => {
                MapStorageManager.addCustomMap(invalidMapData);
            }).toThrow('Invalid map data');
        });

        test('should retrieve custom map after adding', () => {
            const mockMapData = {
                metadata: {
                    name: 'Custom Map',
                    author: 'Author'
                },
                spaces: [
                    {
                        id: 'start',
                        name: 'Start',
                        visualDetails: { x: 0, y: 0 },
                        connections: [],
                        events: []
                    }
                ]
            };

            jest.spyOn(BoardSchemaValidator, 'validate').mockReturnValue({
                valid: true,
                errors: []
            });

            const addedMap = MapStorageManager.addCustomMap(mockMapData);
            const customMaps = MapStorageManager.getCustomMaps();

            expect(customMaps.length).toBe(1);
            expect(customMaps[0].id).toBe(addedMap.id);
        });

        test('should delete custom map', () => {
            const mockMapData = {
                metadata: { name: 'To Delete', author: 'Test' },
                spaces: [
                    {
                        id: 'start',
                        name: 'Start',
                        visualDetails: { x: 0, y: 0 },
                        connections: [],
                        events: []
                    }
                ]
            };

            jest.spyOn(BoardSchemaValidator, 'validate').mockReturnValue({
                valid: true,
                errors: []
            });

            const addedMap = MapStorageManager.addCustomMap(mockMapData);
            const deleted = MapStorageManager.deleteCustomMap(addedMap.id);

            expect(deleted).toBe(true);
            expect(MapStorageManager.getCustomMaps().length).toBe(0);
        });

        test('should return false when deleting non-existent map', () => {
            const deleted = MapStorageManager.deleteCustomMap('non-existent-id');
            expect(deleted).toBe(false);
        });
    });

    describe('Get All Maps', () => {
        test('should return both built-in and custom maps', () => {
            const mockMapData = {
                metadata: { name: 'Custom', author: 'Test' },
                spaces: [
                    {
                        id: 'start',
                        name: 'Start',
                        visualDetails: { x: 0, y: 0 },
                        connections: [],
                        events: []
                    }
                ]
            };

            jest.spyOn(BoardSchemaValidator, 'validate').mockReturnValue({
                valid: true,
                errors: []
            });

            MapStorageManager.addCustomMap(mockMapData);

            const allMaps = MapStorageManager.getAllMaps();
            const builtInCount = MapStorageManager.getBuiltInMaps().length;

            expect(allMaps.length).toBe(builtInCount + 1);

            const hasBuiltIn = allMaps.some(m => m.isBuiltIn);
            const hasCustom = allMaps.some(m => !m.isBuiltIn);

            expect(hasBuiltIn).toBe(true);
            expect(hasCustom).toBe(true);
        });
    });

    describe('Get Map By ID', () => {
        test('should find built-in map by id', () => {
            const map = MapStorageManager.getMapById('default');

            expect(map).toBeDefined();
            expect(map.id).toBe('default');
            expect(map.isBuiltIn).toBe(true);
        });

        test('should find custom map by id', () => {
            const mockMapData = {
                metadata: { name: 'Findable', author: 'Test' },
                spaces: [
                    {
                        id: 'start',
                        name: 'Start',
                        visualDetails: { x: 0, y: 0 },
                        connections: [],
                        events: []
                    }
                ]
            };

            jest.spyOn(BoardSchemaValidator, 'validate').mockReturnValue({
                valid: true,
                errors: []
            });

            const added = MapStorageManager.addCustomMap(mockMapData);
            const found = MapStorageManager.getMapById(added.id);

            expect(found).toBeDefined();
            expect(found.id).toBe(added.id);
        });

        test('should return null for non-existent map', () => {
            const map = MapStorageManager.getMapById('does-not-exist');
            expect(map).toBeNull();
        });
    });

    describe('Search Maps', () => {
        test('should return all maps when query is empty', () => {
            const results = MapStorageManager.searchMaps('');
            const allMaps = MapStorageManager.getAllMaps();

            expect(results.length).toBe(allMaps.length);
        });

        test('should filter maps by name', () => {
            const results = MapStorageManager.searchMaps('Default');

            expect(results.length).toBeGreaterThan(0);
            expect(results.some(m => m.name.includes('Default'))).toBe(true);
        });

        test('should filter maps by author', () => {
            const results = MapStorageManager.searchMaps('Test Creator');

            expect(results.length).toBeGreaterThan(0);
            expect(results.every(m => m.author === 'Test Creator')).toBe(true);
        });

        test('should be case-insensitive', () => {
            const lowerResults = MapStorageManager.searchMaps('default');
            const upperResults = MapStorageManager.searchMaps('DEFAULT');

            expect(lowerResults.length).toBe(upperResults.length);
        });
    });

    describe('Selected Map', () => {
        test('should default to "default" map when nothing selected', () => {
            const selectedId = MapStorageManager.getSelectedMapId();
            expect(selectedId).toBe('default');
        });

        test('should save and retrieve selected map id', () => {
            MapStorageManager.setSelectedMapId('simple-linear');
            const selectedId = MapStorageManager.getSelectedMapId();

            expect(selectedId).toBe('simple-linear');
        });
    });

    describe('Load Map Data', () => {
        test('should return board data for custom map', async () => {
            const mockMapData = {
                metadata: { name: 'Loadable', author: 'Test' },
                spaces: [
                    {
                        id: 'start',
                        name: 'Start',
                        visualDetails: { x: 0, y: 0 },
                        connections: [],
                        events: []
                    }
                ]
            };

            jest.spyOn(BoardSchemaValidator, 'validate').mockReturnValue({
                valid: true,
                errors: []
            });

            const added = MapStorageManager.addCustomMap(mockMapData);
            const loaded = await MapStorageManager.loadMapData(added.id);

            expect(loaded).toEqual(mockMapData);
        });

        test('should fetch built-in map from path', async () => {
            const mockResponse = {
                metadata: { name: 'Built-in', author: 'System' },
                spaces: [
                    {
                        id: 'start',
                        name: 'Start',
                        visualDetails: { x: 0, y: 0 },
                        connections: [],
                        events: []
                    }
                ]
            };

            global.fetch = jest.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })
            );

            const loaded = await MapStorageManager.loadMapData('default');

            expect(loaded).toEqual(mockResponse);
            expect(global.fetch).toHaveBeenCalledWith('assets/maps/defaultBoard.json');
        });

        test('should throw error when map not found', async () => {
            await expect(MapStorageManager.loadMapData('non-existent')).rejects.toThrow(
                'Map not found: non-existent'
            );
        });
    });

    describe('Clear All Custom Maps', () => {
        test('should remove all custom maps from localStorage', () => {
            const mockMapData = {
                metadata: { name: 'To Clear', author: 'Test' },
                spaces: [
                    {
                        id: 'start',
                        name: 'Start',
                        visualDetails: { x: 0, y: 0 },
                        connections: [],
                        events: []
                    }
                ]
            };

            jest.spyOn(BoardSchemaValidator, 'validate').mockReturnValue({
                valid: true,
                errors: []
            });

            MapStorageManager.addCustomMap(mockMapData);
            expect(MapStorageManager.getCustomMaps().length).toBe(1);

            MapStorageManager.clearAllCustomMaps();
            expect(MapStorageManager.getCustomMaps().length).toBe(0);
        });
    });
});
