/**
 * GameRules - Encapsulates all game rules and constraints for a board
 *
 * Defines player limits, starting positions, victory conditions, movement rules, etc.
 */
export default class GameRules {
    /**
     * Create a new GameRules instance
     * @param {Object} config - Game rules configuration
     */
    constructor(config = {}) {
        // Player rules
        this.players = {
            min: config.players?.min ?? 1,
            max: config.players?.max ?? null, // null = unlimited
            recommended: {
                min: config.players?.recommended?.min ?? null,
                max: config.players?.recommended?.max ?? null
            },
            startingPositions: {
                mode: config.players?.startingPositions?.mode ?? 'single', // 'single' | 'spread' | 'random' | 'custom'
                spaceIds: config.players?.startingPositions?.spaceIds ?? [], // Array of space IDs
                distribution: config.players?.startingPositions?.distribution ?? 'round-robin' // For 'spread' mode
            }
        };

        // Turn rules
        this.turns = {
            maxTurns: config.turns?.maxTurns ?? 0, // 0 = unlimited
            timeLimit: config.turns?.timeLimit ?? null, // null or seconds for whole game
            turnOrder: config.turns?.turnOrder ?? 'sequential' // 'sequential' | 'random' | 'custom'
        };

        // Victory conditions
        this.victory = {
            conditions: config.victory?.conditions ?? [], // Array of win conditions
            eliminationEnabled: config.victory?.eliminationEnabled ?? false
        };

        // Movement rules
        this.movement = {
            type: config.movement?.type ?? 'dice', // 'dice' | 'fixed' | 'choice' | 'custom'
            rollRange: {
                min: config.movement?.rollRange?.min ?? 1,
                max: config.movement?.rollRange?.max ?? 6
            },
            allowBacktracking: config.movement?.allowBacktracking ?? false,
            mandatoryMovement: config.movement?.mandatoryMovement ?? true
        };

        // Constraints and requirements
        this.constraints = {
            requiresPlugins: config.constraints?.requiresPlugins ?? [],
            minimumVersion: config.constraints?.minimumVersion ?? null,
            customValidation: config.constraints?.customValidation ?? null
        };
    }

    /**
     * Validate player count against rules
     * @param {number} playerCount - Number of players
     * @returns {Object} Validation result with status and messages
     */
    validatePlayerCount(playerCount) {
        const result = {
            valid: true,
            status: 'valid', // 'valid' | 'warning' | 'invalid'
            messages: []
        };

        // Check minimum
        if (this.players.min && playerCount < this.players.min) {
            result.valid = false;
            result.status = 'invalid';
            result.messages.push(`Requires at least ${this.players.min} player${this.players.min > 1 ? 's' : ''}`);
        }

        // Check maximum
        if (this.players.max && playerCount > this.players.max) {
            result.valid = false;
            result.status = 'invalid';
            result.messages.push(`Maximum ${this.players.max} players allowed`);
        }

        // Check recommended range (warning, not invalid)
        if (result.valid) {
            const recMin = this.players.recommended.min;
            const recMax = this.players.recommended.max;

            if (recMin && playerCount < recMin) {
                result.status = 'warning';
                result.messages.push(`Recommended: ${recMin}+ players for best experience`);
            }

            if (recMax && playerCount > recMax) {
                result.status = 'warning';
                result.messages.push(`Recommended: ${recMax} or fewer players for best experience`);
            }
        }

        return result;
    }

    /**
     * Get starting space ID for a player
     * @param {number} playerIndex - Index of the player (0-based)
     * @param {number} totalPlayers - Total number of players
     * @param {Board} board - The game board
     * @returns {string|number} Space ID where player should start
     */
    getStartingSpaceForPlayer(playerIndex, totalPlayers, board) {
        const { mode, spaceIds, distribution } = this.players.startingPositions;

        // If no starting spaces configured, try to find a space with type 'start'
        let startingSpaces = spaceIds && spaceIds.length > 0 ? spaceIds : null;

        if (!startingSpaces) {
            // Fallback: look for spaces with 'start' type
            const startSpaces = board.spaces.filter(space => {
                if (Array.isArray(space.types)) {
                    return space.types.includes('start');
                }
                return space.type === 'start';
            });

            if (startSpaces.length > 0) {
                startingSpaces = startSpaces.map(s => s.id);
            } else {
                // Ultimate fallback: use first space
                startingSpaces = [board.spaces[0]?.id ?? 1];
            }
        }

        // Apply distribution mode
        switch (mode) {
            case 'single':
                // All players start at the same space (first in array)
                return startingSpaces[0];

            case 'spread':
                // Distribute players across available starting spaces
                if (distribution === 'round-robin') {
                    return startingSpaces[playerIndex % startingSpaces.length];
                } else if (distribution === 'sequential') {
                    // Fill each space to capacity before moving to next
                    const playersPerSpace = Math.ceil(totalPlayers / startingSpaces.length);
                    const spaceIndex = Math.floor(playerIndex / playersPerSpace);
                    return startingSpaces[Math.min(spaceIndex, startingSpaces.length - 1)];
                }
                return startingSpaces[playerIndex % startingSpaces.length];

            case 'random':
                // Random space from the array (requires RNG to be passed in - for now use simple selection)
                // In real implementation, this would use the game's RNG for deterministic behavior
                const randomIndex = Math.floor(Math.random() * startingSpaces.length);
                return startingSpaces[randomIndex];

            case 'custom':
                // Custom logic would be handled by game engine or plugin
                // For now, fallback to single
                return startingSpaces[0];

            default:
                return startingSpaces[0];
        }
    }

    /**
     * Check if victory conditions are met
     * @param {GameState} gameState - Current game state
     * @returns {Object|null} Winner info if conditions met, null otherwise
     */
    checkVictoryConditions(gameState) {
        if (!this.victory.conditions || this.victory.conditions.length === 0) {
            return null; // No victory conditions defined
        }

        // Check each condition (OR logic - any condition triggers victory)
        for (const condition of this.victory.conditions) {
            const result = this.evaluateVictoryCondition(condition, gameState);
            if (result) {
                return result;
            }
        }

        return null;
    }

    /**
     * Evaluate a single victory condition
     * @param {Object} condition - Victory condition to check
     * @param {GameState} gameState - Current game state
     * @returns {Object|null} Winner info if met, null otherwise
     */
    evaluateVictoryCondition(condition, gameState) {
        switch (condition.type) {
            case 'REACH_SPACE': {
                const winner = gameState.players.find(p => p.currentSpaceId === condition.spaceId);
                if (winner) {
                    return {
                        type: 'REACH_SPACE',
                        winner: winner,
                        message: `${winner.nickname} reached the goal!`
                    };
                }
                break;
            }

            case 'TURN_LIMIT': {
                if (gameState.turnNumber >= condition.turns) {
                    // Determine winner based on condition.winner strategy
                    let winner = null;
                    if (condition.winner === 'highest_score') {
                        // Future: implement scoring system
                        winner = gameState.players[0];
                    } else if (condition.winner === 'furthest') {
                        // Future: calculate who is furthest along the board
                        winner = gameState.players[0];
                    }

                    return {
                        type: 'TURN_LIMIT',
                        winner: winner,
                        message: `Turn limit reached! ${winner?.nickname || 'Game'} wins!`
                    };
                }
                break;
            }

            case 'LAST_STANDING': {
                const activePlayers = gameState.players.filter(p => p.state !== 'eliminated');
                if (activePlayers.length === 1) {
                    return {
                        type: 'LAST_STANDING',
                        winner: activePlayers[0],
                        message: `${activePlayers[0].nickname} is the last one standing!`
                    };
                }
                break;
            }

            default:
                console.warn(`Unknown victory condition type: ${condition.type}`);
        }

        return null;
    }

    /**
     * Serialize to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            players: this.players,
            turns: this.turns,
            victory: this.victory,
            movement: this.movement,
            constraints: this.constraints
        };
    }

    /**
     * Create from JSON
     * @param {Object} json - JSON data
     * @returns {GameRules} New GameRules instance
     */
    static fromJSON(json = {}) {
        return new GameRules(json);
    }

    /**
     * Get a summary of the rules for display
     * @returns {Object} Human-readable summary
     */
    getSummary() {
        const summary = {};

        // Player info
        if (this.players.min || this.players.max) {
            const min = this.players.min || 1;
            const max = this.players.max || '∞';
            summary.players = `${min}-${max} players`;

            if (this.players.recommended.min || this.players.recommended.max) {
                const recMin = this.players.recommended.min || min;
                const recMax = this.players.recommended.max || max;
                summary.recommendedPlayers = `${recMin}-${recMax} recommended`;
            }
        }

        // Turn info
        if (this.turns.maxTurns > 0) {
            summary.turnLimit = `${this.turns.maxTurns} turns max`;
        }

        // Victory info
        if (this.victory.conditions.length > 0) {
            summary.victoryConditions = this.victory.conditions.map(c => c.type).join(' or ');
        }

        return summary;
    }
}
