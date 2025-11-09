/**
 * BoardSchemaValidator - Validates board JSON against the schema
 *
 * Ensures board JSON files are properly formatted and contain valid data
 * before being loaded into the game.
 */
export default class BoardSchemaValidator {
    /**
     * Validate a complete board JSON object
     * @param {Object} boardJson - The board JSON to validate
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    static validate(boardJson) {
        const errors = [];

        if (!boardJson || typeof boardJson !== 'object') {
            return { valid: false, errors: ['Board JSON must be an object'] };
        }

        // Validate metadata
        const metadataErrors = this.validateMetadata(boardJson.metadata);
        errors.push(...metadataErrors);

        // Validate spaces
        const spacesErrors = this.validateSpaces(boardJson.spaces);
        errors.push(...spacesErrors);

        // Validate connections reference existing spaces
        if (boardJson.spaces && Array.isArray(boardJson.spaces)) {
            const connectionErrors = this.validateConnections(boardJson.spaces);
            errors.push(...connectionErrors);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate metadata section
     * @param {Object} metadata - Metadata object
     * @returns {string[]} Array of error messages
     */
    static validateMetadata(metadata) {
        const errors = [];

        if (!metadata) {
            errors.push('Metadata is required');
            return errors;
        }

        // Check optional fields
        if (metadata.name && typeof metadata.name !== 'string') {
            errors.push('metadata.name must be a string');
        }

        if (metadata.author && typeof metadata.author !== 'string') {
            errors.push('metadata.author must be a string');
        }

        if (metadata.description && typeof metadata.description !== 'string') {
            errors.push('metadata.description must be a string');
        }

        if (metadata.createdDate && typeof metadata.createdDate !== 'string') {
            errors.push('metadata.createdDate must be a string (ISO 8601 format)');
        }

        // Validate game engine config
        if (metadata.gameEngine) {
            const engineErrors = this.validateGameEngine(metadata.gameEngine);
            errors.push(...engineErrors);
        }

        // Validate render config
        if (metadata.renderConfig) {
            const renderErrors = this.validateRenderConfig(metadata.renderConfig);
            errors.push(...renderErrors);
        }

        // Validate game rules
        if (metadata.gameRules) {
            const rulesErrors = this.validateGameRules(metadata.gameRules);
            errors.push(...rulesErrors);
        }

        return errors;
    }

    /**
     * Validate game rules configuration
     * @param {Object} gameRules - Game rules config
     * @returns {string[]} Array of error messages
     */
    static validateGameRules(gameRules) {
        const errors = [];

        if (typeof gameRules !== 'object') {
            errors.push('metadata.gameRules must be an object');
            return errors;
        }

        // Validate players section
        if (gameRules.players) {
            const playersErrors = this.validatePlayersRules(gameRules.players);
            errors.push(...playersErrors);
        }

        // Other sections are optional and flexible
        return errors;
    }

    /**
     * Validate players rules
     * @param {Object} players - Players rules config
     * @returns {string[]} Array of error messages
     */
    static validatePlayersRules(players) {
        const errors = [];

        if (typeof players !== 'object') {
            errors.push('gameRules.players must be an object');
            return errors;
        }

        // Validate min/max
        if (players.min !== undefined) {
            if (typeof players.min !== 'number' || players.min < 0) {
                errors.push('gameRules.players.min must be a non-negative number');
            }
        }

        if (players.max !== undefined) {
            if (typeof players.max !== 'number' || players.max < 1) {
                errors.push('gameRules.players.max must be a positive number');
            }
        }

        // Validate min <= max
        if (players.min !== undefined && players.max !== undefined) {
            if (players.min > players.max) {
                errors.push('gameRules.players.min cannot be greater than max');
            }
        }

        // Validate recommended
        if (players.recommended) {
            if (typeof players.recommended !== 'object') {
                errors.push('gameRules.players.recommended must be an object');
            } else {
                if (players.recommended.min !== undefined && typeof players.recommended.min !== 'number') {
                    errors.push('gameRules.players.recommended.min must be a number');
                }
                if (players.recommended.max !== undefined && typeof players.recommended.max !== 'number') {
                    errors.push('gameRules.players.recommended.max must be a number');
                }
            }
        }

        // Validate starting positions
        if (players.startingPositions) {
            const posErrors = this.validateStartingPositions(players.startingPositions);
            errors.push(...posErrors);
        }

        return errors;
    }

    /**
     * Validate starting positions configuration
     * @param {Object} positions - Starting positions config
     * @returns {string[]} Array of error messages
     */
    static validateStartingPositions(positions) {
        const errors = [];

        if (typeof positions !== 'object') {
            errors.push('gameRules.players.startingPositions must be an object');
            return errors;
        }

        // Validate mode
        if (positions.mode) {
            const validModes = ['single', 'spread', 'random', 'custom'];
            if (!validModes.includes(positions.mode)) {
                errors.push(`gameRules.players.startingPositions.mode must be one of: ${validModes.join(', ')}`);
            }
        }

        // Validate spaceIds
        if (positions.spaceIds) {
            if (!Array.isArray(positions.spaceIds)) {
                errors.push('gameRules.players.startingPositions.spaceIds must be an array');
            } else if (positions.spaceIds.length === 0) {
                errors.push('gameRules.players.startingPositions.spaceIds cannot be empty');
            }
        }

        // Validate distribution
        if (positions.distribution) {
            const validDistributions = ['round-robin', 'sequential'];
            if (!validDistributions.includes(positions.distribution)) {
                errors.push(`gameRules.players.startingPositions.distribution must be one of: ${validDistributions.join(', ')}`);
            }
        }

        return errors;
    }

    /**
     * Validate game engine configuration
     * @param {Object} gameEngine - Game engine config
     * @returns {string[]} Array of error messages
     */
    static validateGameEngine(gameEngine) {
        const errors = [];

        if (typeof gameEngine !== 'object') {
            errors.push('metadata.gameEngine must be an object');
            return errors;
        }

        if (gameEngine.type && typeof gameEngine.type !== 'string') {
            errors.push('metadata.gameEngine.type must be a string');
        }

        if (gameEngine.config && typeof gameEngine.config !== 'object') {
            errors.push('metadata.gameEngine.config must be an object');
        }

        return errors;
    }

    /**
     * Validate render configuration
     * @param {Object} renderConfig - Render config
     * @returns {string[]} Array of error messages
     */
    static validateRenderConfig(renderConfig) {
        const errors = [];

        if (typeof renderConfig !== 'object') {
            errors.push('metadata.renderConfig must be an object');
            return errors;
        }

        // Validate color fields
        const colorFields = ['connectionColor', 'arrowColor'];
        colorFields.forEach(field => {
            if (renderConfig[field] && !this.isValidColor(renderConfig[field])) {
                errors.push(`metadata.renderConfig.${field} must be a valid CSS color`);
            }
        });

        // Validate number fields
        const numberFields = ['connectionThickness', 'arrowSize', 'arrowPositionSingle', 'arrowPositionBidirectional'];
        numberFields.forEach(field => {
            if (renderConfig[field] !== undefined && typeof renderConfig[field] !== 'number') {
                errors.push(`metadata.renderConfig.${field} must be a number`);
            }
        });

        return errors;
    }

    /**
     * Validate spaces array
     * @param {Array} spaces - Spaces array
     * @returns {string[]} Array of error messages
     */
    static validateSpaces(spaces) {
        const errors = [];

        if (!spaces) {
            errors.push('spaces array is required');
            return errors;
        }

        if (!Array.isArray(spaces)) {
            errors.push('spaces must be an array');
            return errors;
        }

        if (spaces.length === 0) {
            errors.push('spaces array must contain at least one space');
            return errors;
        }

        // Track space IDs for uniqueness check
        const spaceIds = new Set();

        spaces.forEach((space, index) => {
            const spaceErrors = this.validateSpace(space, index);
            errors.push(...spaceErrors);

            if (space.id) {
                if (spaceIds.has(space.id)) {
                    errors.push(`Duplicate space ID: ${space.id}`);
                } else {
                    spaceIds.add(space.id);
                }
            }
        });

        return errors;
    }

    /**
     * Validate a single space
     * @param {Object} space - Space object
     * @param {number} index - Index in spaces array
     * @returns {string[]} Array of error messages
     */
    static validateSpace(space, index) {
        const errors = [];
        const prefix = `spaces[${index}]`;

        if (!space || typeof space !== 'object') {
            errors.push(`${prefix} must be an object`);
            return errors;
        }

        // Required fields
        if (!space.id) {
            errors.push(`${prefix}.id is required`);
        } else if (typeof space.id !== 'string') {
            errors.push(`${prefix}.id must be a string`);
        }

        if (!space.name) {
            errors.push(`${prefix}.name is required`);
        } else if (typeof space.name !== 'string') {
            errors.push(`${prefix}.name must be a string`);
        }

        if (!space.visualDetails) {
            errors.push(`${prefix}.visualDetails is required`);
        } else {
            const visualErrors = this.validateVisualDetails(space.visualDetails, prefix);
            errors.push(...visualErrors);
        }

        // Optional fields
        if (space.connections) {
            if (!Array.isArray(space.connections)) {
                errors.push(`${prefix}.connections must be an array`);
            } else {
                space.connections.forEach((conn, connIndex) => {
                    const connErrors = this.validateConnection(conn, `${prefix}.connections[${connIndex}]`);
                    errors.push(...connErrors);
                });
            }
        }

        if (space.events) {
            if (!Array.isArray(space.events)) {
                errors.push(`${prefix}.events must be an array`);
            } else {
                space.events.forEach((event, eventIndex) => {
                    const eventErrors = this.validateEvent(event, `${prefix}.events[${eventIndex}]`);
                    errors.push(...eventErrors);
                });
            }
        }

        return errors;
    }

    /**
     * Validate visual details
     * @param {Object} visualDetails - Visual details object
     * @param {string} prefix - Error message prefix
     * @returns {string[]} Array of error messages
     */
    static validateVisualDetails(visualDetails, prefix) {
        const errors = [];
        const vdPrefix = `${prefix}.visualDetails`;

        if (typeof visualDetails !== 'object') {
            errors.push(`${vdPrefix} must be an object`);
            return errors;
        }

        // Required fields
        if (visualDetails.x === undefined) {
            errors.push(`${vdPrefix}.x is required`);
        } else if (typeof visualDetails.x !== 'number') {
            errors.push(`${vdPrefix}.x must be a number`);
        }

        if (visualDetails.y === undefined) {
            errors.push(`${vdPrefix}.y is required`);
        } else if (typeof visualDetails.y !== 'number') {
            errors.push(`${vdPrefix}.y must be a number`);
        }

        // Optional fields
        if (visualDetails.size !== undefined && typeof visualDetails.size !== 'number') {
            errors.push(`${vdPrefix}.size must be a number`);
        }

        if (visualDetails.color && !this.isValidColor(visualDetails.color)) {
            errors.push(`${vdPrefix}.color must be a valid CSS color`);
        }

        if (visualDetails.textColor && !this.isValidColor(visualDetails.textColor)) {
            errors.push(`${vdPrefix}.textColor must be a valid CSS color`);
        }

        if (visualDetails.borderColor && !this.isValidColor(visualDetails.borderColor)) {
            errors.push(`${vdPrefix}.borderColor must be a valid CSS color`);
        }

        if (visualDetails.borderWidth !== undefined && typeof visualDetails.borderWidth !== 'number') {
            errors.push(`${vdPrefix}.borderWidth must be a number`);
        }

        return errors;
    }

    /**
     * Validate a connection
     * @param {Object} connection - Connection object
     * @param {string} prefix - Error message prefix
     * @returns {string[]} Array of error messages
     */
    static validateConnection(connection, prefix) {
        const errors = [];

        if (!connection || typeof connection !== 'object') {
            errors.push(`${prefix} must be an object`);
            return errors;
        }

        if (!connection.targetId) {
            errors.push(`${prefix}.targetId is required`);
        } else if (typeof connection.targetId !== 'string') {
            errors.push(`${prefix}.targetId must be a string`);
        }

        if (connection.bidirectional !== undefined && typeof connection.bidirectional !== 'boolean') {
            errors.push(`${prefix}.bidirectional must be a boolean`);
        }

        return errors;
    }

    /**
     * Validate all connections reference existing spaces
     * @param {Array} spaces - Spaces array
     * @returns {string[]} Array of error messages
     */
    static validateConnections(spaces) {
        const errors = [];
        const spaceIds = new Set(spaces.map(s => s.id));

        spaces.forEach((space, spaceIndex) => {
            if (space.connections && Array.isArray(space.connections)) {
                space.connections.forEach((conn, connIndex) => {
                    if (conn.targetId && !spaceIds.has(conn.targetId)) {
                        errors.push(
                            `spaces[${spaceIndex}].connections[${connIndex}].targetId "${conn.targetId}" ` +
                            `does not reference an existing space`
                        );
                    }
                });
            }
        });

        return errors;
    }

    /**
     * Validate an event
     * @param {Object} event - Event object
     * @param {string} prefix - Error message prefix
     * @returns {string[]} Array of error messages
     */
    static validateEvent(event, prefix) {
        const errors = [];

        if (!event || typeof event !== 'object') {
            errors.push(`${prefix} must be an object`);
            return errors;
        }

        if (!event.trigger) {
            errors.push(`${prefix}.trigger is required`);
        } else {
            const triggerErrors = this.validateTrigger(event.trigger, `${prefix}.trigger`);
            errors.push(...triggerErrors);
        }

        if (!event.action) {
            errors.push(`${prefix}.action is required`);
        } else {
            const actionErrors = this.validateAction(event.action, `${prefix}.action`);
            errors.push(...actionErrors);
        }

        if (event.priority) {
            const validPriorities = ['LOW', 'MID', 'HIGH', 'CRITICAL'];
            if (!validPriorities.includes(event.priority)) {
                errors.push(`${prefix}.priority must be one of: ${validPriorities.join(', ')}`);
            }
        }

        return errors;
    }

    /**
     * Validate a trigger
     * @param {Object} trigger - Trigger object
     * @param {string} prefix - Error message prefix
     * @returns {string[]} Array of error messages
     */
    static validateTrigger(trigger, prefix) {
        const errors = [];

        if (!trigger || typeof trigger !== 'object') {
            errors.push(`${prefix} must be an object`);
            return errors;
        }

        if (!trigger.type) {
            errors.push(`${prefix}.type is required`);
        } else if (typeof trigger.type !== 'string') {
            errors.push(`${prefix}.type must be a string`);
        }

        // data field is optional but must be an object if present
        if (trigger.data !== undefined && typeof trigger.data !== 'object') {
            errors.push(`${prefix}.data must be an object`);
        }

        return errors;
    }

    /**
     * Validate an action
     * @param {Object} action - Action object
     * @param {string} prefix - Error message prefix
     * @returns {string[]} Array of error messages
     */
    static validateAction(action, prefix) {
        const errors = [];

        if (!action || typeof action !== 'object') {
            errors.push(`${prefix} must be an object`);
            return errors;
        }

        if (!action.type) {
            errors.push(`${prefix}.type is required`);
        } else if (typeof action.type !== 'string') {
            errors.push(`${prefix}.type must be a string`);
        }

        // payload field is optional but must be an object if present
        if (action.payload !== undefined && typeof action.payload !== 'object') {
            errors.push(`${prefix}.payload must be an object`);
        }

        return errors;
    }

    /**
     * Check if a string is a valid CSS color
     * @param {string} color - Color string
     * @returns {boolean} True if valid
     */
    static isValidColor(color) {
        if (typeof color !== 'string') return false;

        // Check hex colors
        if (/^#[0-9A-Fa-f]{3}$/.test(color)) return true; // #RGB
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) return true; // #RRGGBB
        if (/^#[0-9A-Fa-f]{8}$/.test(color)) return true; // #RRGGBBAA

        // Check rgb/rgba
        if (/^rgba?\(/.test(color)) return true;

        // Check hsl/hsla
        if (/^hsla?\(/.test(color)) return true;

        // Check named colors (common ones)
        const namedColors = [
            'transparent', 'black', 'white', 'red', 'green', 'blue',
            'yellow', 'cyan', 'magenta', 'gray', 'grey'
        ];
        if (namedColors.includes(color.toLowerCase())) return true;

        return false;
    }

    /**
     * Validate board and provide detailed report
     * @param {Object} boardJson - Board JSON to validate
     * @returns {Object} Detailed validation report
     */
    static validateDetailed(boardJson) {
        const result = this.validate(boardJson);

        return {
            ...result,
            summary: {
                totalSpaces: boardJson.spaces?.length || 0,
                totalConnections: boardJson.spaces?.reduce((sum, space) =>
                    sum + (space.connections?.length || 0), 0) || 0,
                totalEvents: boardJson.spaces?.reduce((sum, space) =>
                    sum + (space.events?.length || 0), 0) || 0,
                engineType: boardJson.metadata?.gameEngine?.type || 'turn-based',
                hasCustomRenderConfig: !!boardJson.metadata?.renderConfig
            }
        };
    }
}
