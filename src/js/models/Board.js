import Space from './Space';
import { getVisibleElementById } from '../utils/helpers.js';

export default class Board {
    constructor(spaces = [], metadata = {}) {
        this.spaces = spaces;
        this.metadata = {
            name: metadata.name || "Default Board",
            author: metadata.author || "Unknown",
            description: metadata.description || "",
            createdDate: metadata.createdDate || new Date().toISOString(),
            // Game engine configuration
            gameEngine: metadata.gameEngine || {
                type: "turn-based", // Default engine type
                config: {} // Engine-specific configuration
            },
            // Board rendering configuration (optional overrides)
            renderConfig: metadata.renderConfig || {}
        };
    }

    // Add space to board
    addSpace(space) {
        this.spaces.push(space);
    }

    // Get a space by its id
    getSpace(id) {
        return this.spaces.find(space => space.id === id);
    }

    // Highlight specific spaces
    highlightSpaces(spaces) {
        spaces.forEach(space => {
            const spaceElement = getVisibleElementById(`space-${space.id}`);
            if (spaceElement) {
                spaceElement.classList.add('highlight');
            }
        });
    }

    // Remove highlight from all spaces
    removeHighlightFromSpaces(spaces) {
        spaces.forEach(space => {
            const spaceElement = getVisibleElementById(`space-${space.id}`);
            if (spaceElement) {
                spaceElement.classList.remove('highlight');
            }
        });
    }

    // Serialize the board to JSON, including metadata
    toJSON() {
        return {
            metadata: this.metadata,
            spaces: this.spaces.map(space => space.toJSON())
        };
    }

    // First pass: Deserialize the board without connections, including metadata
    static fromJSON(json) {
        const spaces = json.spaces.map(spaceData => Space.fromJSON(spaceData));
        
        // Second pass: Resolve connections between spaces
        Space.resolveConnections(spaces, json.spaces);

        // Return the new Board instance with metadata
        return new Board(spaces, json.metadata);
    }
}
