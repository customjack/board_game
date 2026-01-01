export default class MapEditorRenderer {
    constructor({ container, onSelectSpace, onMoveSpace, onContextSpace } = {}) {
        this.container = container;
        this.onSelectSpace = onSelectSpace;
        this.onMoveSpace = onMoveSpace;
        this.onContextSpace = onContextSpace;
        this.dragState = null;
    }

    render(topology, assetsByPath = {}, selectedId = null) {
        if (!this.container) return;
        this.container.innerHTML = '';

        const spaces = topology?.spaces || [];

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

            this.container.appendChild(element);
        });
    }

    handleMouseMove = (event) => {
        if (!this.dragState) return;
        const deltaX = event.clientX - this.dragState.startX;
        const deltaY = event.clientY - this.dragState.startY;
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
