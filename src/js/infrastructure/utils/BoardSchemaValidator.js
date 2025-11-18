/**
 * BoardSchemaValidator - Validates board JSON against the v2.0 schema
 *
 * Ensures board JSON files are properly formatted and contain valid data
 * before being loaded into the game.
 *
 * v2.0 Format Changes:
 * - No metadata wrapper - top-level properties
 * - Uses 'visual' instead of 'visualDetails'
 * - Uses 'triggers' instead of 'events'
 * - Space IDs must be strings
 */
export default class BoardSchemaValidator {
    /**
     * Normalize incoming board/game definition JSON into a common structure
     * @param {Object} boardJson
     * @returns {Object|null}
     */
    static normalizeBoardJson(boardJson) {
        if (!boardJson || typeof boardJson !== 'object') {
            return null;
        }

        const isGameDefinition = boardJson.type === 'game' || boardJson.board;

        if (isGameDefinition) {
            const metadata = boardJson.metadata ?? null;
            const requirements = boardJson.requirements || {};
            const boardSection = boardJson.board || {};
            const topology = boardSection.topology || {};
            const spaces = Array.isArray(topology.spaces) ? topology.spaces : [];

            return {
                format: 'game',
                raw: boardJson,
                metadata,
                requirements,
                engine: boardJson.engine || {},
                ui: boardJson.ui || {},
                rules: boardJson.rules || {},
                spaces,
                renderConfig: boardSection.rendering || boardSection.renderConfig || {}
            };
        }

        const metadata = boardJson.metadata || {};

        return {
            format: 'legacy',
            raw: boardJson,
            metadata: {
                name: boardJson.name ?? metadata.name,
                author: boardJson.author ?? metadata.author,
                description: boardJson.description ?? metadata.description,
                created: boardJson.created ?? metadata.createdDate,
                modified: boardJson.modified ?? metadata.modified,
                version: boardJson.version ?? metadata.version,
                tags: boardJson.tags ?? metadata.tags,
                renderConfig: boardJson.renderConfig ?? metadata.renderConfig
            },
            requirements: {
                minPlayers: boardJson.gameRules?.minPlayers,
                maxPlayers: boardJson.gameRules?.maxPlayers
            },
            engine: boardJson.gameEngine ?? metadata.gameEngine ?? {},
            ui: boardJson.ui || {},
            rules: boardJson.gameRules || {},
            spaces: Array.isArray(boardJson.spaces) ? boardJson.spaces : [],
            renderConfig: boardJson.renderConfig ?? metadata.renderConfig ?? {}
        };
    }
    /**
     * Validate a complete board JSON object
     * @param {Object} boardJson - The board JSON to validate
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    static validate(boardJson) {
        const normalized = this.normalizeBoardJson(boardJson);
        if (!normalized) {
            return { valid: false, errors: ['Game definition must be an object'] };
        }

        const errors = [];

        errors.push(...this.validateMetadataSection(normalized.metadata));
        errors.push(...this.validateRequirementsSection(normalized.requirements));
        errors.push(...this.validateGameEngine(normalized.engine));

        if (normalized.ui && Object.keys(normalized.ui).length > 0) {
            errors.push(...this.validateUIConfig(normalized.ui));
        }

        errors.push(...this.validateRules(normalized.rules, normalized.requirements));
        errors.push(...this.validateSpaces(normalized.spaces));

        if (normalized.spaces.length > 0) {
            errors.push(...this.validateConnections(normalized.spaces));
        }

        if (normalized.renderConfig && Object.keys(normalized.renderConfig).length > 0) {
            errors.push(...this.validateRenderConfig(normalized.renderConfig));
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate top-level metadata fields (v2.0 format)
     * @param {Object} boardJson - Board JSON object
     * @returns {string[]} Array of error messages
     */
    static validateMetadataSection(metadata) {
        const errors = [];

        if (!metadata || typeof metadata !== 'object') {
            errors.push('metadata section is required');
            return errors;
        }

        if (metadata.name !== undefined && typeof metadata.name !== 'string') {
            errors.push('metadata.name must be a string');
        }

        if (metadata.author !== undefined && typeof metadata.author !== 'string') {
            errors.push('metadata.author must be a string');
        }

        if (metadata.description !== undefined && typeof metadata.description !== 'string') {
            errors.push('metadata.description must be a string');
        }

        if (metadata.created !== undefined && typeof metadata.created !== 'string') {
            errors.push('metadata.created must be a string (ISO 8601 format)');
        }

        if (metadata.modified !== undefined && typeof metadata.modified !== 'string') {
            errors.push('metadata.modified must be a string (ISO 8601 format)');
        }

        if (metadata.tags && !Array.isArray(metadata.tags)) {
            errors.push('metadata.tags must be an array');
        }

        return errors;
    }

    /**
     * Validate requirements section (plugins, player counts)
     * @param {Object} requirements
     * @returns {string[]}
     */
    static validateRequirementsSection(requirements) {
        const errors = [];

        if (!requirements) {
            return errors;
        }

        if (requirements.minPlayers !== undefined && (typeof requirements.minPlayers !== 'number' || requirements.minPlayers < 1)) {
            errors.push('requirements.minPlayers must be a positive number');
        }

        if (requirements.maxPlayers !== undefined && (typeof requirements.maxPlayers !== 'number' || requirements.maxPlayers < 1)) {
            errors.push('requirements.maxPlayers must be a positive number');
        }

        if (requirements.minPlayers !== undefined &&
            requirements.maxPlayers !== undefined &&
            requirements.minPlayers > requirements.maxPlayers) {
            errors.push('requirements.minPlayers cannot be greater than maxPlayers');
        }

        if (requirements.plugins && !Array.isArray(requirements.plugins)) {
            errors.push('requirements.plugins must be an array');
        }

        return errors;
    }

    /**
     * Validate UI configuration section
     * @param {Object} ui
     * @returns {string[]}
     */
    static validateUIConfig(ui) {
        const errors = [];

        if (typeof ui !== 'object') {
            errors.push('ui section must be an object');
            return errors;
        }

        if (ui.components && !Array.isArray(ui.components)) {
            errors.push('ui.components must be an array');
        }

        return errors;
    }

    /**
     * Validate game rules configuration
     * @param {Object} gameRules - Game rules config
     * @returns {string[]} Array of error messages
     */
    static validateRules(rules = {}, requirements = {}) {
        const errors = [];

        if (rules && typeof rules !== 'object') {
            errors.push('rules section must be an object');
            return errors;
        }

        if (rules.recommendedPlayers && typeof rules.recommendedPlayers !== 'object') {
            errors.push('rules.recommendedPlayers must be an object');
        }

        if (rules.startingPositions !== undefined) {
            if (typeof rules.startingPositions !== 'object') {
                errors.push('gameRules.startingPositions must be an object');
                errors.push('rules.startingPositions must be an object');
            } else {
                errors.push(...this.validateStartingPositions(rules.startingPositions));
            }
        }

        if (rules.winCondition) {
            if (typeof rules.winCondition !== 'object') {
                errors.push('rules.winCondition must be an object');
            } else if (!rules.winCondition.type) {
                errors.push('rules.winCondition.type is required');
            }
        }

        if (requirements.minPlayers !== undefined && typeof requirements.minPlayers !== 'number') {
            errors.push('requirements.minPlayers must be a number');
        }

        if (requirements.maxPlayers !== undefined && typeof requirements.maxPlayers !== 'number') {
            errors.push('requirements.maxPlayers must be a number');
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
            errors.push('rules.startingPositions must be an object');
            return errors;
        }

        // Validate mode
        if (positions.mode) {
            const validModes = ['single', 'spread', 'random', 'custom', 'multiple'];
            if (!validModes.includes(positions.mode)) {
                errors.push(`rules.startingPositions.mode must be one of: ${validModes.join(', ')}`);
            }
        }

        // Validate spaceIds
        if (positions.spaceIds) {
            if (!Array.isArray(positions.spaceIds)) {
                errors.push('rules.startingPositions.spaceIds must be an array');
            } else if (positions.spaceIds.length === 0) {
                errors.push('rules.startingPositions.spaceIds cannot be empty');
            }
        }

        if (positions.startZones && typeof positions.startZones !== 'object') {
            errors.push('rules.startingPositions.startZones must be an object');
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
            errors.push('gameEngine must be an object');
            return errors;
        }

        if (gameEngine.type && typeof gameEngine.type !== 'string') {
            errors.push('gameEngine.type must be a string');
        }

        if (gameEngine.config && typeof gameEngine.config !== 'object') {
            errors.push('gameEngine.config must be an object');
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
            errors.push('renderConfig must be an object');
            return errors;
        }

        // Validate color fields
        const colorFields = ['connectionColor', 'arrowColor', 'backgroundColor'];
        colorFields.forEach(field => {
            if (renderConfig[field] && !this.isValidColor(renderConfig[field])) {
                errors.push(`renderConfig.${field} must be a valid CSS color`);
            }
        });

        // Validate number fields
        const numberFields = ['connectionThickness', 'arrowSize', 'gridSize'];
        numberFields.forEach(field => {
            if (renderConfig[field] !== undefined && typeof renderConfig[field] !== 'number') {
                errors.push(`renderConfig.${field} must be a number`);
            }
        });

        // Validate boolean fields
        if (renderConfig.gridEnabled !== undefined && typeof renderConfig.gridEnabled !== 'boolean') {
            errors.push('renderConfig.gridEnabled must be a boolean');
        }

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
            errors.push('board.topology.spaces is required');
            return errors;
        }

        if (!Array.isArray(spaces)) {
            errors.push('board.topology.spaces must be an array');
            return errors;
        }

        if (spaces.length === 0) {
            errors.push('board.topology.spaces must contain at least one space');
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
     * Validate a single space (v2.0 format)
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

        const legacyVisual = space.visualDetails;
        const positionData = space.position || (legacyVisual ? { x: legacyVisual.x, y: legacyVisual.y } : null);
        const visualData = space.visual || legacyVisual;

        if (!positionData) {
            errors.push(`${prefix}.position is required`);
        } else {
            const posErrors = this.validatePosition(positionData, prefix);
            errors.push(...posErrors);
        }

        if (!visualData) {
            errors.push(`${prefix}.visual is required`);
        } else {
            const visualErrors = this.validateVisual(visualData, prefix);
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

        // Validate triggers (v2.0) or events (v1.0) for backward compatibility
        const triggerData = space.triggers || space.events;
        if (triggerData) {
            if (!Array.isArray(triggerData)) {
                errors.push(`${prefix}.triggers must be an array`);
            } else {
                triggerData.forEach((trigger, triggerIndex) => {
                    const triggerErrors = this.validateTrigger(trigger, `${prefix}.triggers[${triggerIndex}]`);
                    errors.push(...triggerErrors);
                });
            }
        }

        return errors;
    }

    /**
     * Validate position object
     * @param {Object} position - Position object
     * @param {string} prefix - Error message prefix
     * @returns {string[]} Array of error messages
     */
    static validatePosition(position, prefix) {
        const errors = [];

        if (typeof position !== 'object') {
            errors.push(`${prefix}.position must be an object`);
            return errors;
        }

        if (position.x === undefined) {
            errors.push(`${prefix}.position.x is required`);
        } else if (typeof position.x !== 'number') {
            errors.push(`${prefix}.position.x must be a number`);
        }

        if (position.y === undefined) {
            errors.push(`${prefix}.position.y is required`);
        } else if (typeof position.y !== 'number') {
            errors.push(`${prefix}.position.y must be a number`);
        }

        return errors;
    }

    /**
     * Validate visual details (v2.0 format)
     * @param {Object} visual - Visual object
     * @param {string} prefix - Error message prefix
     * @returns {string[]} Array of error messages
     */
    static validateVisual(visual, prefix) {
        const errors = [];

        if (typeof visual !== 'object') {
            errors.push(`${prefix}.visual must be an object`);
            return errors;
        }

        // Optional fields
        if (visual.size !== undefined && typeof visual.size !== 'number') {
            errors.push(`${prefix}.visual.size must be a number`);
        }

        if (visual.color && !this.isValidColor(visual.color)) {
            errors.push(`${prefix}.visual.color must be a valid CSS color`);
        }

        if (visual.textColor && !this.isValidColor(visual.textColor)) {
            errors.push(`${prefix}.visual.textColor must be a valid CSS color`);
        }

        if (visual.borderColor && !this.isValidColor(visual.borderColor)) {
            errors.push(`${prefix}.visual.borderColor must be a valid CSS color`);
        }

        if (visual.borderWidth !== undefined && typeof visual.borderWidth !== 'number') {
            errors.push(`${prefix}.visual.borderWidth must be a number`);
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

        if (connection.draw !== undefined && typeof connection.draw !== 'boolean') {
            errors.push(`${prefix}.draw must be a boolean`);
        }

        if (connection.weight !== undefined && typeof connection.weight !== 'number') {
            errors.push(`${prefix}.weight must be a number`);
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
     * Validate a trigger (v2.0 format)
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

        // Validate 'when' (trigger condition)
        if (!trigger.when) {
            errors.push(`${prefix}.when is required`);
        } else {
            const whenErrors = this.validateWhen(trigger.when, `${prefix}.when`);
            errors.push(...whenErrors);
        }

        // Validate 'action'
        if (!trigger.action) {
            errors.push(`${prefix}.action is required`);
        } else {
            const actionErrors = this.validateAction(trigger.action, `${prefix}.action`);
            errors.push(...actionErrors);
        }

        // Validate priority
        if (trigger.priority) {
            const validPriorities = ['LOW', 'MID', 'HIGH', 'CRITICAL'];
            if (!validPriorities.includes(trigger.priority)) {
                errors.push(`${prefix}.priority must be one of: ${validPriorities.join(', ')}`);
            }
        }

        return errors;
    }

    /**
     * Validate a 'when' condition
     * @param {Object} when - When object
     * @param {string} prefix - Error message prefix
     * @returns {string[]} Array of error messages
     */
    static validateWhen(when, prefix) {
        const errors = [];

        if (!when || typeof when !== 'object') {
            errors.push(`${prefix} must be an object`);
            return errors;
        }

        if (!when.type) {
            errors.push(`${prefix}.type is required`);
        } else if (typeof when.type !== 'string') {
            errors.push(`${prefix}.type must be a string`);
        }

        // payload field is optional but must be an object if present
        if (when.payload !== undefined && when.payload !== null && typeof when.payload !== 'object') {
            errors.push(`${prefix}.payload must be an object or null`);
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
            'yellow', 'cyan', 'magenta', 'gray', 'grey', 'orange',
            'purple', 'pink', 'brown', 'silver', 'gold'
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
        const normalized = this.normalizeBoardJson(boardJson);
        const result = this.validate(boardJson);

        const spaces = normalized?.spaces || [];
        return {
            ...result,
            summary: {
                totalSpaces: spaces.length,
                totalConnections: spaces.reduce((sum, space) =>
                    sum + (space.connections?.length || 0), 0),
                totalTriggers: spaces.reduce((sum, space) =>
                    sum + ((space.triggers || space.events)?.length || 0), 0),
                engineType: normalized?.engine?.type || 'turn-based',
                hasCustomRenderConfig: !!(normalized?.renderConfig && Object.keys(normalized.renderConfig).length > 0),
                version: normalized?.raw?.version || '1.0.0'
            }
        };
    }
}
