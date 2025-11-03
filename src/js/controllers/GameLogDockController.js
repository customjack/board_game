import { requestAnimationFrameSafe } from '../utils/layout.js';

export default class GameLogDockController {
    constructor(eventBus, config = {}) {
        this.eventBus = eventBus;
        this.config = {
            dockId: config.dockId || 'gameLogDock',
            toggleId: config.toggleId || 'toggleGameLogButton'
        };

        this.dock = null;
        this.toggleButton = null;
        this.visible = false;
        this.boundToggle = this.toggle.bind(this);

        this.onPageChanged = this.onPageChanged.bind(this);
        this.eventBus?.on('pageChanged', this.onPageChanged);
    }

    init() {
        this.dock = document.getElementById(this.config.dockId);
        this.toggleButton = document.getElementById(this.config.toggleId);

        if (!this.dock) return;

        this.toggleButton?.addEventListener('click', this.boundToggle);
        this.syncState(false);
    }

    destroy() {
        this.toggleButton?.removeEventListener('click', this.boundToggle);
        this.eventBus?.off('pageChanged', this.onPageChanged);
    }

    onPageChanged({ pageId }) {
        const shouldShow = pageId === 'gamePage';
        if (shouldShow !== this.visible) {
            this.visible = shouldShow;
            this.syncState(true);
        }
    }

    toggle() {
        this.visible = !this.visible;
        this.syncState(true);
    }

    syncState(animate) {
        if (!this.dock) return;
        this.dock.setAttribute('data-visible', String(this.visible));
        if (this.toggleButton) {
            this.toggleButton.textContent = this.visible ? 'Hide' : 'Show';
            this.toggleButton.setAttribute('aria-expanded', String(this.visible));
        }

        if (animate && this.visible) {
            requestAnimationFrameSafe(() => {
                this.dock.classList.add('game-log-highlight');
                setTimeout(() => this.dock?.classList.remove('game-log-highlight'), 300);
            });
        }
    }
}
