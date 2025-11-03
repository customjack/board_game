import { requestAnimationFrameSafe } from '../utils/layout.js';

export default class GameLogDockController {
    constructor(eventBus, config = {}) {
        this.eventBus = eventBus;
        this.config = {
            dockId: config.dockId || 'gameLogDock',
            dockBodyId: config.dockBodyId || 'gameLogBody',
            toggleId: config.toggleId || 'toggleGameLogButton'
        };

        this.dock = null;
        this.dockBody = null;
        this.toggleButton = null;
        this.pageVisible = false;
        this.collapsed = false;
        this.boundToggle = this.toggle.bind(this);

        this.onPageChanged = this.onPageChanged.bind(this);
        this.eventBus?.on('pageChanged', this.onPageChanged);
    }

    init() {
        this.dock = document.getElementById(this.config.dockId);
        this.dockBody = document.getElementById(this.config.dockBodyId);
        this.toggleButton = document.getElementById(this.config.toggleId);

        if (!this.dock || !this.dockBody) return;

        this.toggleButton?.addEventListener('click', this.boundToggle);
        this.applyPageVisibility();
        this.applyCollapse(false);
    }

    destroy() {
        this.toggleButton?.removeEventListener('click', this.boundToggle);
        this.eventBus?.off('pageChanged', this.onPageChanged);
    }

    onPageChanged({ pageId }) {
        const shouldShow = pageId === 'gamePage';
        if (shouldShow !== this.pageVisible) {
            this.pageVisible = shouldShow;
            this.applyPageVisibility();
            if (!shouldShow) {
                this.collapsed = false;
                this.applyCollapse(false);
            }
        }
    }

    toggle() {
        if (!this.pageVisible) return;
        this.collapsed = !this.collapsed;
        this.applyCollapse(true);
    }

    applyPageVisibility() {
        if (!this.dock) return;
        this.dock.setAttribute('data-page-visible', String(this.pageVisible));
    }

    applyCollapse(animate) {
        if (!this.dockBody) return;
        this.dockBody.setAttribute('data-collapsed', String(this.collapsed));

        if (this.toggleButton) {
            this.toggleButton.textContent = this.collapsed ? 'Show' : 'Hide';
            this.toggleButton.setAttribute('aria-expanded', String(!this.collapsed));
        }

        if (animate && !this.collapsed) {
            requestAnimationFrameSafe(() => {
                this.dock.classList.add('game-log-highlight');
                setTimeout(() => this.dock?.classList.remove('game-log-highlight'), 300);
            });
        }
    }
}
