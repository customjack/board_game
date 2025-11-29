export default class BaseSidebarWidget {
    constructor(id, options = {}) {
        this.id = id;
        this.order = options.order ?? 0;
        this.manager = null;
        this.initialized = false;
    }

    setManager(manager) {
        this.manager = manager;
    }

    /**
        * Called once after registration
        */
    init() {
        this.initialized = true;
    }

    /**
        * Update the widget when game state changes
        * @param {GameState} _gameState
        * @param {Object} _context
        */
    update(_gameState, _context = {}) {
        // no-op default
    }

    /**
        * Show the widget
        */
    show() {}

    /**
        * Hide the widget
        */
    hide() {}

    /**
        * Cleanup resources
        */
    cleanup() {
        this.initialized = false;
    }
}
