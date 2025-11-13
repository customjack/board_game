/**
 * BoardViewport - Manages panning and zooming for HTML-based board rendering
 *
 * Provides a simpler alternative to canvas rendering while maintaining interactivity.
 * Uses CSS transforms for panning/zooming the board container.
 */

export default class BoardViewport {
    constructor(container) {
        this.container = container;
        this.boardSurface = null;

        // Transform state
        this.scale = 1.0;
        this.translateX = 0;
        this.translateY = 0;

        // Zoom limits
        this.minScale = 0.3;
        this.maxScale = 2.0;

        // Panning state
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;
        this.lastTranslateX = 0;
        this.lastTranslateY = 0;

        // UI elements
        this.controls = null;
        this.zoomIndicator = null;

        this.setupEventListeners();
        this.createControls();
    }

    setupEventListeners() {
        this.boundHandlers = {
            mousedown: (e) => this.onMouseDown(e),
            mousemove: (e) => this.onMouseMove(e),
            mouseup: (e) => this.onMouseUp(e),
            wheel: (e) => this.onWheel(e)
        };

        this.container.addEventListener('mousedown', this.boundHandlers.mousedown);
        document.addEventListener('mousemove', this.boundHandlers.mousemove);
        document.addEventListener('mouseup', this.boundHandlers.mouseup);
        this.container.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });

        // Make container scrollable visually
        this.container.style.cursor = 'grab';
        this.container.style.overflow = 'hidden';
    }

    setBoardSurface(surface) {
        this.boardSurface = surface;
        this.applyTransform();
    }

    createControls() {
        // Create control panel
        this.controls = document.createElement('div');
        this.controls.className = 'board-controls';
        this.controls.innerHTML = `
            <button class="board-control-btn zoom-in" title="Zoom In">+</button>
            <button class="board-control-btn zoom-out" title="Zoom Out">−</button>
            <button class="board-control-btn recenter" title="Recenter View">⌖</button>
        `;

        // Create zoom indicator
        this.zoomIndicator = document.createElement('div');
        this.zoomIndicator.className = 'board-zoom-indicator';
        this.updateZoomIndicator();

        // Add to container
        this.container.style.position = 'relative';
        this.container.appendChild(this.controls);
        this.container.appendChild(this.zoomIndicator);

        // Add event listeners
        this.controls.querySelector('.zoom-in').addEventListener('click', () => this.zoomIn());
        this.controls.querySelector('.zoom-out').addEventListener('click', () => this.zoomOut());
        this.controls.querySelector('.recenter').addEventListener('click', () => this.recenter());
    }

    onMouseDown(e) {
        // Only pan if clicking on board surface, not on spaces/buttons
        if (e.target.classList.contains('space') ||
            e.target.classList.contains('board-space') ||
            e.target.closest('.space') ||
            e.target.closest('.board-space')) {
            return; // Let spaces handle their own clicks
        }

        this.isPanning = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.lastTranslateX = this.translateX;
        this.lastTranslateY = this.translateY;
        this.container.style.cursor = 'grabbing';
        e.preventDefault();
    }

    onMouseMove(e) {
        if (!this.isPanning) return;

        const deltaX = e.clientX - this.startX;
        const deltaY = e.clientY - this.startY;

        this.translateX = this.lastTranslateX + deltaX;
        this.translateY = this.lastTranslateY + deltaY;

        this.applyTransform();
    }

    onMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.container.style.cursor = 'grab';
        }
    }

    onWheel(e) {
        e.preventDefault();

        // Get mouse position relative to container
        const rect = this.container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate zoom
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * delta));

        if (newScale === this.scale) return;

        // Zoom towards mouse position
        const scaleRatio = newScale / this.scale;

        // Adjust translation to zoom towards mouse
        this.translateX = mouseX - (mouseX - this.translateX) * scaleRatio;
        this.translateY = mouseY - (mouseY - this.translateY) * scaleRatio;

        this.scale = newScale;
        this.applyTransform();
        this.updateZoomIndicator();
    }

    zoomIn() {
        const rect = this.container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const newScale = Math.min(this.maxScale, this.scale * 1.2);
        const scaleRatio = newScale / this.scale;

        this.translateX = centerX - (centerX - this.translateX) * scaleRatio;
        this.translateY = centerY - (centerY - this.translateY) * scaleRatio;

        this.scale = newScale;
        this.applyTransform();
        this.updateZoomIndicator();
    }

    zoomOut() {
        const rect = this.container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const newScale = Math.max(this.minScale, this.scale / 1.2);
        const scaleRatio = newScale / this.scale;

        this.translateX = centerX - (centerX - this.translateX) * scaleRatio;
        this.translateY = centerY - (centerY - this.translateY) * scaleRatio;

        this.scale = newScale;
        this.applyTransform();
        this.updateZoomIndicator();
    }

    recenter() {
        // Animate back to default view
        this.animateTo(0, 0, 1.0);
    }

    animateTo(targetX, targetY, targetScale, duration = 300) {
        const startX = this.translateX;
        const startY = this.translateY;
        const startScale = this.scale;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out cubic
            const ease = 1 - Math.pow(1 - progress, 3);

            this.translateX = startX + (targetX - startX) * ease;
            this.translateY = startY + (targetY - startY) * ease;
            this.scale = startScale + (targetScale - startScale) * ease;

            this.applyTransform();
            this.updateZoomIndicator();

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    applyTransform() {
        if (!this.boardSurface) return;

        this.boardSurface.style.transform =
            `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
        this.boardSurface.style.transformOrigin = '0 0';
        this.boardSurface.style.transition = 'none'; // Disable transition during pan
    }

    updateZoomIndicator() {
        if (this.zoomIndicator) {
            const percent = Math.round(this.scale * 100);
            this.zoomIndicator.textContent = `${percent}%`;
        }
    }

    destroy() {
        this.container.removeEventListener('mousedown', this.boundHandlers.mousedown);
        document.removeEventListener('mousemove', this.boundHandlers.mousemove);
        document.removeEventListener('mouseup', this.boundHandlers.mouseup);
        this.container.removeEventListener('wheel', this.boundHandlers.wheel);

        if (this.controls) {
            this.controls.remove();
        }
        if (this.zoomIndicator) {
            this.zoomIndicator.remove();
        }
    }
}
