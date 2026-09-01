import MapStorageManager from '../systems/storage/MapStorageManager.js';
import { getVisibleElementById } from '../infrastructure/utils/helpers.js';

/**
 * SpaceRenderer - Handles rendering of board spaces
 *
 * Creates DOM elements for individual spaces on the board
 */
export default class SpaceRenderer {
    /**
     * Create a new space renderer
     * @param {BoardRenderConfig} config - Rendering configuration
     */
    constructor(config) {
        this.config = config;
    }

    /**
     * Render a space element
     * @param {Space} space - Space to render
     * @param {HTMLElement} container - Container to append element to
     * @param {Function} onClickCallback - Optional click handler
     * @returns {HTMLElement} Created space element
     */
    render(space, container, onClickCallback = null) {
        const spaceElement = document.createElement('div');
        spaceElement.classList.add('board-space');
        spaceElement.id = `space-${space.id}`;
        spaceElement.dataset.spaceId = space.id;

        // Get style from config
        const style = this.config.getSpaceStyle(space.visualDetails);

        // Apply positioning and styling
        spaceElement.style.position = 'absolute';
        spaceElement.style.left = `${space.visualDetails.x - space.visualDetails.size / 2}px`;
        spaceElement.style.top = `${space.visualDetails.y - space.visualDetails.size / 2}px`;
        spaceElement.style.width = style.width;
        spaceElement.style.height = style.height;
        spaceElement.style.margin = '0';
        spaceElement.style.padding = '0';
        spaceElement.style.zIndex = style.zIndex;

        // Common parent styles
        spaceElement.style.display = 'flex';
        spaceElement.style.alignItems = style.alignItems || 'center';
        spaceElement.style.justifyContent = style.justifyContent || 'center';
        spaceElement.style.cursor = 'pointer';
        spaceElement.style.userSelect = 'none';
        spaceElement.style.boxSizing = 'border-box';

        // Background/Shape layer
        const bgLayer = document.createElement('div');
        bgLayer.className = 'board-space-background';
        bgLayer.style.position = 'absolute';
        bgLayer.style.inset = '0';
        bgLayer.style.margin = '0';
        bgLayer.style.boxSizing = 'border-box';
        bgLayer.style.zIndex = '0';
        bgLayer.style.borderRadius = style.borderRadius;
        if (style.clipPath) bgLayer.style.clipPath = style.clipPath;
        if (style.border) bgLayer.style.border = style.border;
        bgLayer.style.overflow = 'hidden';
        spaceElement.appendChild(bgLayer);

        // A separate overlay provides selection feedback without transforming
        // (and therefore visually moving) the space itself.
        const highlightLayer = document.createElement('div');
        highlightLayer.className = 'board-space-highlight';
        highlightLayer.style.margin = '0';
        highlightLayer.style.borderRadius = style.borderRadius;
        if (style.clipPath) highlightLayer.style.clipPath = style.clipPath;
        spaceElement.appendChild(highlightLayer);

        // Check if space has an image
        const hasImage = space.visualDetails.image || space.visualDetails.sprite?.image;
        const rawImageUrl = space.visualDetails.image || space.visualDetails.sprite?.image;
        const imageUrl = MapStorageManager.resolveCachedPluginAssetUrl(rawImageUrl);

        if (hasImage && imageUrl) {
            bgLayer.style.backgroundColor = 'transparent';

            // Create image element
            const img = document.createElement('img');
            img.src = imageUrl;
            img.addEventListener('error', () => {
                console.error('[SpaceRenderer] image failed to load', {
                    id: space.id,
                    name: space.name,
                    url: MapStorageManager.summarizeUrl(imageUrl)
                });
            });
            img.alt = space.name;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';

            // Handle sprite region if specified
            if (space.visualDetails.sprite?.region) {
                const region = space.visualDetails.sprite.region;
                img.style.objectPosition = `-${region.x}px -${region.y}px`;
                // Create a clipping container for sprite regions
                const clipContainer = document.createElement('div');
                clipContainer.style.margin = '0';
                clipContainer.style.width = '100%';
                clipContainer.style.height = '100%';
                clipContainer.style.overflow = 'hidden';
                clipContainer.style.position = 'relative';
                img.style.width = `${region.w || space.visualDetails.size}px`;
                img.style.height = `${region.h || space.visualDetails.size}px`;
                clipContainer.appendChild(img);
                bgLayer.appendChild(clipContainer);
            } else {
                bgLayer.appendChild(img);
            }
        } else {
            // Render space with background color
            bgLayer.style.backgroundColor = style.backgroundColor;
        }

        // Add space name as overlay if needed
        if (style.showLabel) {
            const label = document.createElement('div');
            label.className = 'board-space-label';
            label.textContent = space.name;
            label.style.margin = '0';
            label.style.position = 'relative';
            label.style.zIndex = '1';
            label.style.color = style.color;
            label.style.fontSize = style.fontSize || '12px';
            label.style.fontWeight = 'bold';
            // Apply text wrapping to prevent label from stretching space
            label.style.wordBreak = 'break-word';
            label.style.width = '100%';
            label.style.minWidth = '0'; // Crucial flexbox fix
            label.style.textAlign = style.textAlign || 'center';
            label.style.boxSizing = 'border-box';
            label.style.padding = '2px';
            label.style.pointerEvents = 'none';
            if (hasImage) {
                label.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
            }
            spaceElement.appendChild(label);
        }

        // Add click handler if provided
        if (onClickCallback) {
            spaceElement.addEventListener('click', () => onClickCallback(space));
        }

        container.appendChild(spaceElement);
        return spaceElement;
    }

    /**
     * Update space styling (e.g., for highlighting)
     * @param {HTMLElement} spaceElement - Space element to update
     * @param {Object} styleUpdates - Style properties to update
     */
    updateStyle(spaceElement, styleUpdates) {
        Object.assign(spaceElement.style, styleUpdates);
    }

    /**
     * Add highlight class to a space
     * @param {HTMLElement} spaceElement - Space element to highlight
     */
    highlight(spaceElement) {
        spaceElement.classList.add('highlight');
    }

    /**
     * Remove highlight class from a space
     * @param {HTMLElement} spaceElement - Space element to unhighlight
     */
    removeHighlight(spaceElement) {
        spaceElement.classList.remove('highlight');
    }

    /**
     * Get space element by space ID
     * @param {number} spaceId - Space ID
     * @returns {HTMLElement|null} Space element or null if not found
     */
    static getSpaceElement(spaceId) {
        return getVisibleElementById(`space-${spaceId}`);
    }
}
