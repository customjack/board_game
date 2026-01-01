import BoardViewport from '../ui/BoardViewport.js';

export default class MapEditorRenderer {
    constructor({ container, onSelectSpace, onMoveSpace, onContextSpace, onToggleGrid } = {}) {
        this.container = container;
        this.onSelectSpace = onSelectSpace;
        this.onMoveSpace = onMoveSpace;
        this.onContextSpace = onContextSpace;
        this.onToggleGrid = onToggleGrid;
        this.dragState = null;
        this.viewport = null;
        this.boardSurface = null;
        this.lastSpaces = [];
        this.gridControlAdded = false;
        this.resizeHandlerAttached = false;
    }

    render(topology, assetsByPath = {}, selectedId = null, options = {}) {
        if (!this.container) return;
        this.lastSpaces = topology?.spaces || [];
        this.ensureViewport();
        if (!this.boardSurface) return;

        this.boardSurface.innerHTML = '';

        const spaces = this.lastSpaces;
        this.updateSurfaceSize(spaces);
        this.applyBackground(options);
        this.syncGridControl(options.gridEnabled);

        spaces.forEach((space) => {
            const element = document.createElement('div');
            element.className = 'map-editor-space';
            element.dataset.spaceId = space.id;

            const size = space.visual?.size || 50;
            const x = space.position?.x ?? 0;
            const y = space.position?.y ?? 0;

            element.style.width = `${size}px`;
            element.style.height = `${size}px`;
            element.style.left = `${x - size / 2}px`;
            element.style.top = `${y - size / 2}px`;
            element.style.backgroundColor = space.visual?.color || '#2a2a2a';
            element.style.color = space.visual?.textColor || '#ffffff';

            const imagePath = space.visual?.image;
            const imageUrl = imagePath ? assetsByPath[imagePath] : null;
            if (imageUrl) {
                element.style.backgroundImage = `url(${imageUrl})`;
                element.style.backgroundSize = 'cover';
                element.style.backgroundPosition = 'center';
            }

            element.textContent = space.name || space.id || 'Space';

            if (selectedId && space.id === selectedId) {
                element.style.boxShadow = '0 0 0 2px var(--primary-color, #4a90e2)';
            }

            element.addEventListener('click', (event) => {
                event.stopPropagation();
                if (this.onSelectSpace) {
                    this.onSelectSpace(space.id);
                }
            });

            element.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (this.onContextSpace) {
                    this.onContextSpace(space.id, { x: event.clientX, y: event.clientY });
                }
            });

            element.addEventListener('mousedown', (event) => {
                if (!this.onMoveSpace) return;
                event.preventDefault();
                this.dragState = {
                    spaceId: space.id,
                    startX: event.clientX,
                    startY: event.clientY,
                    originX: x,
                    originY: y,
                    element
                };
                document.addEventListener('mousemove', this.handleMouseMove);
                document.addEventListener('mouseup', this.handleMouseUp);
            });

            this.boardSurface.appendChild(element);
        });
    }

    ensureViewport() {
        if (!this.container) return;
        if (!this.viewport) {
            this.container.innerHTML = '';
            this.viewport = new BoardViewport(this.container);
        }
        if (!this.boardSurface) {
            this.boardSurface = document.createElement('div');
            this.boardSurface.className = 'map-editor-render-surface';
            if (this.container.firstChild) {
                this.container.insertBefore(this.boardSurface, this.container.firstChild);
            } else {
                this.container.appendChild(this.boardSurface);
            }
            this.viewport.setBoardSurface(this.boardSurface);
        }
        if (this.viewport && this.onToggleGrid && !this.gridControlAdded) {
            const gridIcon = `
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"></rect>
                    <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" stroke-width="2"></line>
                    <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2"></line>
                </svg>
            `;
            this.viewport.addControl({
                id: 'grid-toggle',
                title: 'Toggle grid',
                html: gridIcon,
                className: 'grid-toggle',
                onClick: () => this.onToggleGrid(),
                afterSelector: '.zoom-out'
            });
            this.gridControlAdded = true;
        }
        if (!this.resizeHandlerAttached && typeof window !== 'undefined') {
            this.resizeHandlerAttached = true;
            window.addEventListener('resize', () => this.updateSurfaceSize(this.lastSpaces));
        }
    }

    updateSurfaceSize(spaces) {
        if (!this.boardSurface) return;
        const padding = 200;
        let maxX = 0;
        let maxY = 0;
        spaces.forEach((space) => {
            const size = space.visual?.size || 50;
            const x = space.position?.x ?? 0;
            const y = space.position?.y ?? 0;
            maxX = Math.max(maxX, x + size + padding);
            maxY = Math.max(maxY, y + size + padding);
        });
        const containerWidth = this.container?.clientWidth || 0;
        const containerHeight = this.container?.clientHeight || 0;
        const width = Math.max(800, maxX, containerWidth);
        const height = Math.max(600, maxY, containerHeight);
        const nextWidth = `${width}px`;
        const nextHeight = `${height}px`;
        if (this.boardSurface.style.width !== nextWidth) {
            this.boardSurface.style.width = nextWidth;
        }
        if (this.boardSurface.style.height !== nextHeight) {
            this.boardSurface.style.height = nextHeight;
        }
    }

    applyBackground({ backgroundUrl, gridEnabled, gridSize = 50 } = {}) {
        if (!this.boardSurface) return;
        const layers = [];
        const sizes = [];
        const positions = [];
        const repeats = [];

        if (gridEnabled) {
            const gridColor = 'rgba(255, 255, 255, 0.22)';
            const grid = `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`;
            layers.push(grid);
            sizes.push(`${gridSize}px ${gridSize}px`);
            positions.push('0 0');
            repeats.push('repeat');
        }

        if (backgroundUrl) {
            layers.push(`url(${backgroundUrl})`);
            sizes.push('cover');
            positions.push('center');
            repeats.push('no-repeat');
        }

        this.boardSurface.style.backgroundImage = layers.join(', ');
        this.boardSurface.style.backgroundSize = sizes.join(', ');
        this.boardSurface.style.backgroundPosition = positions.join(', ');
        this.boardSurface.style.backgroundRepeat = repeats.join(', ');
        this.boardSurface.style.backgroundColor = 'transparent';
    }

    syncGridControl(isEnabled) {
        if (!this.viewport) return;
        this.viewport.setControlActive('grid-toggle', Boolean(isEnabled));
    }

    handleMouseMove = (event) => {
        if (!this.dragState) return;
        const scale = this.viewport?.scale || 1;
        const deltaX = (event.clientX - this.dragState.startX) / scale;
        const deltaY = (event.clientY - this.dragState.startY) / scale;
        const nextX = this.dragState.originX + deltaX;
        const nextY = this.dragState.originY + deltaY;
        const size = parseFloat(this.dragState.element.style.width) || 50;
        this.dragState.element.style.left = `${nextX - size / 2}px`;
        this.dragState.element.style.top = `${nextY - size / 2}px`;
        this.dragState.nextX = nextX;
        this.dragState.nextY = nextY;
    };

    handleMouseUp = () => {
        if (!this.dragState) return;
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        if (this.onMoveSpace && this.dragState.nextX !== undefined) {
            this.onMoveSpace(this.dragState.spaceId, {
                x: Math.round(this.dragState.nextX),
                y: Math.round(this.dragState.nextY)
            });
        }
        this.dragState = null;
    };
}
