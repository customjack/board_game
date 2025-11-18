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
        spaceElement.style.backgroundColor = style.backgroundColor;
        spaceElement.style.color = style.color;
        spaceElement.style.borderRadius = style.borderRadius;
        spaceElement.style.zIndex = style.zIndex;

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
