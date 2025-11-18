// utils/ColorAssigner.js

export default class ColorAssigner {
    constructor(paletteSize = 100) {
        this.colorPalette = this.generateColorPalette(paletteSize);  // Generate the color palette
    }

    /**
     * Generate an array of distinct colors.
     * @param {number} size - The number of colors to generate.
     * @returns {Array} Array of color strings in HSL format.
     */
    generateColorPalette(size) {
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
     * Hash the uuid to generate a consistent color index.
     * @param {string} uuid - The unique identifier for the peer.
     * @returns {string} The assigned color from the palette.
     */
    assignColor(uuid) {
        let hash = 0;
        for (let i = 0; i < uuid.length; i++) {
            const char = uuid.charCodeAt(i);
            hash = (hash * 31 + char) % 1000; // Simple hash function
        }
        const colorIndex = Math.abs(hash) % this.colorPalette.length;  // Map the hash to a color index
        return this.colorPalette[colorIndex];
    }
}
