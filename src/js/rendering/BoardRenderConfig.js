export function applyColorAlpha(color, alpha) {
    if (!color || alpha === undefined || alpha === null || alpha === '') return color;
    const numericAlpha = Number(alpha);
    const normalizedAlpha = Number.isFinite(numericAlpha)
        ? Math.max(0, Math.min(1, numericAlpha))
        : 1;

    const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
    if (hex) {
        const expanded = hex.length === 3
            ? hex.split('').map((character) => character + character).join('')
            : hex;
        const red = parseInt(expanded.slice(0, 2), 16);
        const green = parseInt(expanded.slice(2, 4), 16);
        const blue = parseInt(expanded.slice(4, 6), 16);
        return `rgba(${red}, ${green}, ${blue}, ${normalizedAlpha})`;
    }

    const rgb = color.match(/^rgba?\(\s*([^,]+),\s*([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\)$/i);
    if (rgb) {
        return `rgba(${rgb[1].trim()}, ${rgb[2].trim()}, ${rgb[3].trim()}, ${normalizedAlpha})`;
    }

    if (normalizedAlpha === 1) return color;
    return `color-mix(in srgb, ${color} ${normalizedAlpha * 100}%, transparent)`;
}

/**
 * BoardRenderConfig - Centralized configuration for board rendering
 *
 * This class manages all styling and configuration for board rendering,
 * pulling from CSS variables and allowing per-board overrides.
 */
export default class BoardRenderConfig {
    /**
     * Create a new board rendering configuration
     * @param {Object} overrides - Optional board-specific style overrides
     */
    constructor(overrides = {}) {
        // Get CSS custom properties from root
        const root = getComputedStyle(document.documentElement);

        // Connection styling
        this.connectionColor = overrides.connectionColor ||
            root.getPropertyValue('--board-connection-color').trim() || '#333333';

        this.connectionThickness = overrides.connectionThickness ||
            parseInt(root.getPropertyValue('--board-connection-thickness')) || 2;

        // Arrow styling
        this.arrowColor = overrides.arrowColor ||
            root.getPropertyValue('--board-arrow-color').trim() || '#333333';

        this.arrowSize = overrides.arrowSize ||
            parseInt(root.getPropertyValue('--board-arrow-size')) || 10;

        // Space styling
        this.spaceBorderColor = overrides.spaceBorderColor ||
            root.getPropertyValue('--board-space-border-color').trim() || 'transparent';

        this.spaceBorderWidth = overrides.spaceBorderWidth ||
            parseInt(root.getPropertyValue('--board-space-border-width')) || 0;

        this.defaultTextColor = overrides.defaultTextColor ||
            root.getPropertyValue('--board-default-text-color').trim() || '#000000';

        // Arrow positioning
        this.arrowPositionSingle = overrides.arrowPositionSingle || 0.5;  // 50% along path
        this.arrowPositionBidirectional = overrides.arrowPositionBidirectional || 0.55;  // 55% from each end

        // Z-index layers
        this.zIndexConnection = overrides.zIndexConnection || 1;
        this.zIndexSpace = overrides.zIndexSpace || 2;
        this.zIndexPiece = overrides.zIndexPiece || 3;

        // Piece styling
        this.pieceSize = overrides.pieceSize || 30;
        this.pieceOpacity = overrides.pieceOpacity || 0.75;
        this.pieceArrangementRadius = overrides.pieceArrangementRadius || 10;

        // Space shape
        this.spaceShape = overrides.spaceShape || 'square';  // Default is square
        this.spaceBorderRadius = overrides.spaceBorderRadius || '0';  // For square
    }

    /**
     * Create a config from board metadata
     * @param {Object} boardMetadata - Board metadata from JSON
     * @returns {BoardRenderConfig} Configuration instance
     */
    static fromBoardMetadata(boardMetadata) {
        const styleOverrides = boardMetadata?.renderConfig || {};
        return new BoardRenderConfig(styleOverrides);
    }

    /**
     * Get CSS style object for connections
     * @returns {Object} CSS properties object
     */
    getConnectionStyle() {
        return {
            backgroundColor: this.connectionColor,
            height: `${this.connectionThickness}px`,
            zIndex: this.zIndexConnection.toString()
        };
    }

    /**
     * Get CSS style object for arrows
     * @returns {Object} CSS properties object
     */
    getArrowStyle() {
        return {
            borderLeftWidth: `${this.arrowSize / 2}px`,
            borderRightWidth: `${this.arrowSize / 2}px`,
            borderTopWidth: `${this.arrowSize}px`,
            borderTopColor: this.arrowColor,
            zIndex: this.zIndexConnection.toString()
        };
    }

    /**
     * Get CSS style object for spaces
     * @param {Object} visualDetails - Space-specific visual details
     * @returns {Object} CSS properties object
     */
    getSpaceStyle(visualDetails) {
        let fontFamily = visualDetails.font || '';
        let fontSize = visualDetails.fontSize;
        
        // Legacy support: "15px Arial"
        if (fontFamily && fontFamily.includes('px ')) {
            const parts = fontFamily.split('px ');
            if (fontSize == null) {
                fontSize = parseInt(parts[0].trim(), 10);
            }
            fontFamily = parts[1].trim();
        }

        let shape = visualDetails.shape;
        if (!shape || shape === 'default') {
            shape = visualDetails.image ? 'none' : this.spaceShape;
        }

        let borderRadius = this.spaceBorderRadius;
        let clipPath = null;

        if (shape === 'square') borderRadius = '0';
        else if (shape === 'rounded') borderRadius = '10%';
        else if (shape === 'circle') borderRadius = '50%';
        else if (shape === 'hexagon') {
            borderRadius = '0';
            clipPath = 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)';
        } else if (shape === 'none') {
            borderRadius = '0';
            clipPath = null;
        }

        const size = visualDetails.size || 50;
        const style = {
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: applyColorAlpha(visualDetails.color, visualDetails.colorAlpha),
            color: applyColorAlpha(
                visualDetails.textColor || this.defaultTextColor,
                visualDetails.textColorAlpha
            ),
            borderRadius: borderRadius,
            zIndex: this.zIndexSpace.toString(),
            fontSize: fontSize ? `${fontSize}px` : '12px',
            fontFamily: fontFamily,
            fontWeight: 'bold',
            textAlign: visualDetails.textAlign || 'center',
            alignItems: visualDetails.verticalAlign || 'center',
            justifyContent: visualDetails.textAlign === 'left' ? 'flex-start'
                : visualDetails.textAlign === 'right' ? 'flex-end'
                : 'center',
            showLabel: visualDetails.showLabel !== false
        };

        const bWidth = visualDetails.borderWidth !== null && visualDetails.borderWidth !== undefined ? visualDetails.borderWidth : this.spaceBorderWidth;
        const bColor = visualDetails.borderColor || this.spaceBorderColor;

        if (bWidth > 0) {
            style.border = `${bWidth}px solid ${bColor}`;
        }
        
        if (clipPath) {
            style.clipPath = clipPath;
        }

        return style;
    }

    /**
     * Get CSS style object for pieces
     * @param {string} playerColor - Player's color
     * @returns {Object} CSS properties object
     */
    getPieceStyle(playerColor) {
        return {
            width: `${this.pieceSize}px`,
            height: `${this.pieceSize}px`,
            backgroundColor: playerColor,
            borderRadius: '50%',
            opacity: this.pieceOpacity.toString(),
            zIndex: this.zIndexPiece.toString()
        };
    }

    /**
     * Serialize configuration to JSON
     * @returns {Object} Serialized configuration
     */
    toJSON() {
        return {
            connectionColor: this.connectionColor,
            connectionThickness: this.connectionThickness,
            arrowColor: this.arrowColor,
            arrowSize: this.arrowSize,
            spaceBorderColor: this.spaceBorderColor,
            spaceBorderWidth: this.spaceBorderWidth,
            defaultTextColor: this.defaultTextColor,
            arrowPositionSingle: this.arrowPositionSingle,
            arrowPositionBidirectional: this.arrowPositionBidirectional,
            zIndexConnection: this.zIndexConnection,
            zIndexSpace: this.zIndexSpace,
            zIndexPiece: this.zIndexPiece,
            pieceSize: this.pieceSize,
            pieceOpacity: this.pieceOpacity,
            pieceArrangementRadius: this.pieceArrangementRadius,
            spaceShape: this.spaceShape,
            spaceBorderRadius: this.spaceBorderRadius
        };
    }

    /**
     * Create configuration from JSON
     * @param {Object} json - Serialized configuration
     * @returns {BoardRenderConfig} Configuration instance
     */
    static fromJSON(json) {
        return new BoardRenderConfig(json);
    }
}
