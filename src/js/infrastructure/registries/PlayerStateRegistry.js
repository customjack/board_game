export default class PlayerStateRegistry {
    constructor({ playerClass } = {}) {
        this.states = new Map();
        this.playerClass = playerClass;
    }

    register(id, metadata = {}) {
        if (!id || typeof id !== 'string') {
            console.warn('[PlayerStateRegistry] Invalid state id');
            return;
        }
        this.states.set(id, metadata);
        // Inform Player class so validation passes
        this.playerClass?.registerAllowedState?.(id);
        // console.log(`[PlayerStateRegistry] Registered player state "${id}"`);
    }

    unregister(id) {
        this.states.delete(id);
    }

    has(id) {
        return this.states.has(id);
    }

    getAll() {
        return Array.from(this.states.entries()).map(([id, meta]) => ({ id, ...meta }));
    }
}
