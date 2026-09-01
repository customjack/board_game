import MapStorageManager from '../systems/storage/MapStorageManager.js';

export function calculateBoardSurfaceSize(
    spaces = [],
    decorations = [],
    { minimumWidth = 800, minimumHeight = 600, padding = 200 } = {}
) {
    let maxX = 0;
    let maxY = 0;
    spaces.forEach((space) => {
        const position = space.position || space.visualDetails || {};
        const visual = space.visual || space.visualDetails || {};
        const x = Number(position.x) || 0;
        const y = Number(position.y) || 0;
        const size = Math.max(10, Number(visual.size) || 50);
        maxX = Math.max(maxX, x + size + padding);
        maxY = Math.max(maxY, y + size + padding);
    });
    decorations.forEach((decoration) => {
        const x = Number(decoration.x) || 0;
        const y = Number(decoration.y) || 0;
        const width = Math.max(10, Number(decoration.width) || 200);
        const height = Math.max(10, Number(decoration.height) || 200);
        maxX = Math.max(maxX, x + width / 2 + padding);
        maxY = Math.max(maxY, y + height / 2 + padding);
    });
    return {
        width: Math.max(minimumWidth, maxX),
        height: Math.max(minimumHeight, maxY)
    };
}

export function applyBoardSurfaceSize(surface, width, height) {
    if (!surface) return;
    const widthValue = `${width}px`;
    const heightValue = `${height}px`;
    surface.style.width = widthValue;
    surface.style.minWidth = widthValue;
    surface.style.maxWidth = widthValue;
    surface.style.height = heightValue;
    surface.style.minHeight = heightValue;
    surface.style.maxHeight = heightValue;
    surface.style.boxSizing = 'border-box';
    surface.style.margin = '0';
    surface.style.padding = '0';
    surface.style.flex = '0 0 auto';
}

export function normalizeBackgroundConfig(renderConfig = {}) {
    const fit = ['contain', 'cover', 'fill', 'none'].includes(renderConfig.backgroundFit)
        ? renderConfig.backgroundFit
        : 'contain';
    const scale = Number(renderConfig.backgroundScale);
    const positionX = Number(renderConfig.backgroundPositionX);
    const positionY = Number(renderConfig.backgroundPositionY);
    return {
        fit,
        scale: Number.isFinite(scale) ? Math.max(10, Math.min(400, scale)) : 100,
        positionX: Number.isFinite(positionX) ? Math.max(0, Math.min(100, positionX)) : 50,
        positionY: Number.isFinite(positionY) ? Math.max(0, Math.min(100, positionY)) : 50
    };
}

export function createBoardBackground(imageUrl, renderConfig = {}, className = 'board-background-image') {
    if (!imageUrl) return null;
    const config = normalizeBackgroundConfig(renderConfig);
    const wrapper = document.createElement('div');
    wrapper.className = className;
    wrapper.style.position = 'absolute';
    wrapper.style.inset = '0';
    wrapper.style.margin = '0';
    wrapper.style.overflow = 'hidden';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.zIndex = '0';

    const image = document.createElement('img');
    image.className = `${className}-image`;
    image.src = imageUrl;
    image.alt = '';
    image.draggable = false;
    image.style.position = 'absolute';
    image.style.inset = '0';
    image.style.width = '100%';
    image.style.height = '100%';
    image.style.margin = '0';
    image.style.objectFit = config.fit;
    image.style.objectPosition = `${config.positionX}% ${config.positionY}%`;
    image.style.transform = `scale(${config.scale / 100})`;
    image.style.transformOrigin = `${config.positionX}% ${config.positionY}%`;
    image.style.pointerEvents = 'none';
    image.style.userSelect = 'none';
    wrapper.appendChild(image);
    return wrapper;
}

export function createBoardDecoration(decoration, imageUrl = null, className = 'board-decoration') {
    const resolvedUrl = imageUrl || MapStorageManager.resolveCachedPluginAssetUrl(decoration?.image);
    if (!decoration || !resolvedUrl) return null;
    const width = Math.max(10, Number(decoration.width) || 200);
    const height = Math.max(10, Number(decoration.height) || 200);
    const x = Number(decoration.x) || 0;
    const y = Number(decoration.y) || 0;
    const rotation = Number(decoration.rotation) || 0;
    const opacity = Number.isFinite(Number(decoration.opacity))
        ? Math.max(0, Math.min(1, Number(decoration.opacity)))
        : 1;

    const element = document.createElement('div');
    element.className = className;
    element.dataset.decorationId = decoration.id;
    element.style.position = 'absolute';
    element.style.left = `${x - width / 2}px`;
    element.style.top = `${y - height / 2}px`;
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.margin = '0';
    element.style.transform = `rotate(${rotation}deg)`;
    element.style.transformOrigin = 'center';
    element.style.opacity = opacity.toString();
    element.style.pointerEvents = 'none';
    element.style.zIndex = '0';

    const image = document.createElement('img');
    image.src = resolvedUrl;
    image.alt = decoration.name || '';
    image.draggable = false;
    image.style.display = 'block';
    image.style.width = '100%';
    image.style.height = '100%';
    image.style.margin = '0';
    image.style.objectFit = decoration.fit || 'contain';
    image.style.pointerEvents = 'none';
    element.appendChild(image);
    return element;
}

export function renderBoardDecorations(container, decorations = [], assetsByPath = {}) {
    return decorations.map((decoration) => {
        const imageUrl = assetsByPath[decoration.image]
            || MapStorageManager.resolveCachedPluginAssetUrl(decoration.image);
        const element = createBoardDecoration(decoration, imageUrl);
        if (element) container.appendChild(element);
        return element;
    }).filter(Boolean);
}
