export default class SidebarWidgetManager {
    constructor({ containerId = 'gameSidebar' } = {}) {
        this.containerId = containerId;
        this.widgets = [];
        this.initialized = false;
    }

    getContainer() {
        return document.getElementById(this.containerId);
    }

    register(widget) {
        if (!widget || !widget.id) {
            console.warn('[SidebarWidgetManager] Widget must have an id');
            return;
        }
        widget.setManager?.(this);
        this.widgets.push(widget);
        // Keep deterministic order
        this.widgets.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        if (this.initialized && !widget.initialized) {
            widget.init?.();
        }
    }

    unregister(widgetId) {
        const idx = this.widgets.findIndex(w => w.id === widgetId);
        if (idx !== -1) {
            const [widget] = this.widgets.splice(idx, 1);
            widget?.cleanup?.();
        }
    }

    initAll() {
        if (this.initialized) return;
        this.widgets.forEach(widget => {
            if (!widget.initialized) {
                widget.init?.();
            }
        });
        this.initialized = true;
    }

    updateAll(gameState, context = {}) {
        this.widgets.forEach(widget => widget.update?.(gameState, context));
    }

    cleanup() {
        this.widgets.forEach(widget => widget.cleanup?.());
        this.widgets = [];
        this.initialized = false;
    }
}
