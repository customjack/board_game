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
        this.spaceShape = overrides.spaceShape || 'circle';  // circle, square, hexagon, etc.
        this.spaceBorderRadius = overrides.spaceBorderRadius || '50%';  // For circle
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
        const style = {
            width: `${visualDetails.size}px`,
            height: `${visualDetails.size}px`,
            backgroundColor: visualDetails.color,
            color: visualDetails.textColor || this.defaultTextColor,
            borderRadius: this.spaceBorderRadius,
            zIndex: this.zIndexSpace.toString()
        };

        // Add border if configured
        if (this.spaceBorderWidth > 0) {
            style.border = `${this.spaceBorderWidth}px solid ${this.spaceBorderColor}`;
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
