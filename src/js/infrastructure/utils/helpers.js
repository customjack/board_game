// utils/helpers.js

/**
 * Generates a color palette of soft pastel colors.
 * @param {number} size - The number of colors to generate in the palette.
 * @returns {string[]} An array of HSL color strings.
 */
export function generateColorPalette(size) {
    const colors = [];
    for (let i = 0; i < size; i++) {
        const hue = (i * 360 / size) % 360; // Spread hues across 360 degrees
        const saturation = 70; // Lower saturation for softer colors
        const lightness = 80;  // Higher lightness for a pastel effect
        colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`); // Soft pastel colors
    }
    return colors;
}

/**
 * Hashes a peer ID to map it to a color index in the palette.
 * @param {string} peerId - The peer ID to hash.
 * @param {number} paletteLength - The length of the color palette.
 * @returns {number} The index of the color in the palette.
 */
export function hashPeerId(peerId, paletteLength) {
    let hash = 0;
    for (let i = 0; i < peerId.length; i++) {
        const char = peerId.charCodeAt(i);
        hash = (hash * 31 + char) % 1000; // Simple hash function
    }
    return Math.abs(hash) % paletteLength; // Map the hash to a color index in the palette
}

/**
 * Utility function to create a darker version of a given color.
 * Handles both hex and HSL color formats.
 * @param {string} color - The original color in hex or HSL format.
 * @param {number} factor - The darkening factor (0 to 1, where 1 is the same color).
 * @returns {string} - The darker color in hex format.
 */
export function darkenColor(color, factor) {
    if (color.startsWith('hsl')) {
        // Convert HSL to RGB
        const rgb = hslToRgb(color);
        return darkenRgbColor(rgb, factor);
    } else {
        // Assuming it's a hex color
        return darkenHexColor(color, factor);
    }
}

/**
 * Function to darken an RGB color.
 * @param {Object} rgb - An object with r, g, b components.
 * @param {number} factor - The darkening factor.
 * @returns {string} - The darkened color in hex format.
 */
function darkenRgbColor({ r, g, b }, factor) {
    const darkenedR = Math.floor(r * factor);
    const darkenedG = Math.floor(g * factor);
    const darkenedB = Math.floor(b * factor);
    return `#${componentToHex(darkenedR)}${componentToHex(darkenedG)}${componentToHex(darkenedB)}`;
}

/**
 * Function to convert HSL color to RGB.
 * @param {string} hsl - The HSL color string.
 * @returns {Object} - An object containing the r, g, b components.
 */
function hslToRgb(hsl) {
    const [h, s, l] = hsl.match(/\d+/g).map(Number);
    const lightness = l / 100;
    const saturation = s / 100;
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = chroma * (1 - Math.abs((h / 60) % 2 - 1));
    const m = lightness - chroma / 2;
    let [r, g, b] = [0, 0, 0];

    if (h >= 0 && h < 60) [r, g, b] = [chroma, x, 0];
    else if (h >= 60 && h < 120) [r, g, b] = [x, chroma, 0];
    else if (h >= 120 && h < 180) [r, g, b] = [0, chroma, x];
    else if (h >= 180 && h < 240) [r, g, b] = [0, x, chroma];
    else if (h >= 240 && h < 300) [r, g, b] = [x, 0, chroma];
    else if (h >= 300 && h < 360) [r, g, b] = [chroma, 0, x];

    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255),
    };
}

/**
 * Helper function to darken a hex color.
 * @param {string} hexColor - The hex color string.
 * @param {number} factor - The darkening factor.
 * @returns {string} - The darkened color in hex format.
 */
function darkenHexColor(hexColor, factor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const darkenedR = Math.floor(r * factor);
    const darkenedG = Math.floor(g * factor);
    const darkenedB = Math.floor(b * factor);

    return `#${componentToHex(darkenedR)}${componentToHex(darkenedG)}${componentToHex(darkenedB)}`;
}

/**
 * Helper function to convert a number to a two-digit hex string.
 * @param {number} component - The color component value (0-255).
 * @returns {string} - The two-digit hex string.
 */
export function componentToHex(component) {
    const hex = component.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
}

/**
 * Interpolates between two colors.
 * @param {string} color1 - The starting color in hex format.
 * @param {string} color2 - The ending color in hex format.
 * @param {number} factor - The interpolation factor (0 to 1).
 * @returns {string} - The interpolated color in hex format.
 */
export function interpolateColor(color1, color2, factor) {
    // Ensure factor is between 0 and 1
    factor = Math.min(Math.max(factor, 0), 1);

    // Parse the colors and convert to RGB
    const c1 = parseInt(color1.slice(1), 16);
    const c2 = parseInt(color2.slice(1), 16);

    const r1 = (c1 >> 16) & 0xff;
    const g1 = (c1 >> 8) & 0xff;
    const b1 = c1 & 0xff;

    const r2 = (c2 >> 16) & 0xff;
    const g2 = (c2 >> 8) & 0xff;
    const b2 = c2 & 0xff;

    // Interpolate each color component
    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));

    // Convert back to hex format
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

/**
 * Converts a string into an enum format.
 * - Converts to uppercase
 * - Replaces spaces with underscores
 * - Strips any non-alphanumeric characters (except underscores)
 *
 * @param {string} str - The input string to process
 * @returns {string} - The processed string in enum format
 */
export function processStringToEnum(str) {
    return str
        .toUpperCase()
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[^\w]/g, ''); // Remove any non-alphanumeric characters (except underscores)
}

/**
 * Generates a random seed for use in applications.
 * @returns {string} A randomly generated string to be used as a seed.
 */
export function generateRandomSeed() {
    return Math.random().toString(36).slice(2, 11);
}

/**
 * Determine whether an element is visible to the user.
 * @param {HTMLElement} element - Element to check.
 * @returns {boolean} True if the element is visible on screen.
 */
function isElementVisible(element) {
    if (!element) return false;

    if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
        return true;
    }

    if (typeof element.getClientRects === 'function') {
        if (element.getClientRects().length === 0) {
            return false;
        }
    }

    const canInspectStyle = typeof element.nodeType === 'number' ||
        (typeof Element !== 'undefined' && element instanceof Element);

    if (!canInspectStyle) {
        return true;
    }

    const style = window.getComputedStyle(element);
    if (!style) {
        return true;
    }

    if (style.visibility === 'hidden' || style.display === 'none') {
        return false;
    }

    const opacity = parseFloat(style.opacity);
    return !Number.isNaN(opacity) ? opacity > 0 : true;
}

/**
 * Get the first visible element for a given ID, falling back to the first match.
 * Handles scenarios where multiple elements share the same ID (e.g. lobby/game boards).
 * @param {string} id - Element ID to search for.
 * @returns {HTMLElement|null} The visible element if found, otherwise the first match or null.
 */
export function getVisibleElementById(id) {
    if (!id) return null;

    const nodeList = typeof document.querySelectorAll === 'function'
        ? document.querySelectorAll(`[id="${id}"]`)
        : [];
    const candidates = Array.from(nodeList).filter(element => element?.id === id);

    if (candidates.length === 0) {
        const fallback = typeof document.getElementById === 'function'
            ? document.getElementById(id)
            : null;
        if (fallback && isElementVisible(fallback)) {
            return fallback;
        }
        return fallback;
    }

    for (const element of candidates) {
        if (isElementVisible(element)) {
            return element;
        }
    }

    return candidates[0];
}
