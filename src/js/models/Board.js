import Space from './Space';
import GameRules from './GameRules.js';
import { getVisibleElementById } from '../utils/helpers.js';

export default class Board {
    constructor(spaces = [], metadata = {}, gameRules = null) {
        this.spaces = spaces;
        this.metadata = {
            name: metadata.name || "Default Board",
            author: metadata.author || "Unknown",
            description: metadata.description || "",
            createdDate: metadata.createdDate || new Date().toISOString(),
            version: metadata.version || "1.0.0",
            tags: metadata.tags || [],
            // Game engine configuration
            gameEngine: metadata.gameEngine || {
                type: "turn-based", // Default engine type
                config: {} // Engine-specific configuration
            },
            // Board rendering configuration (optional overrides)
            renderConfig: metadata.renderConfig || {}
        };

        // Game rules and constraints
        this.gameRules = gameRules || GameRules.fromJSON(metadata.gameRules || {});
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

    // Serialize the board to JSON, including metadata and game rules
    toJSON() {
        return {
            metadata: {
                ...this.metadata,
                gameRules: this.gameRules.toJSON()
            },
            spaces: this.spaces.map(space => space.toJSON())
        };
    }

    /**
     * Deserialize the board from JSON, including metadata
     * @param {Object} json - JSON representation
     * @param {FactoryManager} factoryManager - Factory manager for creating game objects
     * @returns {Board} Board instance
     */
    static fromJSON(json, factoryManager) {
        // First pass: Deserialize spaces without connections
        const spaces = json.spaces.map(spaceData => Space.fromJSON(spaceData, factoryManager));

        // Second pass: Resolve connections between spaces
        Space.resolveConnections(spaces, json.spaces);

        // Parse game rules
        const gameRules = GameRules.fromJSON(json.metadata?.gameRules || json.gameRules || {});

        // Return the new Board instance with metadata and game rules
        return new Board(spaces, json.metadata, gameRules);
    }
}
