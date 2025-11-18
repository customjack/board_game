/**
 * SchemaValidator - Utility for validating objects against payload schemas
 *
 * This validator is used to validate actions and effects against their
 * metadata schemas, providing detailed error messages for the board creator tool.
 */
export default class SchemaValidator {
    /**
     * Validate a value against a schema definition
     * @param {*} value - The value to validate
     * @param {Object} schema - The schema definition
     * @param {string} fieldName - The name of the field being validated
     * @returns {string[]} Array of error messages (empty if valid)
     */
    static validateField(value, schema, fieldName) {
        const errors = [];

        // Check if field is required and missing
        if (schema.required && (value === undefined || value === null)) {
            errors.push(`${fieldName} is required`);
            return errors; // Return early if required field is missing
        }

        // If field is optional and not provided, skip validation
        if (!schema.required && (value === undefined || value === null)) {
            return errors;
        }

        // Type validation
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (schema.type && actualType !== schema.type) {
            errors.push(`${fieldName} must be of type ${schema.type}, got ${actualType}`);
            return errors; // Return early if type is wrong
        }

        // String validations
        if (schema.type === 'string') {
            if (schema.minLength !== undefined && value.length < schema.minLength) {
                errors.push(`${fieldName} must be at least ${schema.minLength} characters long`);
            }
            if (schema.maxLength !== undefined && value.length > schema.maxLength) {
                errors.push(`${fieldName} must be at most ${schema.maxLength} characters long`);
            }
            if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
                errors.push(`${fieldName} does not match the required pattern`);
            }
            if (schema.enum && !schema.enum.includes(value)) {
                errors.push(`${fieldName} must be one of: ${schema.enum.join(', ')}`);
            }
        }

        // Number validations
        if (schema.type === 'number') {
            if (schema.min !== undefined && value < schema.min) {
                errors.push(`${fieldName} must be at least ${schema.min}`);
            }
            if (schema.max !== undefined && value > schema.max) {
                errors.push(`${fieldName} must be at most ${schema.max}`);
            }
            if (schema.integer && !Number.isInteger(value)) {
                errors.push(`${fieldName} must be an integer`);
            }
        }

        // Array validations
        if (schema.type === 'array') {
            if (schema.minItems !== undefined && value.length < schema.minItems) {
                errors.push(`${fieldName} must have at least ${schema.minItems} items`);
            }
            if (schema.maxItems !== undefined && value.length > schema.maxItems) {
                errors.push(`${fieldName} must have at most ${schema.maxItems} items`);
            }
            if (schema.items) {
                value.forEach((item, index) => {
                    const itemErrors = this.validateField(item, schema.items, `${fieldName}[${index}]`);
                    errors.push(...itemErrors);
                });
            }
        }

        // Object validations
        if (schema.type === 'object' && schema.properties) {
            Object.entries(schema.properties).forEach(([propName, propSchema]) => {
                const propErrors = this.validateField(
                    value[propName],
                    propSchema,
                    `${fieldName}.${propName}`
                );
                errors.push(...propErrors);
            });
        }

        return errors;
    }

    /**
     * Validate an object against a payload schema
     * @param {Object} payload - The payload to validate
     * @param {Object} payloadSchema - The schema definition
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    static validatePayload(payload, payloadSchema) {
        const errors = [];

        if (!payloadSchema || typeof payloadSchema !== 'object') {
            return { valid: true, errors: [] }; // No schema to validate against
        }

        // Validate each field in the schema
        Object.entries(payloadSchema).forEach(([fieldName, fieldSchema]) => {
            const fieldValue = payload ? payload[fieldName] : undefined;
            const fieldErrors = this.validateField(fieldValue, fieldSchema, fieldName);
            errors.push(...fieldErrors);
        });

        // Check for unknown fields if schema is strict
        if (payload && payloadSchema._strict) {
            const schemaFields = Object.keys(payloadSchema).filter(k => !k.startsWith('_'));
            const unknownFields = Object.keys(payload).filter(k => !schemaFields.includes(k));
            if (unknownFields.length > 0) {
                errors.push(`Unknown fields: ${unknownFields.join(', ')}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate an action instance
     * @param {BaseAction} action - The action to validate
     * @param {Object} factoryManager - The factory manager to get metadata
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    static validateAction(action, factoryManager) {
        const errors = [];

        if (!action) {
            return { valid: false, errors: ['Action is null or undefined'] };
        }

        // Use the action's own validate method if available
        if (typeof action.validate === 'function') {
            const actionValidation = action.validate();
            if (!actionValidation.valid) {
                errors.push(...actionValidation.errors);
            }
        }

        // Get metadata from ActionFactory for additional schema validation
        const actionFactory = factoryManager?.getFactory('ActionFactory');
        if (actionFactory) {
            const metadata = actionFactory.getMetadata(action.type);
            if (metadata && metadata.payloadSchema) {
                const schemaValidation = this.validatePayload(action.payload, metadata.payloadSchema);
                if (!schemaValidation.valid) {
                    errors.push(...schemaValidation.errors);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate an effect instance
     * @param {PlayerEffect} effect - The effect to validate
     * @param {Object} factoryManager - The factory manager to get metadata
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    static validateEffect(effect, factoryManager) {
        const errors = [];

        if (!effect) {
            return { valid: false, errors: ['Effect is null or undefined'] };
        }

        // Use the effect's own validate method if available
        if (typeof effect.validate === 'function') {
            const effectValidation = effect.validate();
            if (!effectValidation.valid) {
                errors.push(...effectValidation.errors);
            }
        }

        // Get metadata from EffectFactory for additional schema validation
        const effectFactory = factoryManager?.getFactory('EffectFactory');
        if (effectFactory) {
            const effectType = effect.constructor.name;
            const metadata = effectFactory.getMetadata(effectType);
            if (metadata && metadata.payloadSchema) {
                // Convert effect properties to a payload object for schema validation
                const payload = {
                    id: effect.id,
                    duration: effect.duration,
                    toRemove: effect.toRemove,
                    // Add any additional effect-specific properties
                    ...Object.fromEntries(
                        Object.entries(effect).filter(([key]) =>
                            !['id', 'duration', 'toRemove'].includes(key)
                        )
                    )
                };
                const schemaValidation = this.validatePayload(payload, metadata.payloadSchema);
                if (!schemaValidation.valid) {
                    errors.push(...schemaValidation.errors);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate a board space configuration
     * @param {Object} space - The space object to validate
     * @param {Object} factoryManager - The factory manager to get metadata
     * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
     */
    static validateSpace(space, factoryManager) {
        const errors = [];
        const warnings = [];

        if (!space) {
            return { valid: false, errors: ['Space is null or undefined'], warnings: [] };
        }

        // Validate basic space properties
        if (!space.id || typeof space.id !== 'string') {
            errors.push('Space must have a valid id (string)');
        }

        if (space.x === undefined || typeof space.x !== 'number') {
            errors.push('Space must have a valid x coordinate (number)');
        }

        if (space.y === undefined || typeof space.y !== 'number') {
            errors.push('Space must have a valid y coordinate (number)');
        }

        // Validate actions array
        if (space.actions) {
            if (!Array.isArray(space.actions)) {
                errors.push('Space.actions must be an array');
            } else {
                space.actions.forEach((action, index) => {
                    if (!action || !action.type) {
                        errors.push(`Space action at index ${index} is missing type`);
                    }
                    // Note: Full action validation would require creating action instances
                    // which is better done at runtime or in the board creator tool
                });
            }
        }

        // Validate effects array
        if (space.effects) {
            if (!Array.isArray(space.effects)) {
                errors.push('Space.effects must be an array');
            } else {
                space.effects.forEach((effect, index) => {
                    if (!effect || !effect.type) {
                        errors.push(`Space effect at index ${index} is missing type`);
                    }
                });
            }
        }

        // Warnings for optional but recommended fields
        if (!space.label) {
            warnings.push('Space is missing a label (recommended for better UX)');
        }

        if (!space.color) {
            warnings.push('Space is missing a color (will use default)');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate an entire board configuration
     * @param {Object} board - The board object to validate
     * @param {Object} factoryManager - The factory manager to get metadata
     * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
     */
    static validateBoard(board, factoryManager) {
        const errors = [];
        const warnings = [];

        if (!board) {
            return { valid: false, errors: ['Board is null or undefined'], warnings: [] };
        }

        // Validate board name
        if (!board.name || typeof board.name !== 'string') {
            errors.push('Board must have a valid name (string)');
        }

        // Validate spaces array
        if (!board.spaces || !Array.isArray(board.spaces)) {
            errors.push('Board must have a spaces array');
        } else {
            if (board.spaces.length === 0) {
                errors.push('Board must have at least one space');
            }

            // Validate each space
            board.spaces.forEach((space, index) => {
                const spaceValidation = this.validateSpace(space, factoryManager);
                if (!spaceValidation.valid) {
                    spaceValidation.errors.forEach(error => {
                        errors.push(`Space ${index} (${space?.id || 'unknown'}): ${error}`);
                    });
                }
                spaceValidation.warnings.forEach(warning => {
                    warnings.push(`Space ${index} (${space?.id || 'unknown'}): ${warning}`);
                });
            });

            // Check for duplicate space IDs
            const spaceIds = board.spaces.map(s => s.id).filter(Boolean);
            const duplicateIds = spaceIds.filter((id, index) => spaceIds.indexOf(id) !== index);
            if (duplicateIds.length > 0) {
                errors.push(`Duplicate space IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
            }
        }

        // Validate game rules if present
        if (board.gameRules) {
            if (typeof board.gameRules !== 'object') {
                errors.push('Board.gameRules must be an object');
            } else {
                // Validate player count
                if (board.gameRules.minPlayers !== undefined) {
                    if (typeof board.gameRules.minPlayers !== 'number' || board.gameRules.minPlayers < 1) {
                        errors.push('gameRules.minPlayers must be a number >= 1');
                    }
                }
                if (board.gameRules.maxPlayers !== undefined) {
                    if (typeof board.gameRules.maxPlayers !== 'number' || board.gameRules.maxPlayers < 1) {
                        errors.push('gameRules.maxPlayers must be a number >= 1');
                    }
                }
                if (board.gameRules.minPlayers && board.gameRules.maxPlayers) {
                    if (board.gameRules.minPlayers > board.gameRules.maxPlayers) {
                        errors.push('gameRules.minPlayers cannot be greater than maxPlayers');
                    }
                }
            }
        }

        // Warnings for optional but recommended fields
        if (!board.description) {
            warnings.push('Board is missing a description (recommended for better UX)');
        }

        if (!board.gameRules) {
            warnings.push('Board is missing gameRules (recommended for better game setup)');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
}
