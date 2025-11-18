const DEFAULT_HEX_COLOR = '#FFFFFF';
const FULL_HEX_COLOR_REGEX = /^#([0-9a-f]{6})$/i;
const SHORT_HEX_COLOR_REGEX = /^#([0-9a-f]{3})$/i;

let colorNormalizationContext = null;

function getCanvasContext() {
    if (typeof document === 'undefined') {
        return null;
    }

    if (!colorNormalizationContext) {
        const canvas = document.createElement('canvas');
        if (canvas?.getContext) {
            colorNormalizationContext = canvas.getContext('2d');
        }
    }

    return colorNormalizationContext;
}

function expandShortHex(value) {
    const hex = value.replace('#', '');
    if (hex.length !== 3) {
        return null;
    }

    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
}

function rgbStringToHex(value) {
    const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) {
        return null;
    }

    const hex = [match[1], match[2], match[3]]
        .map((channel) => Number(channel).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();

    return `#${hex}`;
}

export function normalizeToHexColor(color, fallback = DEFAULT_HEX_COLOR) {
    const resolvedFallback = fallback === undefined ? DEFAULT_HEX_COLOR : fallback;

    if (!color || typeof color !== 'string') {
        return resolvedFallback;
    }

    const trimmed = color.trim();

    if (FULL_HEX_COLOR_REGEX.test(trimmed)) {
        return trimmed.toUpperCase();
    }

    if (SHORT_HEX_COLOR_REGEX.test(trimmed)) {
        return expandShortHex(trimmed);
    }

    const ctx = getCanvasContext();
    if (!ctx) {
        return resolvedFallback;
    }

    try {
        ctx.fillStyle = trimmed;
        const normalized = ctx.fillStyle;

        if (FULL_HEX_COLOR_REGEX.test(normalized)) {
            return normalized.toUpperCase();
        }

        if (SHORT_HEX_COLOR_REGEX.test(normalized)) {
            return expandShortHex(normalized);
        }

        if (normalized.startsWith('rgb')) {
            const rgbHex = rgbStringToHex(normalized);
            if (rgbHex) {
                return rgbHex;
            }
        }
    } catch {
        return resolvedFallback;
    }

    return resolvedFallback;
}

export { DEFAULT_HEX_COLOR };
