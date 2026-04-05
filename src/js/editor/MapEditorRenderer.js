import BoardViewport from '../ui/BoardViewport.js';
import BoardRenderConfig from '../rendering/BoardRenderConfig.js';

export default class MapEditorRenderer {
    constructor({
        container,
        onSelectSpace,
        onMoveSpace,
        onContextSpace,
        onToggleGrid,
        onToggleSnap,
        onToggleConnections,
        onToggleDrawConnectionMode,
        onCreateConnection,
        onSelectConnection,
        onEditConnection
    } = {}) {
        this.container = container;
        this.onSelectSpace = onSelectSpace;
        this.onMoveSpace = onMoveSpace;
        this.onContextSpace = onContextSpace;
        this.onToggleGrid = onToggleGrid;
        this.onToggleSnap = onToggleSnap;
        this.onToggleConnections = onToggleConnections;
        this.onToggleDrawConnectionMode = onToggleDrawConnectionMode;
        this.onCreateConnection = onCreateConnection;
        this.onSelectConnection = onSelectConnection;
        this.onEditConnection = onEditConnection;
        this.dragState = null;
        this.viewport = null;
        this.boardSurface = null;
        this.gridLayer = null;
        this.connectionLayer = null;
        this.connectionPreview = null;
        this.lastSpaces = [];
        this.lastGridEnabled = null;
        this.lastGridSize = null;
        this.lastOptions = {};
        this.surfaceWidth = 0;
        this.surfaceHeight = 0;
        this.debugGrid = false;
        this.gridControlAdded = false;
        this.snapControlAdded = false;
        this.connectionControlAdded = false;
        this.drawConnectionControlAdded = false;
        this.resizeHandlerAttached = false;
        this.renderConfig = typeof document !== 'undefined' ? new BoardRenderConfig() : null;
        this.lastSpaceClick = null;
        this.singleClickTimer = null;
        this.dragThreshold = 4;
    }

    render(topology, assetsByPath = {}, selectedId = null, options = {}) {
        if (!this.container) return;
        this.lastSpaces = topology?.spaces || [];
        this.lastOptions = {
            ...(options || {}),
            selectedId
        };
        this.ensureViewport();
        if (!this.boardSurface) return;

        const spaces = this.lastSpaces;
        this.boardSurface.innerHTML = '';
        this.ensureGridLayer();
        this.ensureConnectionLayer();
        this.updateSurfaceSize(spaces);
        this.applyBackground(options);
        this.syncGridControl(options.gridEnabled);
        this.syncSnapControl(options.snapEnabled);
        this.syncConnectionControl(options.showHiddenConnections);
        this.syncDrawConnectionControl(options.drawConnectionMode);

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

            element.addEventListener('click', (event) => {
                event.stopPropagation();
                const clickedSpaceId = String(space.id);
                const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
                const isDoubleClick = this.lastSpaceClick
                    && this.lastSpaceClick.spaceId === clickedSpaceId
                    && (now - this.lastSpaceClick.timestamp) < 325;
                if (isDoubleClick) {
                    if (this.singleClickTimer) {
                        clearTimeout(this.singleClickTimer);
                        this.singleClickTimer = null;
                    }
                    this.lastSpaceClick = null;
                    this.onContextSpace?.(space.id, { x: event.clientX, y: event.clientY });
                    return;
                }
                this.lastSpaceClick = {
                    spaceId: clickedSpaceId,
                    timestamp: now
                };
                if (this.singleClickTimer) {
                    clearTimeout(this.singleClickTimer);
                }
                this.singleClickTimer = setTimeout(() => {
                    this.singleClickTimer = null;
                    if (this.lastSpaceClick?.spaceId === clickedSpaceId) {
                        this.onSelectSpace?.(space.id);
                        this.lastSpaceClick = null;
                    }
                }, 250);
            });

            element.addEventListener('mousedown', (event) => {
                const clickedSpaceId = String(space.id);
                const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
                const isPendingDoubleClick = this.lastSpaceClick
                    && this.lastSpaceClick.spaceId === clickedSpaceId
                    && (now - this.lastSpaceClick.timestamp) < 325;
                if (isPendingDoubleClick) {
                    return;
                }
                const isConnectionDrag = this.lastOptions?.drawConnectionMode || event.ctrlKey || event.metaKey;
                if (isConnectionDrag && this.onCreateConnection) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.startConnectionDrag(space, event);
                    return;
                }
                if (!this.onMoveSpace) return;
                this.dragState = {
                    mode: 'move',
                    spaceId: space.id,
                    startX: event.clientX,
                    startY: event.clientY,
                    originX: x,
                    originY: y,
                    element,
                    isDragging: false
                };
                document.addEventListener('mousemove', this.handleMouseMove);
                document.addEventListener('mouseup', this.handleMouseUp);
            });

            this.boardSurface.appendChild(element);
        });

        const highlightedConnectionIds = options.selectedConnection
            ? [options.selectedConnection.fromId, options.selectedConnection.toId]
            : [];
        this.updateSpaceHighlighting(selectedId, highlightedConnectionIds);
        this.renderConnections(spaces, selectedId, options);
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
                <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                    <rect x="5" y="5" width="90" height="90" fill="none" stroke="currentColor" stroke-width="10"></rect>
                    <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" stroke-width="10"></line>
                    <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" stroke-width="10"></line>
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
        if (this.viewport && this.onToggleSnap && !this.snapControlAdded) {
            const snapIcon = `
                <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                    <path d="M22 18h22v18H30v12h14v18H22z" fill="currentColor"></path>
                    <path d="M78 82H56V64h14V52H56V34h22z" fill="currentColor"></path>
                    <line x1="42" y1="58" x2="58" y2="42" stroke="currentColor" stroke-width="10" stroke-linecap="round"></line>
                </svg>
            `;
            this.viewport.addControl({
                id: 'snap-toggle',
                title: 'Toggle grid lock',
                html: snapIcon,
                className: 'snap-toggle',
                onClick: () => this.onToggleSnap(),
                afterSelector: '.grid-toggle'
            });
            this.snapControlAdded = true;
        }
        if (this.viewport && this.onToggleConnections && !this.connectionControlAdded) {
            const connectionIcon = `
                <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                    <circle cx="24" cy="24" r="12" fill="currentColor"></circle>
                    <circle cx="76" cy="76" r="12" fill="currentColor"></circle>
                    <path d="M34 34 L66 66" stroke="currentColor" stroke-width="10" stroke-linecap="round"></path>
                    <path d="M58 66 L66 66 L66 58" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
            `;
            this.viewport.addControl({
                id: 'connections-toggle',
                title: 'Toggle connection visibility',
                html: connectionIcon,
                className: 'connections-toggle',
                onClick: () => this.onToggleConnections(),
                afterSelector: '.snap-toggle'
            });
            this.connectionControlAdded = true;
        }
        if (this.viewport && this.onToggleDrawConnectionMode && !this.drawConnectionControlAdded) {
            const drawConnectionIcon = `
                <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                    <circle cx="22" cy="22" r="12" fill="currentColor"></circle>
                    <circle cx="78" cy="78" r="12" fill="currentColor"></circle>
                    <path d="M30 30 L68 68" stroke="currentColor" stroke-width="10" stroke-linecap="round"></path>
                    <path d="M54 68 L68 68 L68 54" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
            `;
            this.viewport.addControl({
                id: 'draw-connections-toggle',
                title: 'Toggle draw connections mode',
                html: drawConnectionIcon,
                className: 'draw-connections-toggle',
                onClick: () => this.onToggleDrawConnectionMode(),
                afterSelector: '.connections-toggle'
            });
            this.drawConnectionControlAdded = true;
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

    ensureConnectionLayer() {
        if (!this.boardSurface) return;
        if (!this.connectionLayer) {
            this.connectionLayer = document.createElement('div');
            this.connectionLayer.className = 'map-editor-connection-layer';
        }
        if (this.connectionLayer.parentElement !== this.boardSurface) {
            this.boardSurface.prepend(this.connectionLayer);
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

    syncSnapControl(isEnabled) {
        if (!this.viewport) return;
        this.viewport.setControlActive('snap-toggle', Boolean(isEnabled));
    }

    syncConnectionControl(isEnabled) {
        if (!this.viewport) return;
        this.viewport.setControlActive('connections-toggle', Boolean(isEnabled));
    }

    syncDrawConnectionControl(isEnabled) {
        if (!this.viewport) return;
        this.viewport.setControlActive('draw-connections-toggle', Boolean(isEnabled));
    }

    renderConnections(spaces, selectedId, options = {}) {
        if (!this.connectionLayer) return;
        this.connectionLayer.innerHTML = '';

        const spaceById = new Map(spaces.map((space) => [String(space.id), space]));
        const drawnPairs = new Set();
        const tempPositions = options.tempPositions || {};
        spaces.forEach((space) => {
            const fromPosition = tempPositions[String(space.id)] || space.position || {};
            const fromX = fromPosition.x ?? 0;
            const fromY = fromPosition.y ?? 0;
            (space.connections || []).forEach((connection) => {
                const isHiddenInGame = connection.draw === false || connection.drawConnection === false;
                if (isHiddenInGame && !options.showHiddenConnections) {
                    return;
                }
                const target = spaceById.get(String(connection.targetId));
                if (!target) return;
                const targetPosition = tempPositions[String(target.id)] || target.position || {};
                const toX = targetPosition.x ?? 0;
                const toY = targetPosition.y ?? 0;
                const matchesSelectedSpace = selectedId !== null
                    && selectedId !== undefined
                    && (String(space.id) === String(selectedId) || String(target.id) === String(selectedId));
                const matchesSelectedConnection = options.selectedConnection
                    && String(options.selectedConnection.fromId) === String(space.id)
                    && String(options.selectedConnection.toId) === String(connection.targetId);
                const hasReverse = (target.connections || []).some((reverseConnection) => String(reverseConnection.targetId) === String(space.id));
                const pairKey = [String(space.id), String(target.id)].sort().join('::');
                if (hasReverse && drawnPairs.has(pairKey)) {
                    return;
                }
                drawnPairs.add(pairKey);
                const element = this.createConnectionElement(fromX, fromY, toX, toY, {
                    highlighted: matchesSelectedSpace || matchesSelectedConnection,
                    hiddenInGame: isHiddenInGame,
                    color: connection.color,
                    bidirectional: hasReverse,
                    fromId: space.id,
                    toId: connection.targetId
                });
                if (element) {
                    this.connectionLayer.appendChild(element);
                }
            });
        });

        if (this.connectionPreview) {
            this.connectionLayer.appendChild(this.connectionPreview);
        }
    }

    createConnectionElement(fromX, fromY, toX, toY, {
        highlighted = false,
        hiddenInGame = false,
        color = null,
        bidirectional = false,
        fromId = null,
        toId = null
    } = {}) {
        const length = Math.hypot(toX - fromX, toY - fromY);
        if (!length) return null;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const config = this.renderConfig || new BoardRenderConfig();
        const connectionColor = color || config.connectionColor || '#333333';
        const arrowColor = color || config.arrowColor || config.connectionColor || '#333333';
        const thickness = config.connectionThickness || 2;
        const wrapper = document.createElement('div');
        wrapper.className = 'map-editor-connection';
        if (highlighted) {
            wrapper.classList.add('selected');
        }
        if (hiddenInGame) {
            wrapper.classList.add('editor-hidden');
        }

        const hitbox = document.createElement('button');
        hitbox.type = 'button';
        hitbox.className = 'map-editor-connection-hitbox';
        hitbox.style.width = `${length}px`;
        hitbox.style.left = `${fromX}px`;
        hitbox.style.top = `${fromY}px`;
        hitbox.style.transform = `translateY(-50%) rotate(${angle}rad)`;
        if (fromId !== null && toId !== null) {
            hitbox.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.onSelectConnection?.(fromId, toId);
            });
            hitbox.addEventListener('dblclick', (event) => {
                event.stopPropagation();
                this.onEditConnection?.(fromId, toId, { x: event.clientX, y: event.clientY });
            });
        }
        wrapper.appendChild(hitbox);

        const line = document.createElement('div');
        line.className = 'map-editor-connection-line';
        line.style.width = `${length}px`;
        line.style.height = `${thickness}px`;
        line.style.left = `${(fromX + toX) / 2 - length / 2}px`;
        line.style.top = `${(fromY + toY) / 2 - thickness / 2}px`;
        line.style.transform = `rotate(${angle}rad)`;
        line.style.transformOrigin = 'center';
        line.style.background = connectionColor;
        wrapper.appendChild(line);

        const appendArrow = (x1, y1, x2, y2, position) => {
            const arrowAngle = Math.atan2(y2 - y1, x2 - x1);
            const arrowX = x1 + (x2 - x1) * position;
            const arrowY = y1 + (y2 - y1) * position;
            const arrow = document.createElement('div');
            arrow.className = 'map-editor-connection-arrow';
            arrow.style.left = `${arrowX}px`;
            arrow.style.top = `${arrowY}px`;
            arrow.style.transform = `translate(-50%, -50%) rotate(${arrowAngle}rad) rotate(-90deg)`;
            arrow.style.borderLeftWidth = `${config.arrowSize / 2}px`;
            arrow.style.borderRightWidth = `${config.arrowSize / 2}px`;
            arrow.style.borderTopWidth = `${config.arrowSize}px`;
            arrow.style.borderTopColor = arrowColor;
            wrapper.appendChild(arrow);
        };

        if (bidirectional) {
            appendArrow(fromX, fromY, toX, toY, config.arrowPositionBidirectional || 0.55);
            appendArrow(toX, toY, fromX, fromY, config.arrowPositionBidirectional || 0.55);
        } else {
            appendArrow(fromX, fromY, toX, toY, config.arrowPositionSingle || 0.5);
        }

        return wrapper;
    }

    startConnectionDrag(space, event) {
        const point = this.toBoardCoordinates(event.clientX, event.clientY);
        this.dragState = {
            mode: 'connect',
            spaceId: space.id,
            originX: space.position?.x ?? 0,
            originY: space.position?.y ?? 0,
            nextX: point.x,
            nextY: point.y,
            hoverTargetId: null
        };
        this.updateSpaceHighlighting(space.id, [space.id]);
        this.updateConnectionPreview(this.dragState.originX, this.dragState.originY, point.x, point.y);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
    }

    updateConnectionPreview(fromX, fromY, toX, toY) {
        this.connectionPreview = this.createConnectionElement(fromX, fromY, toX, toY, {});
        if (this.connectionPreview) {
            this.connectionPreview.classList.add('preview');
        }
        this.renderConnections(this.lastSpaces, null, this.lastOptions);
    }

    clearConnectionPreview() {
        this.connectionPreview = null;
        const highlightedConnectionIds = this.lastOptions?.selectedConnection
            ? [this.lastOptions.selectedConnection.fromId, this.lastOptions.selectedConnection.toId]
            : [];
        this.updateSpaceHighlighting(this.lastOptions?.selectedId || null, highlightedConnectionIds);
        this.renderConnections(this.lastSpaces, this.lastOptions?.selectedId || null, this.lastOptions);
    }

    toBoardCoordinates(clientX, clientY) {
        const rect = this.container?.getBoundingClientRect();
        const scale = this.viewport?.scale || 1;
        const translateX = this.viewport?.translateX || 0;
        const translateY = this.viewport?.translateY || 0;
        if (!rect) {
            return { x: 0, y: 0 };
        }
        return {
            x: (clientX - rect.left - translateX) / scale,
            y: (clientY - rect.top - translateY) / scale
        };
    }

    shouldSnap(event) {
        return Boolean(this.lastOptions?.snapEnabled || event.shiftKey);
    }

    snapCoordinate(value) {
        const gridSize = this.lastOptions?.gridSize || 50;
        return Math.round(value / gridSize) * gridSize;
    }

    handleMouseMove = (event) => {
        if (!this.dragState) return;
        if (this.dragState.mode === 'connect') {
            const point = this.toBoardCoordinates(event.clientX, event.clientY);
            this.dragState.nextX = point.x;
            this.dragState.nextY = point.y;
            const hoverSpace = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.map-editor-space');
            this.dragState.hoverTargetId = hoverSpace?.dataset?.spaceId || null;
            const highlightedIds = [this.dragState.spaceId];
            if (this.dragState.hoverTargetId) {
                highlightedIds.push(this.dragState.hoverTargetId);
            }
            this.updateSpaceHighlighting(this.dragState.spaceId, highlightedIds);
            this.updateConnectionPreview(this.dragState.originX, this.dragState.originY, point.x, point.y);
            return;
        }

        const scale = this.viewport?.scale || 1;
        const deltaX = (event.clientX - this.dragState.startX) / scale;
        const deltaY = (event.clientY - this.dragState.startY) / scale;
        const movedEnough = Math.abs(deltaX) >= this.dragThreshold || Math.abs(deltaY) >= this.dragThreshold;
        if (!this.dragState.isDragging && !movedEnough) {
            return;
        }
        this.dragState.isDragging = true;
        let nextX = this.dragState.originX + deltaX;
        let nextY = this.dragState.originY + deltaY;
        if (this.shouldSnap(event)) {
            nextX = this.snapCoordinate(nextX);
            nextY = this.snapCoordinate(nextY);
        }
        const size = parseFloat(this.dragState.element.style.width) || 50;
        this.dragState.element.style.left = `${nextX - size / 2}px`;
        this.dragState.element.style.top = `${nextY - size / 2}px`;
        this.dragState.nextX = nextX;
        this.dragState.nextY = nextY;
        this.updateSpaceHighlighting(this.dragState.spaceId, [this.dragState.spaceId]);
        this.renderConnections(this.lastSpaces, this.dragState.spaceId, {
            ...this.lastOptions,
            tempPositions: {
                [String(this.dragState.spaceId)]: { x: nextX, y: nextY }
            }
        });
    };

    handleMouseUp = (event) => {
        if (!this.dragState) return;
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        if (this.dragState.mode === 'connect') {
            const targetElement = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.map-editor-space');
            const targetId = targetElement?.dataset?.spaceId;
            if (this.onCreateConnection && targetId && String(targetId) !== String(this.dragState.spaceId)) {
                this.onCreateConnection(this.dragState.spaceId, targetId);
            }
            this.dragState = null;
            this.clearConnectionPreview();
            return;
        }
        if (this.dragState.isDragging && this.onMoveSpace && this.dragState.nextX !== undefined) {
            this.onMoveSpace(this.dragState.spaceId, {
                x: Math.round(this.dragState.nextX),
                y: Math.round(this.dragState.nextY)
            });
            this.onSelectSpace?.(this.dragState.spaceId);
        }
        this.dragState = null;
    };

    updateSpaceHighlighting(selectedId = null, extraIds = []) {
        if (!this.boardSurface) return;
        const activeIds = new Set(
            [selectedId, ...extraIds]
                .filter((value) => value !== null && value !== undefined)
                .map((value) => String(value))
        );
        Array.from(this.boardSurface.querySelectorAll('.map-editor-space')).forEach((element) => {
            element.classList.toggle('selected', activeIds.has(String(element.dataset.spaceId)));
        });
    }
}
