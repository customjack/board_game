import { getVisibleElementById } from '../infrastructure/utils/helpers.js';
import MapStorageManager from '../systems/storage/MapStorageManager.js';

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
        spaceElement.style.zIndex = style.zIndex;

        // Check if space has an image
        const hasImage = space.visualDetails.image || space.visualDetails.sprite?.image;
        const rawImageUrl = space.visualDetails.image || space.visualDetails.sprite?.image;
        const imageUrl = MapStorageManager.resolveCachedPluginAssetUrl(rawImageUrl);

        if (hasImage && imageUrl) {
            // Render space with image
            spaceElement.style.backgroundColor = 'transparent';
            spaceElement.style.borderRadius = style.borderRadius;
            spaceElement.style.overflow = 'hidden';
            spaceElement.style.display = 'flex';
            spaceElement.style.alignItems = 'center';
            spaceElement.style.justifyContent = 'center';
            spaceElement.style.cursor = 'pointer';
            spaceElement.style.userSelect = 'none';

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
                clipContainer.style.width = '100%';
                clipContainer.style.height = '100%';
                clipContainer.style.overflow = 'hidden';
                clipContainer.style.position = 'relative';
                img.style.width = `${region.w || space.visualDetails.size}px`;
                img.style.height = `${region.h || space.visualDetails.size}px`;
                clipContainer.appendChild(img);
                spaceElement.appendChild(clipContainer);
            } else {
                spaceElement.appendChild(img);
            }

            // Add border if configured
            if (style.border) {
                spaceElement.style.border = style.border;
            }

            // Add space name as overlay (optional, can be hidden if image is used)
            if (space.visualDetails.showLabel !== false) {
                const label = document.createElement('div');
                label.textContent = space.name;
                label.style.position = 'absolute';
                label.style.color = style.color;
                label.style.fontSize = '12px';
                label.style.fontWeight = 'bold';
                label.style.textAlign = 'center';
                label.style.pointerEvents = 'none';
                label.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
                spaceElement.appendChild(label);
            }
        } else {
            // Render space with background color (original behavior)
            spaceElement.style.backgroundColor = style.backgroundColor;
            spaceElement.style.color = style.color;
            spaceElement.style.borderRadius = style.borderRadius;

            // Add border if configured
            if (style.border) {
                spaceElement.style.border = style.border;
            }

            // Center text
            spaceElement.style.display = 'flex';
            spaceElement.style.alignItems = 'center';
            spaceElement.style.justifyContent = 'center';
            spaceElement.style.textAlign = 'center';
            spaceElement.style.fontSize = '12px';
            spaceElement.style.fontWeight = 'bold';
            spaceElement.style.cursor = 'pointer';
            spaceElement.style.userSelect = 'none';

            // Add space name
            spaceElement.textContent = space.name;
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
