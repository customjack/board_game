/**
 * BoardCamera - Handles pan, zoom, and viewport transformations for the board canvas
 *
 * Provides video-game style camera controls:
 * - Click-and-drag panning
 * - Zoom in/out with controls
 * - Smooth animations
 * - Viewport bounds management
 */

export default class BoardCamera {
    constructor(canvas) {
        this.canvas = canvas;

        // Camera position (top-left corner of viewport in world coordinates)
        this.x = 0;
        this.y = 0;

        // Zoom level (1.0 = 100%, 2.0 = 200% zoomed in)
        this.zoom = 1.0;
        this.minZoom = 0.25;  // 25% - can see 4x area
        this.maxZoom = 3.0;   // 300% - can see details

        // Panning state
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.cameraStartX = 0;
        this.cameraStartY = 0;

        // World bounds (will be set based on board content)
        this.worldWidth = 800;
        this.worldHeight = 600;

        // Animation state
        this.isAnimating = false;
        this.animationStartTime = 0;
        this.animationDuration = 300; // ms
        this.animationStartX = 0;
        this.animationStartY = 0;
        this.animationStartZoom = 1.0;
        this.animationTargetX = 0;
        this.animationTargetY = 0;
        this.animationTargetZoom = 1.0;

        // Event listeners
        this.boundHandlers = {};
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Mouse events for panning
        this.boundHandlers.mousedown = (e) => this.onMouseDown(e);
        this.boundHandlers.mousemove = (e) => this.onMouseMove(e);
        this.boundHandlers.mouseup = (e) => this.onMouseUp(e);
        this.boundHandlers.mouseleave = (e) => this.onMouseLeave(e);

        // Wheel for zoom (optional future feature)
        this.boundHandlers.wheel = (e) => this.onWheel(e);

        this.canvas.addEventListener('mousedown', this.boundHandlers.mousedown);
        this.canvas.addEventListener('mousemove', this.boundHandlers.mousemove);
        this.canvas.addEventListener('mouseup', this.boundHandlers.mouseup);
        this.canvas.addEventListener('mouseleave', this.boundHandlers.mouseleave);
        this.canvas.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
    }

    destroy() {
        // Clean up event listeners
        this.canvas.removeEventListener('mousedown', this.boundHandlers.mousedown);
        this.canvas.removeEventListener('mousemove', this.boundHandlers.mousemove);
        this.canvas.removeEventListener('mouseup', this.boundHandlers.mouseup);
        this.canvas.removeEventListener('mouseleave', this.boundHandlers.mouseleave);
        this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
    }

    onMouseDown(e) {
        // Check if clicking on whitespace (not on a space or UI element)
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Start panning
        this.isPanning = true;
        this.panStartX = mouseX;
        this.panStartY = mouseY;
        this.cameraStartX = this.x;
        this.cameraStartY = this.y;

        this.canvas.style.cursor = 'grabbing';
    }

    onMouseMove(e) {
        if (!this.isPanning) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate delta in screen space
        const deltaX = mouseX - this.panStartX;
        const deltaY = mouseY - this.panStartY;

        // Convert to world space (accounting for zoom)
        const worldDeltaX = deltaX / this.zoom;
        const worldDeltaY = deltaY / this.zoom;

        // Update camera position (inverted because we're moving the world, not the camera)
        this.x = this.cameraStartX - worldDeltaX;
        this.y = this.cameraStartY - worldDeltaY;

        // Clamp to world bounds
        this.clampToBounds();
    }

    onMouseUp(e) {
        this.isPanning = false;
        this.canvas.style.cursor = 'default';
    }

    onMouseLeave(e) {
        if (this.isPanning) {
            this.onMouseUp(e);
        }
    }

    onWheel(e) {
        e.preventDefault();

        // Zoom in/out with mouse wheel
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = this.zoom * zoomDelta;

        // Get mouse position in world coordinates
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Zoom towards mouse position
        this.zoomToPoint(newZoom, mouseX, mouseY);
    }

    /**
     * Set world bounds based on board content
     */
    setWorldBounds(width, height) {
        this.worldWidth = width;
        this.worldHeight = height;
        this.clampToBounds();
    }

    /**
     * Clamp camera position to world bounds
     */
    clampToBounds() {
        const viewportWidth = this.canvas.width / this.zoom;
        const viewportHeight = this.canvas.height / this.zoom;

        // Allow some padding outside bounds
        const padding = 100;

        this.x = Math.max(-padding, Math.min(this.worldWidth + padding - viewportWidth, this.x));
        this.y = Math.max(-padding, Math.min(this.worldHeight + padding - viewportHeight, this.y));
    }

    /**
     * Zoom to a specific point (usually mouse position)
     */
    zoomToPoint(newZoom, screenX, screenY) {
        // Clamp zoom
        newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));

        if (newZoom === this.zoom) return;

        // Calculate world point under mouse before zoom
        const worldX = this.x + screenX / this.zoom;
        const worldY = this.y + screenY / this.zoom;

        // Update zoom
        this.zoom = newZoom;

        // Adjust camera so world point stays under mouse
        this.x = worldX - screenX / this.zoom;
        this.y = worldY - screenY / this.zoom;

        this.clampToBounds();
    }

    /**
     * Zoom in/out from center
     */
    zoomIn() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.animateZoom(this.zoom * 1.2, centerX, centerY);
    }

    zoomOut() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.animateZoom(this.zoom / 1.2, centerX, centerY);
    }

    /**
     * Animate zoom to target
     */
    animateZoom(targetZoom, screenX, screenY) {
        // Calculate world point that should stay fixed
        const worldX = this.x + screenX / this.zoom;
        const worldY = this.y + screenY / this.zoom;

        // Clamp target zoom
        targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, targetZoom));

        // Calculate target camera position
        const targetX = worldX - screenX / targetZoom;
        const targetY = worldY - screenY / targetZoom;

        this.animateTo(targetX, targetY, targetZoom);
    }

    /**
     * Center camera on a point in world coordinates
     */
    centerOn(worldX, worldY, zoom = this.zoom) {
        const targetX = worldX - (this.canvas.width / 2) / zoom;
        const targetY = worldY - (this.canvas.height / 2) / zoom;

        this.animateTo(targetX, targetY, zoom);
    }

    /**
     * Reset camera to show entire board
     */
    recenter() {
        // Calculate zoom to fit entire board with padding
        const padding = 50;
        const zoomX = (this.canvas.width - padding * 2) / this.worldWidth;
        const zoomY = (this.canvas.height - padding * 2) / this.worldHeight;
        const fitZoom = Math.min(zoomX, zoomY, 1.0); // Don't zoom in beyond 100%

        // Center on board
        const centerX = this.worldWidth / 2;
        const centerY = this.worldHeight / 2;

        this.centerOn(centerX, centerY, fitZoom);
    }

    /**
     * Animate camera to target position and zoom
     */
    animateTo(targetX, targetY, targetZoom) {
        this.isAnimating = true;
        this.animationStartTime = performance.now();
        this.animationStartX = this.x;
        this.animationStartY = this.y;
        this.animationStartZoom = this.zoom;
        this.animationTargetX = targetX;
        this.animationTargetY = targetY;
        this.animationTargetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, targetZoom));
    }

    /**
     * Update animation (call in render loop)
     */
    update() {
        if (!this.isAnimating) return false;

        const elapsed = performance.now() - this.animationStartTime;
        const t = Math.min(elapsed / this.animationDuration, 1.0);

        // Ease-out cubic
        const ease = 1 - Math.pow(1 - t, 3);

        this.x = this.animationStartX + (this.animationTargetX - this.animationStartX) * ease;
        this.y = this.animationStartY + (this.animationTargetY - this.animationStartY) * ease;
        this.zoom = this.animationStartZoom + (this.animationTargetZoom - this.animationStartZoom) * ease;

        this.clampToBounds();

        if (t >= 1.0) {
            this.isAnimating = false;
        }

        return this.isAnimating;
    }

    /**
     * Apply camera transformation to canvas context
     */
    applyTransform(ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x, -this.y);
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        return {
            x: this.x + screenX / this.zoom,
            y: this.y + screenY / this.zoom
        };
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.x) * this.zoom,
            y: (worldY - this.y) * this.zoom
        };
    }
}
