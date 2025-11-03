import { requestAnimationFrameSafe } from '../utils/layout.js';

export default class GameLogModalController {
    constructor(eventBus, config = {}) {
        this.eventBus = eventBus;
        this.config = {
            modalId: config.modalId || 'gameLogModal',
            openButtonId: config.openButtonId || 'openGameLogButton',
            closeButtonId: config.closeButtonId || 'closeGameLogButton'
        };

        this.modal = null;
        this.openButton = null;
        this.closeButton = null;
        this.pageVisible = false;

        this.boundOpen = this.open.bind(this);
        this.boundClose = this.close.bind(this);
        this.boundOutsideClick = this.handleOutsideClick.bind(this);
        this.onPageChanged = this.onPageChanged.bind(this);
    }

    init() {
        this.modal = document.getElementById(this.config.modalId);
        this.openButton = document.getElementById(this.config.openButtonId);
        this.closeButton = document.getElementById(this.config.closeButtonId);

        if (!this.modal || !this.openButton || !this.closeButton) {
            return;
        }

        this.openButton.addEventListener('click', this.boundOpen);
        this.closeButton.addEventListener('click', this.boundClose);
        this.modal.addEventListener('click', this.boundOutsideClick);
        this.eventBus?.on('pageChanged', this.onPageChanged);

        this.applyPageVisibility(false);
        this.close(false);
    }

    destroy() {
        this.openButton?.removeEventListener('click', this.boundOpen);
        this.closeButton?.removeEventListener('click', this.boundClose);
        this.modal?.removeEventListener('click', this.boundOutsideClick);
        this.eventBus?.off('pageChanged', this.onPageChanged);
    }

    onPageChanged({ pageId }) {
        const shouldShow = pageId === 'gamePage';
        if (shouldShow !== this.pageVisible) {
            this.applyPageVisibility(shouldShow);
            if (!shouldShow) {
                this.close(false);
            }
        }
    }

    applyPageVisibility(visible) {
        this.pageVisible = visible;
        if (this.openButton) {
            this.openButton.style.display = visible ? '' : 'none';
        }
    }

    open() {
        if (!this.pageVisible || !this.modal) return;
        this.modal.style.display = 'flex';
        requestAnimationFrameSafe(() => {
            this.modal.classList.add('game-log-highlight');
            setTimeout(() => this.modal?.classList.remove('game-log-highlight'), 300);
        });
    }

    close(shouldAnimate = true) {
        if (!this.modal) return;
        this.modal.style.display = 'none';
        if (shouldAnimate) {
            requestAnimationFrameSafe(() => {
                this.modal.classList.remove('game-log-highlight');
            });
        }
    }

    handleOutsideClick(event) {
        if (event.target === this.modal) {
            this.close();
        }
    }
}
