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
            requiredPlugins: metadata.requiredPlugins || [],
            gameEngine: metadata.gameEngine || {
                type: "turn-based",
                config: {}
            },
            renderConfig: metadata.renderConfig || {},
            modifiedDate: metadata.modifiedDate || metadata.modified || metadata.createdDate || new Date().toISOString()
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

    // Serialize the board to JSON (new format), including metadata and game rules
    toJSON() {
        // Flatten game rules for new format
        const gameRulesJson = this.gameRules.toJSON();
        const flatGameRules = {
            minPlayers: gameRulesJson.players?.min,
            maxPlayers: gameRulesJson.players?.max,
            recommendedPlayers: gameRulesJson.players?.recommended,
            startingPositions: gameRulesJson.players?.startingPositions,
            turns: gameRulesJson.turns,
            victory: gameRulesJson.victory,
            movement: gameRulesJson.movement,
            constraints: gameRulesJson.constraints
        };

        return {
            version: this.metadata.version || "1.0.0",
            name: this.metadata.name,
            author: this.metadata.author,
            description: this.metadata.description,
            created: this.metadata.createdDate,
            modified: this.metadata.modifiedDate,
            tags: this.metadata.tags,
            requiredPlugins: this.metadata.requiredPlugins || [],
            gameEngine: this.metadata.gameEngine,
            renderConfig: this.metadata.renderConfig,
            gameRules: flatGameRules,
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
        if (!json || typeof json !== 'object') {
            throw new Error('Invalid board definition');
        }

        if (json.type === 'game' || json.board) {
            return this.fromGameDefinition(json, factoryManager);
        }

        return this.fromLegacyBoard(json, factoryManager);
    }

    static fromLegacyBoard(json, factoryManager) {
        const metadata = {
            name: json.name,
            author: json.author,
            description: json.description,
            createdDate: json.created,
            version: json.version,
            tags: json.tags,
            gameEngine: json.gameEngine,
            renderConfig: json.renderConfig,
            modifiedDate: json.modified
        };

        const spaces = json.spaces.map(spaceData => Space.fromJSON(spaceData, factoryManager));
        Space.resolveConnections(spaces, json.spaces);
        const gameRules = GameRules.fromJSON(json.gameRules || {});
        return new Board(spaces, metadata, gameRules);
    }

    static fromGameDefinition(gameDefinition, factoryManager) {
        const boardSection = gameDefinition.board || {};
        const topology = boardSection.topology || {};
        const spacesJson = Array.isArray(topology.spaces) ? topology.spaces : [];

        if (spacesJson.length === 0) {
            throw new Error('Game definition must include board.topology.spaces');
        }

        const spaces = spacesJson.map(spaceData => Space.fromJSON(spaceData, factoryManager));
        Space.resolveConnections(spaces, spacesJson);

        const metadata = {
            name: gameDefinition.metadata?.name,
            author: gameDefinition.metadata?.author,
            description: gameDefinition.metadata?.description,
            createdDate: gameDefinition.metadata?.created,
            version: gameDefinition.version,
            tags: gameDefinition.metadata?.tags,
            requiredPlugins: (gameDefinition.requirements?.plugins || []).map(plugin =>
                typeof plugin === 'string' ? plugin : plugin.id
            ),
            gameEngine: {
                type: gameDefinition.engine?.type || 'turn-based',
                config: gameDefinition.engine?.config || {}
            },
            renderConfig: boardSection.rendering || {},
            modifiedDate: gameDefinition.metadata?.modified
        };

        const rulesInput = this.mapGameDefinitionRules(gameDefinition);
        const gameRules = GameRules.fromJSON(rulesInput);

        return new Board(spaces, metadata, gameRules);
    }

    static mapGameDefinitionRules(gameDefinition) {
        const requirements = gameDefinition.requirements || {};
        const rules = gameDefinition.rules || {};

        return {
            minPlayers: requirements.minPlayers,
            maxPlayers: requirements.maxPlayers,
            recommendedPlayers: rules.recommendedPlayers,
            startingPositions: rules.startingPositions,
            turns: rules.turns ? rules.turns : (rules.turnOrder ? { turnOrder: rules.turnOrder } : undefined),
            movement: rules.movement || (rules.diceRolling ? {
                type: 'dice',
                rollRange: {
                    min: 1,
                    max: rules.diceRolling.diceSides || 6
                }
            } : undefined),
            victory: rules.winCondition ? {
                conditions: [{
                    type: rules.winCondition.type || 'CUSTOM',
                    config: rules.winCondition.config || {}
                }]
            } : rules.victory,
            constraints: rules.constraints
        };
    }
}
