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
        this.gridLayer = null;
        this.lastSpaces = [];
        this.lastGridEnabled = null;
        this.lastGridSize = null;
        this.surfaceWidth = 0;
        this.surfaceHeight = 0;
        this.debugGrid = false;
        this.gridControlAdded = false;
        this.resizeHandlerAttached = false;
    }

    render(topology, assetsByPath = {}, selectedId = null, options = {}) {
        if (!this.container) return;
        this.lastSpaces = topology?.spaces || [];
        this.ensureViewport();
        if (!this.boardSurface) return;

        this.boardSurface.innerHTML = '';
        this.ensureGridLayer();

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
        this.ensureGridLayer();
        if (this.viewport && this.onToggleGrid && !this.gridControlAdded) {
            const gridIcon = `
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"></rect>
                    <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="square"></line>
                    <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="square"></line>
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

    ensureGridLayer() {
        if (!this.boardSurface) return;
        if (!this.gridLayer) {
            this.gridLayer = document.createElement('div');
            this.gridLayer.className = 'map-editor-grid-layer';
        }
        if (this.gridLayer.parentElement !== this.boardSurface) {
            this.boardSurface.prepend(this.gridLayer);
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
        this.surfaceWidth = width;
        this.surfaceHeight = height;
        this.updateGridLayerSize();
    }

    applyBackground({ backgroundUrl, gridEnabled, gridSize = 50 } = {}) {
        if (!this.boardSurface) return;
        if (this.gridLayer) {
            if (gridEnabled) {
                const gridColor = 'var(--map-editor-grid-color, rgba(0, 0, 0, 0.35))';
                const lineWidth = 2;
                const grid = [
                    `repeating-linear-gradient(0deg, ${gridColor} 0, ${gridColor} ${lineWidth}px, transparent ${lineWidth}px, transparent ${gridSize}px)`,
                    `repeating-linear-gradient(90deg, ${gridColor} 0, ${gridColor} ${lineWidth}px, transparent ${lineWidth}px, transparent ${gridSize}px)`
                ];
                this.gridLayer.style.display = 'block';
                this.gridLayer.style.backgroundImage = grid.join(', ');
                this.gridLayer.style.backgroundSize = `${gridSize}px ${gridSize}px`;
                this.gridLayer.style.backgroundPosition = '0 0';
                this.gridLayer.style.outline = this.debugGrid ? '1px dashed rgba(255, 255, 255, 0.35)' : 'none';
                this.lastGridSize = gridSize;
                this.updateGridLayerSize();
            } else {
                this.gridLayer.style.display = 'none';
                this.gridLayer.style.backgroundImage = '';
                this.gridLayer.style.backgroundSize = '';
                this.gridLayer.style.backgroundPosition = '';
                this.gridLayer.style.outline = 'none';
            }
        }

        const layers = [];
        const sizes = [];
        const positions = [];
        const repeats = [];
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

        if (gridEnabled !== this.lastGridEnabled) {
            this.lastGridEnabled = gridEnabled;
            console.debug('[MapEditor] Grid state', {
                enabled: gridEnabled,
                gridSize,
                surface: {
                    width: this.boardSurface?.style.width,
                    height: this.boardSurface?.style.height
                }
            });
        }
    }

    updateGridLayerSize() {
        if (!this.gridLayer) return;
        const gridSize = this.lastGridSize || 50;
        const buffer = gridSize * 200;
        const containerWidth = this.container?.clientWidth || 0;
        const containerHeight = this.container?.clientHeight || 0;
        const baseWidth = Math.max(this.surfaceWidth || 0, containerWidth);
        const baseHeight = Math.max(this.surfaceHeight || 0, containerHeight);
        const width = baseWidth + buffer * 2;
        const height = baseHeight + buffer * 2;
        const nextWidth = `${width}px`;
        const nextHeight = `${height}px`;
        if (this.gridLayer.style.width !== nextWidth) {
            this.gridLayer.style.width = nextWidth;
        }
        if (this.gridLayer.style.height !== nextHeight) {
            this.gridLayer.style.height = nextHeight;
        }
        const nextLeft = `-${buffer}px`;
        const nextTop = `-${buffer}px`;
        if (this.gridLayer.style.left !== nextLeft) {
            this.gridLayer.style.left = nextLeft;
        }
        if (this.gridLayer.style.top !== nextTop) {
            this.gridLayer.style.top = nextTop;
        }
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
