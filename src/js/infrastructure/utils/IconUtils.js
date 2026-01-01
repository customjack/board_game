/**
 * IconUtils - Utility functions for creating SVG icons
 *
 * Provides clean, scalable SVG icons without relying on emojis or external libraries
 */

/**
 * Create an info icon (circle with 'i')
 * @param {number} size - Size of the icon in pixels
 * @param {string} color - Color of the icon
 * @returns {string} SVG HTML string
 */
export function createInfoIcon(size = 20, color = 'currentColor') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>`;
}

/**
 * Create a settings/gear icon
 * @param {number} size - Size of the icon in pixels
 * @param {string} color - Color of the icon
 * @returns {string} SVG HTML string
 */
export function createSettingsIcon(size = 20, color = 'currentColor') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M12 1v6m0 6v6m0-18l-2.5 1.5M12 1l2.5 1.5M12 7l-2.5 1.5M12 7l2.5 1.5M12 17l-2.5 1.5M12 17l2.5 1.5M12 23l-2.5-1.5M12 23l2.5-1.5"></path>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"></path>
    </svg>`;
}

/**
 * Create a simplified settings icon
 * @param {number} size - Size of the icon in pixels
 * @param {string} color - Color of the icon
 * @returns {string} SVG HTML string
 */
export function createGearIcon(size = 20, color = 'currentColor') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>`;
}

/**
 * Create an up chevron icon
 * @param {number} size - Size of the icon in pixels
 * @param {string} color - Color of the icon
 * @returns {string} SVG HTML string
 */
export function createChevronUpIcon(size = 20, color = 'currentColor') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15"></polyline>
    </svg>`;
}

/**
 * Create a down chevron icon
 * @param {number} size - Size of the icon in pixels
 * @param {string} color - Color of the icon
 * @returns {string} SVG HTML string
 */
export function createChevronDownIcon(size = 20, color = 'currentColor') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>`;
}

/**
 * Create a user icon
 * @param {number} size - Size of the icon in pixels
 * @param {string} color - Color of the icon
 * @returns {string} SVG HTML string
 */
export function createUserIcon(size = 20, color = 'currentColor') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>`;
}

/**
 * Create a close/X icon
 * @param {number} size - Size of the icon in pixels
 * @param {string} color - Color of the icon
 * @returns {string} SVG HTML string
 */
export function createCloseIcon(size = 20, color = 'currentColor') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;
}

/**
 * Create an icon button element
 * @param {string} iconHtml - SVG HTML from icon functions
 * @param {string} title - Tooltip text
 * @param {Function} onClick - Click handler
 * @param {string} className - Additional CSS classes
 * @returns {HTMLElement} Button element with icon
 */
export function createIconButton(iconHtml, title, onClick, className = '') {
    const button = document.createElement('button');
    button.className = `icon-btn ${className}`;
    button.innerHTML = iconHtml;
    button.title = title;
    button.setAttribute('aria-label', title);

    if (onClick) {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            onClick(e);
        });
    }

    return button;
}
