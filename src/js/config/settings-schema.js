/**
 * Settings Schema Configuration
 *
 * Centralized metadata for all game settings. Add new settings here and
 * the UI and validation will be automatically handled.
 *
 * Schema Structure:
 * - id: Unique identifier (used for DOM IDs and property names)
 * - type: Input type (number, boolean, text, select, range)
 * - label: Display label for the setting
 * - description: Tooltip/help text
 * - defaultValue: Default value when creating new Settings
 * - category: Group settings by category
 * - constraints: Validation rules (min, max, options, etc.)
 * - readonly: Can be changed only before game starts
 */

export const SETTING_CATEGORIES = {
    PLAYERS: 'players',
    TIMING: 'timing',
    UI: 'ui',
    ADVANCED: 'advanced'
};

export const SETTING_TYPES = {
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    TEXT: 'text',
    SELECT: 'select',
    RANGE: 'range'
};

/**
 * Game Settings Schema
 * These settings are synchronized across the network
 */
export const GAME_SETTINGS_SCHEMA = [
    {
        id: 'playerLimitPerPeer',
        type: SETTING_TYPES.NUMBER,
        label: 'Max Players per Peer',
        description: 'Maximum number of players a single peer can control',
        defaultValue: 1,
        category: SETTING_CATEGORIES.PLAYERS,
        constraints: {
            min: 1,
            max: 10,
            step: 1
        },
        readonly: false
    },
    {
        id: 'playerLimit',
        type: SETTING_TYPES.NUMBER,
        label: 'Total Player Limit',
        description: 'Maximum total number of players in the game',
        defaultValue: 8,
        category: SETTING_CATEGORIES.PLAYERS,
        constraints: {
            min: 1,
            max: 100,
            step: 1
        },
        readonly: false
    },
    {
        id: 'allowPlayerNameChange',
        type: SETTING_TYPES.BOOLEAN,
        label: 'Allow Player Name Changes',
        description: 'Players can change their own nicknames',
        defaultValue: true,
        category: SETTING_CATEGORIES.PLAYERS,
        constraints: {},
        readonly: false
    },
    {
        id: 'allowPlayerColorChange',
        type: SETTING_TYPES.BOOLEAN,
        label: 'Allow Player Color Changes',
        description: 'Players can adjust their own piece colors',
        defaultValue: true,
        category: SETTING_CATEGORIES.PLAYERS,
        constraints: {},
        readonly: false
    },
    {
        id: 'allowPeerColorChange',
        type: SETTING_TYPES.BOOLEAN,
        label: 'Allow Border Color Changes',
        description: 'Players can adjust their own border colors',
        defaultValue: true,
        category: SETTING_CATEGORIES.PLAYERS,
        constraints: {},
        readonly: false
    },
    {
        id: 'turnTimerEnabled',
        type: SETTING_TYPES.BOOLEAN,
        label: 'Enable Turn Timer',
        description: 'Limit time for each player turn',
        defaultValue: false,
        category: SETTING_CATEGORIES.TIMING,
        constraints: {},
        readonly: false
    },
    {
        id: 'turnTimer',
        type: SETTING_TYPES.NUMBER,
        label: 'Turn Timer Duration',
        description: 'Time limit per turn in seconds',
        defaultValue: 150,
        category: SETTING_CATEGORIES.TIMING,
        constraints: {
            min: 5,
            max: 300,
            step: 5
        },
        unit: 'seconds',
        readonly: false,
        dependsOn: {
            setting: 'turnTimerEnabled',
            value: true
        }
    },
    {
        id: 'moveDelay',
        type: SETTING_TYPES.NUMBER,
        label: 'Move Animation Delay',
        description: 'Delay between move animations in milliseconds',
        defaultValue: 300,
        category: SETTING_CATEGORIES.UI,
        constraints: {
            min: 100,
            max: 5000,
            step: 50
        },
        unit: 'ms',
        readonly: false
    },
    {
        id: 'modalTimeoutSeconds',
        type: SETTING_TYPES.NUMBER,
        label: 'Modal Auto-Dismiss',
        description: 'Automatically dismiss modals after X seconds (0 = disabled)',
        defaultValue: 15,
        category: SETTING_CATEGORIES.UI,
        constraints: {
            min: 0,
            max: 300,
            step: 5
        },
        unit: 'seconds',
        readonly: false
    },
    {
        id: 'connectionIdleTimeoutSeconds',
        type: SETTING_TYPES.NUMBER,
        label: 'Connection Idle Timeout',
        description: 'Seconds without heartbeat before reconnect is attempted (set higher to survive background tabs)',
        defaultValue: 900,
        category: SETTING_CATEGORIES.ADVANCED,
        constraints: {
            min: 60,
            max: 3600,
            step: 30
        },
        unit: 'seconds',
        readonly: false
    }
];

/**
 * Get setting schema by ID
 * @param {string} settingId - Setting identifier
 * @returns {Object|null} Setting schema or null if not found
 */
export function getSettingSchema(settingId) {
    return GAME_SETTINGS_SCHEMA.find(s => s.id === settingId) || null;
}

/**
 * Get all settings for a category
 * @param {string} category - Category name
 * @returns {Array} Array of setting schemas
 */
export function getSettingsByCategory(category) {
    return GAME_SETTINGS_SCHEMA.filter(s => s.category === category);
}

/**
 * Get default values for all settings
 * @returns {Object} Object with setting IDs as keys and default values
 */
export function getDefaultSettings() {
    const defaults = {};
    GAME_SETTINGS_SCHEMA.forEach(setting => {
        defaults[setting.id] = setting.defaultValue;
    });
    return defaults;
}

/**
 * Validate a setting value against its schema
 * @param {string} settingId - Setting identifier
 * @param {any} value - Value to validate
 * @returns {Object} {valid: boolean, value: any, error: string|null}
 */
export function validateSetting(settingId, value) {
    const schema = getSettingSchema(settingId);

    if (!schema) {
        return {
            valid: false,
            value: value,
            error: `Unknown setting: ${settingId}`
        };
    }

    let validatedValue = value;
    let error = null;

    switch (schema.type) {
        case SETTING_TYPES.NUMBER:
        case SETTING_TYPES.RANGE:
            validatedValue = Number(value);
            if (isNaN(validatedValue)) {
                error = `${schema.label} must be a number`;
                validatedValue = schema.defaultValue;
            } else {
                // Apply constraints
                if (schema.constraints.min !== undefined && validatedValue < schema.constraints.min) {
                    validatedValue = schema.constraints.min;
                }
                if (schema.constraints.max !== undefined && validatedValue > schema.constraints.max) {
                    validatedValue = schema.constraints.max;
                }
            }
            break;

        case SETTING_TYPES.BOOLEAN:
            validatedValue = Boolean(value);
            break;

        case SETTING_TYPES.SELECT:
            if (schema.constraints.options) {
                const validOptions = schema.constraints.options.map(opt =>
                    typeof opt === 'string' ? opt : opt.value
                );
                if (!validOptions.includes(value)) {
                    error = `${schema.label} must be one of: ${validOptions.join(', ')}`;
                    validatedValue = schema.defaultValue;
                }
            }
            break;

        case SETTING_TYPES.TEXT:
            validatedValue = String(value);
            if (schema.constraints.maxLength && validatedValue.length > schema.constraints.maxLength) {
                validatedValue = validatedValue.substring(0, schema.constraints.maxLength);
            }
            break;
    }

    return {
        valid: error === null,
        value: validatedValue,
        error: error
    };
}

/**
 * Validate all settings in an object
 * @param {Object} settings - Settings object to validate
 * @returns {Object} {valid: boolean, settings: Object, errors: Array}
 */
export function validateAllSettings(settings) {
    const validatedSettings = {};
    const errors = [];

    GAME_SETTINGS_SCHEMA.forEach(schema => {
        const value = settings[schema.id] !== undefined ? settings[schema.id] : schema.defaultValue;
        const result = validateSetting(schema.id, value);

        validatedSettings[schema.id] = result.value;

        if (!result.valid) {
            errors.push({
                setting: schema.id,
                error: result.error
            });
        }
    });

    return {
        valid: errors.length === 0,
        settings: validatedSettings,
        errors: errors
    };
}
