import { requestAnimationFrameSafe } from '../../../js/infrastructure/utils/layout.js';

export default class GameLogPopupController {
    constructor(eventBus, config = {}) {
        this.eventBus = eventBus;
        this.config = {
            popupId: config.popupId || 'gameLogPopup',
            openButtonId: config.openButtonId || 'openGameLogButton',
            closeButtonId: config.closeButtonId || 'closeGameLogButton',
            headerId: config.headerId || 'gameLogPopupHeader'
        };

        this.popup = null;
        this.openButton = null;
        this.closeButton = null;
        this.header = null;
        this.pageVisible = false;
        this.isVisible = false;

        // Dragging state
        this.isDragging = false;
        this.currentX = 0;
        this.currentY = 0;
        this.initialX = 0;
        this.initialY = 0;
        this.xOffset = 0;
        this.yOffset = 0;

        this.boundOpen = this.open.bind(this);
        this.boundClose = this.close.bind(this);
        this.boundDragStart = this.dragStart.bind(this);
        this.boundDrag = this.drag.bind(this);
        this.boundDragEnd = this.dragEnd.bind(this);
        this.onPageChanged = this.onPageChanged.bind(this);
    }

    init() {
        this.popup = document.getElementById(this.config.popupId);
        this.openButton = document.getElementById(this.config.openButtonId);
        this.closeButton = document.getElementById(this.config.closeButtonId);
        this.header = document.getElementById(this.config.headerId);

        if (!this.popup || !this.openButton || !this.closeButton || !this.header) {
            console.warn('GameLogPopupController: Missing elements', {
                popup: !!this.popup,
                openButton: !!this.openButton,
                closeButton: !!this.closeButton,
                header: !!this.header
            });
            return;
        }

        this.openButton.addEventListener('click', this.boundOpen);
        this.closeButton.addEventListener('click', this.boundClose);

        // Add drag event listeners
        this.header.addEventListener('mousedown', this.boundDragStart);
        this.header.addEventListener('touchstart', this.boundDragStart);

        this.eventBus?.on('pageChanged', this.onPageChanged);

        // Check if we're already on the game page
        const gamePage = document.getElementById('gamePage');
        const isGamePageVisible = gamePage && gamePage.style.display !== 'none';

        this.applyPageVisibility(isGamePageVisible);
        this.close(false);
    }

    destroy() {
        this.openButton?.removeEventListener('click', this.boundOpen);
        this.closeButton?.removeEventListener('click', this.boundClose);
        this.header?.removeEventListener('mousedown', this.boundDragStart);
        this.header?.removeEventListener('touchstart', this.boundDragStart);
        document.removeEventListener('mousemove', this.boundDrag);
        document.removeEventListener('mouseup', this.boundDragEnd);
        document.removeEventListener('touchmove', this.boundDrag);
        document.removeEventListener('touchend', this.boundDragEnd);
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
            this.openButton.style.display = visible ? 'block' : 'none';
        }
    }

    open() {
        if (!this.pageVisible || !this.popup) return;
        this.popup.classList.add('visible');
        this.isVisible = true;
        requestAnimationFrameSafe(() => {
            this.popup.classList.add('game-log-highlight');
            setTimeout(() => this.popup?.classList.remove('game-log-highlight'), 300);
        });
    }

    close(shouldAnimate = true) {
        if (!this.popup) return;
        this.popup.classList.remove('visible');
        this.isVisible = false;
        if (shouldAnimate) {
            requestAnimationFrameSafe(() => {
                this.popup.classList.remove('game-log-highlight');
            });
        }
    }

    dragStart(e) {
        if (e.type === 'touchstart') {
            this.initialX = e.touches[0].clientX - this.xOffset;
            this.initialY = e.touches[0].clientY - this.yOffset;
        } else {
            this.initialX = e.clientX - this.xOffset;
            this.initialY = e.clientY - this.yOffset;
        }

        if (e.target === this.header || this.header.contains(e.target)) {
            // Don't start drag if clicking the close button
            if (e.target === this.closeButton || this.closeButton.contains(e.target)) {
                return;
            }
            this.isDragging = true;

            // Add move and end listeners to document
            document.addEventListener('mousemove', this.boundDrag);
            document.addEventListener('mouseup', this.boundDragEnd);
            document.addEventListener('touchmove', this.boundDrag);
            document.addEventListener('touchend', this.boundDragEnd);
        }
    }

    drag(e) {
        if (!this.isDragging) return;

        e.preventDefault();

        if (e.type === 'touchmove') {
            this.currentX = e.touches[0].clientX - this.initialX;
            this.currentY = e.touches[0].clientY - this.initialY;
        } else {
            this.currentX = e.clientX - this.initialX;
            this.currentY = e.clientY - this.initialY;
        }

        this.xOffset = this.currentX;
        this.yOffset = this.currentY;

        this.setTranslate(this.currentX, this.currentY, this.popup);
    }

    dragEnd(e) {
        this.isDragging = false;

        // Remove move and end listeners from document
        document.removeEventListener('mousemove', this.boundDrag);
        document.removeEventListener('mouseup', this.boundDragEnd);
        document.removeEventListener('touchmove', this.boundDrag);
        document.removeEventListener('touchend', this.boundDragEnd);
    }

    setTranslate(xPos, yPos, el) {
        if (!el) return;
        el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }
}
