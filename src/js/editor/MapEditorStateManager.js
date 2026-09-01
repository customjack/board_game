import IDBStorage from '../infrastructure/storage/IDBStorage.js';

export default class MapEditorStateManager {
    constructor({ storageKey = 'map_editor_state_v1', maxHistory = 40 } = {}) {
        this.storageKey = storageKey;
        this.maxHistory = maxHistory;
        this.state = null;
        this.undoStack = [];
        this.redoStack = [];
        this._idb = new IDBStorage('board-game-db', 'map-editor');
        this._savePending = false;
    }

    /** Open IDB and migrate any existing localStorage draft. Must be called before use. */
    async init() {
        await this._idb.ready();
        await this._idb.migrateFromLocalStorage([this.storageKey]);
    }

    async loadDraft() {
        try {
            const stored = await this._idb.getItem(this.storageKey);
            if (!stored) return null;
            this.state = stored; // IDB already parsed the object — no JSON.parse needed
            return this.state;
        } catch (error) {
            console.warn('[MapEditor] Failed to load draft', error);
            return null;
        }
    }

    /**
     * Persist the current state to IndexedDB.
     * IDB handles large payloads without the ~5 MB localStorage quota.
     * Writes are debounced: if a save is already scheduled we skip queuing another.
     */
    saveDraft() {
        if (!this.state) return;
        if (this._savePending) return;
        this._savePending = true;

        // Use a microtask so rapid sequential state updates only hit IDB once
        Promise.resolve().then(async () => {
            this._savePending = false;
            try {
                await this._idb.setItem(this.storageKey, this.state);
            } catch (error) {
                console.error('[MapEditor] Failed to save draft to IndexedDB:', error);
            }
        });
    }

    setState(nextState, { pushHistory = false } = {}) {
        if (pushHistory && this.state) {
            this.pushHistory();
        }
        this.state = nextState;
        this.saveDraft();
        return this.state;
    }

    clearHistory() {
        this.undoStack = [];
        this.redoStack = [];
    }

    updateSection(key, value) {
        if (!this.state) return;
        this.pushHistory();
        this.state = {
            ...this.state,
            [key]: value
        };
        this.saveDraft();
    }

    pushHistory() {
        if (!this.state) return;
        // Store a deep clone so later mutations don't affect the snapshot.
        // structuredClone is ~3× faster than JSON round-trip for large objects.
        const snapshot = typeof structuredClone === 'function'
            ? structuredClone(this.state)
            : JSON.parse(JSON.stringify(this.state));
        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    undo() {
        if (!this.undoStack.length || !this.state) return null;
        const current = typeof structuredClone === 'function'
            ? structuredClone(this.state)
            : JSON.parse(JSON.stringify(this.state));
        const snapshot = this.undoStack.pop();
        this.redoStack.push(current);
        this.state = snapshot;
        this.saveDraft();
        return this.state;
    }

    redo() {
        if (!this.redoStack.length || !this.state) return null;
        const current = typeof structuredClone === 'function'
            ? structuredClone(this.state)
            : JSON.parse(JSON.stringify(this.state));
        const snapshot = this.redoStack.pop();
        this.undoStack.push(current);
        this.state = snapshot;
        this.saveDraft();
        return this.state;
    }

    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }
}
