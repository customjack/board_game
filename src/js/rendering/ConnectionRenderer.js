/**
 * ConnectionRenderer - Handles rendering of connections between spaces
 *
 * Creates DOM elements for lines and arrows connecting board spaces
 */
export default class ConnectionRenderer {
    /**
     * Create a new connection renderer
     * @param {BoardRenderConfig} config - Rendering configuration
     */
    constructor(config) {
        this.config = config;
    }

    /**
     * Render a connection between two spaces
     * @param {Space} fromSpace - Source space
     * @param {Space} toSpace - Target space
     * @param {HTMLElement} container - Container to append elements to
     * @param {boolean} isBidirectional - Whether this is a bidirectional connection
     * @returns {Array<HTMLElement>} Array of created DOM elements
     */
    render(fromSpace, toSpace, container, isBidirectional = false) {
        const elements = [];

        const x1 = fromSpace.visualDetails.x;
        const y1 = fromSpace.visualDetails.y;
        const x2 = toSpace.visualDetails.x;
        const y2 = toSpace.visualDetails.y;

        // Create the line
        const lineElement = this.createLine(x1, y1, x2, y2);
        container.appendChild(lineElement);
        elements.push(lineElement);

        // Create arrow(s)
        if (isBidirectional) {
            // Two arrows, one from each direction
            const arrow1 = this.createArrow(x1, y1, x2, y2, this.config.arrowPositionBidirectional);
            const arrow2 = this.createArrow(x2, y2, x1, y1, this.config.arrowPositionBidirectional);
            container.appendChild(arrow1);
            container.appendChild(arrow2);
            elements.push(arrow1, arrow2);
        } else {
            // Single arrow in the middle
            const arrow = this.createArrow(x1, y1, x2, y2, this.config.arrowPositionSingle);
            container.appendChild(arrow);
            elements.push(arrow);
        }

        return elements;
    }

    /**
     * Create a line element between two points
     * @param {number} x1 - Start X coordinate
     * @param {number} y1 - Start Y coordinate
     * @param {number} x2 - End X coordinate
     * @param {number} y2 - End Y coordinate
     * @returns {HTMLElement} Line element
     */
    createLine(x1, y1, x2, y2) {
        const length = Math.hypot(x2 - x1, y2 - y1);
        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        const line = document.createElement('div');
        line.classList.add('board-connection-line');

        // Get style from config
        const style = this.config.getConnectionStyle();

        line.style.position = 'absolute';
        line.style.width = `${length}px`;
        line.style.height = style.height;
        line.style.backgroundColor = style.backgroundColor;
        line.style.left = `${midX - length / 2}px`;
        line.style.top = `${midY - this.config.connectionThickness / 2}px`;
        line.style.transform = `rotate(${angle}deg)`;
        line.style.transformOrigin = 'center';
        line.style.zIndex = style.zIndex;
        line.style.pointerEvents = 'none';  // Don't interfere with clicks

        return line;
    }

    /**
     * Create an arrowhead element
     * @param {number} x1 - Start X coordinate
     * @param {number} y1 - Start Y coordinate
     * @param {number} x2 - End X coordinate
     * @param {number} y2 - End Y coordinate
     * @param {number} position - Position along the line (0-1, where 0.5 is middle)
     * @returns {HTMLElement} Arrow element
     */
    createArrow(x1, y1, x2, y2, position) {
        const angle = Math.atan2(y2 - y1, x2 - x1);

        // Calculate position along the line
        const arrowX = x1 + (x2 - x1) * position;
        const arrowY = y1 + (y2 - y1) * position;

        const arrow = document.createElement('div');
        arrow.classList.add('board-connection-arrow');

        // Get style from config
        const style = this.config.getArrowStyle();

        arrow.style.position = 'absolute';
        arrow.style.width = '0';
        arrow.style.height = '0';
        arrow.style.left = `${arrowX}px`;
        arrow.style.top = `${arrowY}px`;

        // Create triangle using borders
        arrow.style.borderLeft = `${style.borderLeftWidth} solid transparent`;
        arrow.style.borderRight = `${style.borderRightWidth} solid transparent`;
        arrow.style.borderTop = `${style.borderTopWidth} solid ${style.borderTopColor}`;

        // Rotate arrow to point in the right direction
        // Adjust by -90deg because border-top points up by default
        arrow.style.transform = `translate(-50%, -50%) rotate(${angle}rad) rotate(-90deg)`;
        arrow.style.transformOrigin = 'center';
        arrow.style.zIndex = style.zIndex;
        arrow.style.pointerEvents = 'none';

        return arrow;
    }

    /**
     * Check if a connection already exists (for deduplication)
     * @param {Space} fromSpace - Source space
     * @param {Space} toSpace - Target space
     * @param {Set<string>} drawnConnections - Set of already drawn connections
     * @returns {boolean} True if connection should be drawn
     */
    static shouldDrawConnection(fromSpace, toSpace, drawnConnections) {
        const connectionKey = `${Math.min(fromSpace.id, toSpace.id)}-${Math.max(fromSpace.id, toSpace.id)}`;
        if (drawnConnections.has(connectionKey)) {
            return false;
        }
        drawnConnections.add(connectionKey);
        return true;
    }

    /**
     * Determine if a connection is bidirectional
     * @param {Space} space1 - First space
     * @param {Space} space2 - Second space
     * @returns {boolean} True if bidirectional
     */
    static isBidirectional(space1, space2) {
        const space1ConnectsTo2 = space1.connections.some(conn => conn.target.id === space2.id);
        const space2ConnectsTo1 = space2.connections.some(conn => conn.target.id === space1.id);
        return space1ConnectsTo2 && space2ConnectsTo1;
    }
}
