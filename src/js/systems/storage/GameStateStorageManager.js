/**
 * GameStateStorageManager - Persists game state history in localStorage.
 *
 * Manages per-game and global FIFO buffers using size limits from PersonalSettings.
 */
export default class GameStateStorageManager {
    static STORAGE_KEY = 'gameStateSaves';

    constructor(personalSettings) {
        this.personalSettings = personalSettings || null;
    }

    getLimits() {
        const totalLimitMb = this.personalSettings?.getGameStateTotalLimitMb?.() ?? 50;
        const perGameLimitMb = this.personalSettings?.getGameStatePerGameLimitMb?.() ?? 10;
        const totalLimitBytes = totalLimitMb > 0 ? totalLimitMb * 1024 * 1024 : 0;
        const perGameLimitBytes = perGameLimitMb > 0 ? perGameLimitMb * 1024 * 1024 : 0;

        return {
            totalLimitBytes,
            perGameLimitBytes,
            totalLimitMb,
            perGameLimitMb,
            autoSaveEnabled: this.personalSettings?.getAutoSaveGameStates?.() ?? true
        };
    }

    getAllSaves() {
        const stored = localStorage.getItem(GameStateStorageManager.STORAGE_KEY);
        if (!stored) return [];
        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('[GameStateStorageManager] Failed to parse saves:', error);
            return [];
        }
    }

    getSaveById(saveId) {
        return this.getAllSaves().find(save => save.saveId === saveId) || null;
    }

    getSavesByGameId(gameId) {
        return this.getAllSaves().filter(save => save.gameId === gameId);
    }

    deleteSave(saveId) {
        const saves = this.getAllSaves();
        const filtered = saves.filter(save => save.saveId !== saveId);
        this.writeSaves(filtered);
        return filtered.length !== saves.length;
    }

    clearGame(gameId) {
        const saves = this.getAllSaves();
        const filtered = saves.filter(save => save.gameId !== gameId);
        this.writeSaves(filtered);
        return filtered.length !== saves.length;
    }

    saveGameState(gameState, { source = 'auto', reason = 'auto', force = false } = {}) {
        if (!gameState) return null;

        const { autoSaveEnabled } = this.getLimits();
        if (!force && source === 'auto' && !autoSaveEnabled) {
            return null;
        }

        const save = this.buildSave(gameState, { source, reason });
        const saves = this.getAllSaves();
        saves.push(save);

        const trimmed = this.trimSaves(saves);
        this.writeSaves(trimmed);

        return save;
    }

    exportSave(saveId) {
        const save = this.getSaveById(saveId);
        if (!save) return null;
        try {
            return JSON.stringify({
                format: 'gameStateSave',
                version: 1,
                save
            }, null, 2);
        } catch (error) {
            console.error('[GameStateStorageManager] Failed to export save:', error);
            return null;
        }
    }

    importSave(rawData) {
        if (!rawData) return null;

        let payload = rawData;
        if (typeof rawData === 'string') {
            try {
                payload = JSON.parse(rawData);
            } catch (error) {
                console.error('[GameStateStorageManager] Failed to parse save import:', error);
                return null;
            }
        }

        const save = this.normalizeImportedSave(payload);
        if (!save) return null;

        const saves = this.getAllSaves();
        saves.push(save);
        const trimmed = this.trimSaves(saves);
        this.writeSaves(trimmed);

        return save;
    }

    normalizeImportedSave(payload) {
        if (!payload) return null;

        if (payload.format === 'gameStateSave' && payload.save) {
            return this.prepareImportedSave(payload.save, { source: 'imported' });
        }

        if (payload.state) {
            return this.prepareImportedSave(payload, { source: payload.source || 'imported' });
        }

        if (payload.gameState || payload.stateType) {
            const state = payload.gameState || payload;
            return this.prepareImportedSave({ state }, { source: 'imported' });
        }

        return null;
    }

    prepareImportedSave(save, { source = 'imported' } = {}) {
        const state = save.state || save.gameState || null;
        if (!state || !state.stateType) {
            return null;
        }

        return {
            saveId: save.saveId || this.generateSaveId(),
            gameId: state.gameId || save.gameId || this.generateGameId(),
            createdAt: save.createdAt || new Date().toISOString(),
            source,
            reason: save.reason || 'imported',
            engineType: save.engineType || state.stateType || 'unknown',
            mapId: save.mapId || state.selectedMapId || 'unknown',
            mapName: save.mapName || state.board?.metadata?.name || 'Unknown Map',
            turnNumber: save.turnNumber || null,
            gamePhase: save.gamePhase || state.gamePhase || 'IN_LOBBY',
            state
        };
    }

    buildSave(gameState, { source = 'auto', reason = 'auto' } = {}) {
        const state = gameState.toJSON();
        return {
            saveId: this.generateSaveId(),
            gameId: state.gameId || gameState.gameId || this.generateGameId(),
            createdAt: new Date().toISOString(),
            source,
            reason,
            engineType: state.stateType || 'unknown',
            mapId: state.selectedMapId || 'unknown',
            mapName: state.board?.metadata?.name || 'Unknown Map',
            turnNumber: gameState.getTurnNumber?.() ?? null,
            gamePhase: state.gamePhase || 'IN_LOBBY',
            state
        };
    }

    trimSaves(saves = []) {
        const { totalLimitBytes, perGameLimitBytes } = this.getLimits();
        let trimmed = saves.filter(save => save && save.state);

        const sortByCreatedAt = (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        trimmed.sort(sortByCreatedAt);

        if (perGameLimitBytes > 0) {
            const grouped = new Map();
            trimmed.forEach(save => {
                if (!grouped.has(save.gameId)) {
                    grouped.set(save.gameId, []);
                }
                grouped.get(save.gameId).push(save);
            });

            grouped.forEach(group => {
                group.sort(sortByCreatedAt);
                while (this.calculateGroupSize(group) > perGameLimitBytes) {
                    group.shift();
                }
            });

            trimmed = Array.from(grouped.values()).flat();
            trimmed.sort(sortByCreatedAt);
        }

        if (totalLimitBytes > 0) {
            while (this.calculateTotalSize(trimmed) > totalLimitBytes) {
                trimmed.shift();
            }
        }

        return trimmed;
    }

    calculateGroupSize(group) {
        return group.reduce((sum, save) => sum + this.calculateSaveSize(save), 0);
    }

    calculateTotalSize(saves) {
        return saves.reduce((sum, save) => sum + this.calculateSaveSize(save), 0);
    }

    calculateSaveSize(save) {
        if (!save) return 0;
        if (save.sizeBytes) return save.sizeBytes;
        const size = new Blob([JSON.stringify(save)]).size;
        save.sizeBytes = size;
        return size;
    }

    writeSaves(saves) {
        try {
            localStorage.setItem(GameStateStorageManager.STORAGE_KEY, JSON.stringify(saves));
        } catch (error) {
            console.error('[GameStateStorageManager] Failed to write saves:', error);
        }
    }

    getStorageInfo() {
        const saves = this.getAllSaves();
        const totalBytes = this.calculateTotalSize(saves);
        return {
            saveCount: saves.length,
            totalBytes,
            totalMb: totalBytes / (1024 * 1024)
        };
    }

    generateSaveId() {
        const seed = Math.random().toString(36).slice(2, 10);
        return `save-${Date.now().toString(36)}-${seed}`;
    }

    generateGameId() {
        const seed = Math.random().toString(36).slice(2, 10);
        return `game-${Date.now().toString(36)}-${seed}`;
    }
}
