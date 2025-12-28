import BaseManagerModal from './BaseManagerModal.js';
import ModalUtil from '../../../infrastructure/utils/ModalUtil.js';

export default class GameStateManagerModal extends BaseManagerModal {
    constructor(id, config = {}) {
        super({
            id: id || 'gameStateManagerModal',
            title: 'Game State Manager'
        });

        this.gameStateStorageManager = config.gameStateStorageManager;
        this.eventHandler = config.eventHandler || null;
        this.isHost = config.isHost || false;
        this.onLoadSave = config.onLoadSave || null;
    }

    init() {
        super.init();
    }

    updateConfig(config = {}) {
        if (config.gameStateStorageManager !== undefined) {
            this.gameStateStorageManager = config.gameStateStorageManager;
        }
        if (config.eventHandler !== undefined) {
            this.eventHandler = config.eventHandler;
        }
        if (config.isHost !== undefined) {
            this.isHost = config.isHost;
        }
        if (config.onLoadSave !== undefined) {
            this.onLoadSave = config.onLoadSave;
        }
    }

    onOpen() {
        this.renderContent();
    }

    renderContent() {
        const contentContainer = this.content;
        if (!contentContainer) return;

        contentContainer.innerHTML = '';
        contentContainer.style.padding = '20px';
        contentContainer.style.display = 'flex';
        contentContainer.style.flexDirection = 'column';
        contentContainer.style.height = '100%';

        const toolbar = this.createToolbar();
        const listContainer = this.createListContainer();

        contentContainer.appendChild(toolbar);
        contentContainer.appendChild(listContainer);

        this.populateList(listContainer);
    }

    createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'game-state-toolbar';
        toolbar.style.display = 'flex';
        toolbar.style.gap = '10px';
        toolbar.style.alignItems = 'center';
        toolbar.style.marginBottom = '16px';

        if (this.isHost) {
            const saveButton = document.createElement('button');
            saveButton.className = 'button button-primary';
            saveButton.textContent = 'Save Current State';
            saveButton.addEventListener('click', () => this.handleManualSave());
            toolbar.appendChild(saveButton);
        }

        const importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.accept = '.json';
        importInput.style.display = 'none';
        importInput.addEventListener('change', (event) => this.handleImport(event));

        const importButton = document.createElement('button');
        importButton.className = 'button button-secondary';
        importButton.textContent = 'Import Save';
        importButton.addEventListener('click', () => importInput.click());

        toolbar.appendChild(importButton);
        toolbar.appendChild(importInput);

        const info = document.createElement('div');
        info.style.marginLeft = 'auto';
        info.style.fontSize = '0.9em';
        info.style.color = 'var(--text-color-muted, #888)';

        const storageInfo = this.gameStateStorageManager?.getStorageInfo?.();
        if (storageInfo) {
            const limits = this.gameStateStorageManager.getLimits();
            const totalMb = storageInfo.totalMb.toFixed(1);
            info.textContent = `Storage: ${totalMb} MB / ${limits.totalLimitMb} MB`;
        }

        toolbar.appendChild(info);
        return toolbar;
    }

    createListContainer() {
        const container = document.createElement('div');
        container.className = 'game-state-list';
        container.style.flex = '1';
        container.style.overflowY = 'auto';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '12px';
        return container;
    }

    populateList(container) {
        if (!this.gameStateStorageManager) return;

        const saves = this.gameStateStorageManager.getAllSaves()
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (saves.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = 'No saved game states yet.';
            empty.style.textAlign = 'center';
            empty.style.color = 'var(--text-color-muted, #888)';
            empty.style.padding = '24px';
            container.appendChild(empty);
            return;
        }

        const grouped = saves.reduce((acc, save) => {
            const gameId = save.gameId || 'unknown-game';
            if (!acc.has(gameId)) acc.set(gameId, []);
            acc.get(gameId).push(save);
            return acc;
        }, new Map());

        grouped.forEach((gameSaves) => {
            const card = this.createGameGroupCard(gameSaves);
            container.appendChild(card);
        });
    }

    createGameGroupCard(gameSaves = []) {
        if (!Array.isArray(gameSaves) || gameSaves.length === 0) return document.createElement('div');

        const sorted = gameSaves.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const latest = sorted[sorted.length - 1];
        let selectedSave = latest;

        const card = document.createElement('div');
        card.className = 'game-state-card';
        card.style.border = '1px solid var(--border-color)';
        card.style.borderRadius = '6px';
        card.style.padding = '12px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '8px';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.flexWrap = 'wrap';
        header.style.gap = '8px';
        header.style.alignItems = 'center';

        const title = document.createElement('div');
        title.style.fontWeight = '600';
        title.textContent = latest.mapName || 'Saved Game';

        const meta = document.createElement('div');
        meta.style.fontSize = '0.85em';
        meta.style.color = 'var(--text-color-muted, #888)';
        meta.textContent = `${sorted.length} saves`;

        const select = document.createElement('select');
        select.className = 'input';
        select.style.minWidth = '220px';
        select.style.flex = '1';
        select.addEventListener('change', (e) => {
            const found = sorted.find(s => s.saveId === e.target.value);
            if (found) {
                selectedSave = found;
                detail.textContent = this.formatSaveDetails(found);
            }
        });

        sorted.slice().reverse().forEach(save => {
            const option = document.createElement('option');
            option.value = save.saveId;
            option.textContent = `${new Date(save.createdAt).toLocaleString()} • ${save.source}`;
            select.appendChild(option);
        });
        select.value = latest.saveId;

        header.appendChild(title);
        header.appendChild(meta);
        header.appendChild(select);

        const detail = document.createElement('div');
        detail.style.fontSize = '0.85em';
        detail.style.color = 'var(--text-color-muted, #888)';
        detail.textContent = this.formatSaveDetails(selectedSave);

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '8px';
        actions.style.flexWrap = 'wrap';

        const deleteGameButton = document.createElement('button');
        deleteGameButton.className = 'button button-danger';
        deleteGameButton.textContent = 'Delete Game';
        deleteGameButton.addEventListener('click', async () => {
            const confirmed = await ModalUtil.confirm('Delete all saves for this game?', 'Delete Game Saves');
            if (!confirmed) return;
            this.gameStateStorageManager.clearGame(latest.gameId);
            this.renderContent();
        });
        actions.appendChild(deleteGameButton);

        if (this.isHost) {
            const loadButton = document.createElement('button');
            loadButton.className = 'button button-primary';
            loadButton.textContent = 'Load';
            loadButton.addEventListener('click', () => this.handleLoadSave(selectedSave));
            actions.appendChild(loadButton);
        }

        const downloadButton = document.createElement('button');
        downloadButton.className = 'button button-secondary';
        downloadButton.textContent = 'Download';
        downloadButton.addEventListener('click', () => this.handleDownload(selectedSave));
        actions.appendChild(downloadButton);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'button button-danger';
        deleteButton.textContent = 'Delete Save';
        deleteButton.addEventListener('click', () => this.handleDelete(selectedSave));
        actions.appendChild(deleteButton);

        card.appendChild(header);
        card.appendChild(detail);
        card.appendChild(actions);
        return card;
    }

    formatSaveDetails(save) {
        return `Game ID: ${save.gameId} • Phase: ${save.gamePhase || 'IN_LOBBY'} • Turn: ${save.turnNumber ?? 'N/A'}`;
    }

    handleManualSave() {
        if (!this.eventHandler?.peer?.gameState) return;
        const saved = this.gameStateStorageManager.saveGameState(this.eventHandler.peer.gameState, {
            source: 'manual',
            reason: 'manual',
            force: true
        });
        if (saved) {
            this.renderContent();
        }
    }

    async handleLoadSave(save) {
        if (!save || !save.state) return;

        const confirmed = await ModalUtil.confirm(
            'Loading a saved game will replace the current lobby state. Continue?',
            'Load Game State'
        );

        if (!confirmed) return;

        if (this.onLoadSave) {
            this.onLoadSave(save);
        }
        this.close();
    }

    handleDownload(save) {
        const data = this.gameStateStorageManager.exportSave(save.saveId);
        if (!data) return;

        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${save.mapName || 'game'}-${save.saveId}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async handleDelete(save) {
        const confirmed = await ModalUtil.confirm('Delete this saved state?', 'Delete Save');
        if (!confirmed) return;

        this.gameStateStorageManager.deleteSave(save.saveId);
        this.renderContent();
    }

    async handleImport(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const content = await file.text();
            const imported = this.gameStateStorageManager.importSave(content);
            if (!imported) {
                await ModalUtil.alert('Could not import that save file.');
            }
        } catch (error) {
            console.error('[GameStateManager] Import failed:', error);
            await ModalUtil.alert('Failed to import save.');
        }

        event.target.value = '';
        this.renderContent();
    }
}
