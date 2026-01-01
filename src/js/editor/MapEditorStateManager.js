export default class MapEditorStateManager {
    constructor({ storageKey = 'map_editor_state_v1', maxHistory = 40 } = {}) {
        this.storageKey = storageKey;
        this.maxHistory = maxHistory;
        this.state = null;
        this.undoStack = [];
        this.redoStack = [];
    }

    loadDraft() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored) return null;
            this.state = JSON.parse(stored);
            return this.state;
        } catch (error) {
            console.warn('[MapEditor] Failed to load draft', error);
            return null;
        }
    }

    saveDraft() {
        if (!this.state) return;
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (error) {
            console.warn('[MapEditor] Failed to save draft', error);
        }
    }

    setState(nextState, { pushHistory = false } = {}) {
        if (pushHistory && this.state) {
            this.pushHistory();
        }
        this.state = nextState;
        this.saveDraft();
        return this.state;
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
        const snapshot = JSON.stringify(this.state);
        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    undo() {
        if (!this.undoStack.length || !this.state) return null;
        const current = JSON.stringify(this.state);
        const snapshot = this.undoStack.pop();
        this.redoStack.push(current);
        this.state = JSON.parse(snapshot);
        this.saveDraft();
        return this.state;
    }

    redo() {
        if (!this.redoStack.length || !this.state) return null;
        const current = JSON.stringify(this.state);
        const snapshot = this.redoStack.pop();
        this.undoStack.push(current);
        this.state = JSON.parse(snapshot);
        this.saveDraft();
        return this.state;
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }
}
