import GameStateStorageManager from '../../src/js/systems/storage/GameStateStorageManager.js';
import PersonalSettings from '../../src/js/elements/models/PersonalSettings.js';

describe('GameStateStorageManager', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    const buildMockGameState = (overrides = {}) => ({
        gameId: overrides.gameId || 'game-1',
        getTurnNumber: () => overrides.turnNumber || 1,
        toJSON: () => ({
            stateType: 'turn-based',
            gameId: overrides.gameId || 'game-1',
            selectedMapId: overrides.mapId || 'default',
            board: { metadata: { name: overrides.mapName || 'Mock Map' } },
            gamePhase: overrides.gamePhase || 'IN_LOBBY',
            payload: overrides.payload || ''
        })
    });

    test('respects auto-save setting unless forced', () => {
        const settings = new PersonalSettings();
        settings.setAutoSaveGameStates(false);

        const manager = new GameStateStorageManager(settings);
        const gameState = buildMockGameState();

        const autoSave = manager.saveGameState(gameState, { source: 'auto' });
        expect(autoSave).toBeNull();

        const manualSave = manager.saveGameState(gameState, { source: 'manual', force: true });
        expect(manualSave).toBeTruthy();
        expect(manager.getAllSaves().length).toBe(1);
    });

    test('trims saves per game by size limit', () => {
        const settings = new PersonalSettings();
        settings.setGameStatePerGameLimitMb(0.001); // ~1KB

        const manager = new GameStateStorageManager(settings);
        const bigPayload = 'x'.repeat(3000);

        manager.saveGameState(buildMockGameState({ payload: bigPayload }), { source: 'manual', force: true });
        manager.saveGameState(buildMockGameState({ payload: bigPayload }), { source: 'manual', force: true });

        const saves = manager.getAllSaves();
        expect(saves.length).toBe(1);
    });

    test('exports and imports saves', () => {
        const settings = new PersonalSettings();
        const manager = new GameStateStorageManager(settings);

        const saved = manager.saveGameState(buildMockGameState(), { source: 'manual', force: true });
        const exported = manager.exportSave(saved.saveId);

        expect(exported).toContain('gameStateSave');

        const imported = manager.importSave(exported);
        expect(imported).toBeTruthy();
        expect(manager.getAllSaves().length).toBe(2);
    });
});
