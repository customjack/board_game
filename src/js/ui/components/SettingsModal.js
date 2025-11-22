import SettingsBaseModal from '../modals/SettingsBaseModal.js';
import {
    GAME_SETTINGS_SCHEMA,
    SETTING_CATEGORIES,
    SETTING_TYPES,
    getSettingsByCategory
} from '../../config/settings-schema.js';

export default class SettingsModal extends SettingsBaseModal {
    constructor(config = {}) {
        super({
            id: 'SettingsModal',
            title: config.isHost ? 'Game Settings' : 'Game Settings (Read Only)',
            ...config
        });

        this.isHost = config.isHost || false;
        this.settings = config.settings || null;
        this.onChange = config.onChange || null;

        // Cache of input/display elements
        this.elements = new Map();

        // Current selected category
        this.selectedTab = SETTING_CATEGORIES.PLAYERS;

        this.applyButton = null;

        // Snapshots for dirty tracking/tab persistence
        this.originalValues = this.settings ? this.extractValues(this.settings) : {};
        this.pendingValues = this.settings ? this.extractValues(this.settings) : null;

        // Track pending changes
        this.dirtySettings = new Set();
        this.isDirty = false;
    }

    /**
     * Initialize the modal
     */
    init() {
        super.init();

        // Add Apply button if host
        if (this.isHost && !this.applyButton) {
            this.createApplyButton();
        }

        // Sync with current settings if available
        if (this.settings) {
            this.updateFromSettings(this.settings);
        }
    }

    /**
     * Render sidebar/content without opening (maintains legacy API)
     */
    render() {
        if (!this.initialized) {
            this.init();
        }

        this.renderSidebar();
        this.renderContent();

        if (this.settings) {
            this.updateFromSettings(this.settings);
        } else if (this.pendingValues) {
            this.applyValuesToInputs(this.pendingValues);
        }

        return this;
    }

    /**
     * Create and attach the Apply button
     */
    createApplyButton() {
        const headerButtons = this.modal.querySelector('.settings-modal-header-buttons');
        if (!headerButtons) return;

        // Check if already exists
        if (headerButtons.querySelector('#settingsModalApplyButton')) return;

        const applyButton = document.createElement('button');
        applyButton.className = 'button settings-modal-apply';
        applyButton.textContent = 'Apply Settings';
        applyButton.id = 'settingsModalApplyButton';
        applyButton.disabled = true;
        applyButton.addEventListener('click', () => this.applySettings());

        // Insert before close button
        const closeButton = headerButtons.querySelector('.settings-modal-close');
        if (closeButton) {
            headerButtons.insertBefore(applyButton, closeButton);
        } else {
            headerButtons.appendChild(applyButton);
        }

        this.applyButton = applyButton;
    }

    /**
     * Lifecycle hook: called when modal opens
     */
    onOpen() {
        this.renderSidebar();
        this.renderContent();

        // Update from current settings
        if (this.settings) {
            this.updateFromSettings(this.settings);
        }
    }

    /**
     * Render the sidebar navigation
     */
    renderSidebar() {
        const categoryOrder = [
            SETTING_CATEGORIES.PLAYERS,
            SETTING_CATEGORIES.TIMING,
            SETTING_CATEGORIES.UI,
            SETTING_CATEGORIES.ADVANCED
        ];

        const tabs = [];
        categoryOrder.forEach(category => {
            const settings = getSettingsByCategory(category);
            if (settings.length > 0) {
                tabs.push({
                    id: category,
                    label: this.getCategoryLabel(category)
                });
            }
        });

        this.renderTabs(tabs);
    }

    /**
     * Render the content area for the selected category
     */
    renderContent() {
        const content = this.content; // Provided by BaseModal
        if (!content) return;

        content.innerHTML = '';

        // Get settings for selected category (using selectedTab from BaseModal)
        const settings = getSettingsByCategory(this.selectedTab);

        // Create category title
        const categoryTitle = document.createElement('h3');
        categoryTitle.className = 'settings-content-title';
        categoryTitle.textContent = this.getCategoryLabel(this.selectedTab);
        content.appendChild(categoryTitle);

        // Create settings rows
        settings.forEach(settingSchema => {
            const row = this.createSettingRow(settingSchema);
            content.appendChild(row);
        });

        // Re-apply any staged values so switching tabs doesn't reset inputs
        this.applyValuesToInputs(this.pendingValues || this.extractValues(this.settings) || {});
    }

    /**
     * Get display label for category
     * @param {string} category - Category ID
     * @returns {string} Display label
     */
    getCategoryLabel(category) {
        const labels = {
            [SETTING_CATEGORIES.PLAYERS]: 'Player Settings',
            [SETTING_CATEGORIES.TIMING]: 'Timing Settings',
            [SETTING_CATEGORIES.UI]: 'UI Settings',
            [SETTING_CATEGORIES.ADVANCED]: 'Advanced Settings'
        };
        return labels[category] || category;
    }

    /**
     * Create a setting row
     * @param {Object} schema - Setting schema
     * @returns {HTMLElement} Setting row element
     */
    createSettingRow(schema) {
        const row = document.createElement('div');
        row.className = 'settings-row';
        row.setAttribute('data-setting-id', schema.id);

        // Handle dependency visibility
        if (schema.dependsOn) {
            row.setAttribute('data-depends-on', schema.dependsOn.setting);
            row.setAttribute('data-depends-value', schema.dependsOn.value);
            row.style.display = 'none'; // Initially hidden, shown when dependency is met
        }

        // Label
        const label = document.createElement('label');
        label.className = 'settings-label';
        label.setAttribute('for', this.getElementId(schema.id));
        label.textContent = schema.label + ':';

        if (schema.description) {
            label.title = schema.description;
        }

        row.appendChild(label);

        // Input or display element
        const inputElement = this.isHost
            ? this.createInputElement(schema)
            : this.createDisplayElement(schema);

        let elementToStore = inputElement;

        if (this.isHost) {
            if (schema.type === SETTING_TYPES.BOOLEAN) {
                elementToStore = inputElement.querySelector('input') || inputElement;
            } else if (inputElement && inputElement.__inputRef) {
                elementToStore = inputElement.__inputRef;
            }
        } else {
            // Client side
            if (schema.type === SETTING_TYPES.BOOLEAN) {
                elementToStore = inputElement.querySelector('input') || inputElement;
            }
        }

        this.elements.set(schema.id, elementToStore);
        row.appendChild(inputElement);

        return row;
    }

    /**
     * Create input element for host
     * @param {Object} schema - Setting schema
     * @returns {HTMLElement} Input element
     */
    createInputElement(schema) {
        let input;

        switch (schema.type) {
            case SETTING_TYPES.NUMBER:
            case SETTING_TYPES.RANGE: {
                input = document.createElement('input');
                input.type = schema.type === SETTING_TYPES.RANGE ? 'range' : 'number';
                input.className = 'input settings-input';
                input.id = this.getElementId(schema.id);
                input.value = schema.defaultValue;

                if (schema.constraints.min !== undefined) {
                    input.min = schema.constraints.min;
                }
                if (schema.constraints.max !== undefined) {
                    input.max = schema.constraints.max;
                }
                if (schema.constraints.step !== undefined) {
                    input.step = schema.constraints.step;
                }

                // Add change listener
                input.addEventListener('change', () => this.handleInputChange(schema.id));
                input.addEventListener('input', () => this.handleInputChange(schema.id));

                if (schema.unit) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'settings-input-wrapper';
                    wrapper.appendChild(input);

                    const unitLabel = document.createElement('span');
                    unitLabel.className = 'settings-input-unit';
                    unitLabel.textContent = schema.unit;
                    wrapper.appendChild(unitLabel);

                    wrapper.__inputRef = input;
                    return wrapper;
                }
                break;
            }

            case SETTING_TYPES.BOOLEAN:
                const checkboxContainer = document.createElement('div');
                checkboxContainer.className = 'settings-checkbox-container';

                input = document.createElement('input');
                input.type = 'checkbox';
                input.className = 'settings-checkbox';
                input.id = this.getElementId(schema.id);
                input.checked = schema.defaultValue;

                input.addEventListener('change', () => this.handleInputChange(schema.id));

                checkboxContainer.appendChild(input);
                return checkboxContainer;

            case SETTING_TYPES.SELECT:
                input = document.createElement('select');
                input.className = 'input settings-input';
                input.id = this.getElementId(schema.id);

                schema.constraints.options.forEach(option => {
                    const optionElement = document.createElement('option');
                    if (typeof option === 'string') {
                        optionElement.value = option;
                        optionElement.textContent = option;
                    } else {
                        optionElement.value = option.value;
                        optionElement.textContent = option.label;
                    }
                    input.appendChild(optionElement);
                });

                input.value = schema.defaultValue;
                input.addEventListener('change', () => this.handleInputChange(schema.id));
                break;

            case SETTING_TYPES.TEXT:
            default:
                input = document.createElement('input');
                input.type = 'text';
                input.className = 'input settings-input';
                input.id = this.getElementId(schema.id);
                input.value = schema.defaultValue;

                if (schema.constraints.maxLength) {
                    input.maxLength = schema.constraints.maxLength;
                }

                input.addEventListener('change', () => this.handleInputChange(schema.id));
                break;
        }

        return input;
    }

    /**
     * Create display element for client (read-only)
     * @param {Object} schema - Setting schema
     * @returns {HTMLElement} Display element
     */
    createDisplayElement(schema) {
        if (schema.type === SETTING_TYPES.BOOLEAN) {
            const checkboxContainer = document.createElement('div');
            checkboxContainer.className = 'settings-checkbox-container';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'settings-checkbox';
            checkbox.id = this.getElementId(schema.id);
            checkbox.checked = schema.defaultValue;
            checkbox.disabled = true;

            checkboxContainer.appendChild(checkbox);
            return checkboxContainer;
        }

        const display = document.createElement('span');
        display.className = 'settings-display';
        display.id = this.getElementId(schema.id);
        display.textContent = schema.defaultValue;

        return display;
    }

    /**
     * Handle input change
     * @param {string} settingId - Setting that changed
     */
    handleInputChange(settingId) {
        // Update dependency visibility
        this.updateDependencies(settingId);

        const value = this.getValue(settingId);
        this.storePendingValue(settingId, value);
        this.updateDirtyForSetting(settingId, value);
    }

    /**
     * Update visibility of dependent settings
     * @param {string} settingId - Setting that changed
     */
    updateDependencies(settingId) {
        const value = this.getValue(settingId);

        // Find all rows that depend on this setting
        const dependentRows = document.querySelectorAll(`[data-depends-on="${settingId}"]`);

        dependentRows.forEach(row => {
            const requiredValue = row.getAttribute('data-depends-value');
            const shouldShow = String(value) === requiredValue;
            row.style.display = shouldShow ? '' : 'none';
        });
    }

    /**
     * Get value from input element
     * @param {string} settingId - Setting identifier
     * @returns {any} Current value
     */
    getValue(settingId) {
        const element = this.elements.get(settingId);
        if (!element) return null;

        const schema = GAME_SETTINGS_SCHEMA.find(s => s.id === settingId);
        if (!schema) return null;

        switch (schema.type) {
            case SETTING_TYPES.NUMBER:
            case SETTING_TYPES.RANGE:
                return Number(element.value);

            case SETTING_TYPES.BOOLEAN:
                return element.checked;

            default:
                return element.value;
        }
    }

    /**
     * Set value to input element
     * @param {string} settingId - Setting identifier
     * @param {any} value - Value to set
     */
    setValue(settingId, value) {
        const element = this.elements.get(settingId);
        if (!element) return;

        const schema = GAME_SETTINGS_SCHEMA.find(s => s.id === settingId);
        if (!schema) return;

        if (this.isHost) {
            // Update input
            switch (schema.type) {
                case SETTING_TYPES.BOOLEAN:
                    element.checked = Boolean(value);
                    break;

                default:
                    element.value = value;
                    break;
            }
        } else {
            // Update display
            if (schema.type === SETTING_TYPES.BOOLEAN) {
                element.checked = Boolean(value);
            } else {
                element.textContent = value;
            }
        }

        // Update dependencies
        this.updateDependencies(settingId);
    }

    /**
     * Apply a values object to existing inputs
     * @param {Object} values - Map of settingId -> value
     */
    applyValuesToInputs(values = {}) {
        if (!values) return;
        GAME_SETTINGS_SCHEMA.forEach(schema => {
            if (values[schema.id] !== undefined) {
                this.setValue(schema.id, values[schema.id]);
            }
        });
    }

    /**
     * Extract plain values from a settings object or POJO
     * @param {Object} source - Source settings
     * @returns {Object} Plain values
     */
    extractValues(source = {}) {
        const values = {};
        GAME_SETTINGS_SCHEMA.forEach(schema => {
            if (source && source[schema.id] !== undefined) {
                values[schema.id] = source[schema.id];
            } else {
                values[schema.id] = schema.defaultValue;
            }
        });
        return values;
    }

    /**
     * Update all settings from a Settings object
     * @param {Object} settings - Settings object or plain object
     */
    updateFromSettings(settings) {
        this.settings = settings;
        this.originalValues = this.extractValues(settings);
        this.pendingValues = this.extractValues(settings);

        GAME_SETTINGS_SCHEMA.forEach(schema => {
            const value = settings[schema.id];
            if (value !== undefined) {
                this.setValue(schema.id, value);
            }
        });

        this.resetDirtyState();
    }

    /**
     * Get all current values as an object
     * @returns {Object} Object with setting IDs as keys
     */
    getAllValues() {
        const values = {};

        GAME_SETTINGS_SCHEMA.forEach(schema => {
            values[schema.id] = this.getValue(schema.id);
        });

        return values;
    }

    /**
     * Get element ID for a setting
     * @param {string} settingId - Setting identifier
     * @returns {string} Element ID
     */
    getElementId(settingId) {
        return `${settingId}Modal${this.isHost ? 'Host' : 'Client'}`;
    }

    /**
     * Show the modal (Alias for open to maintain API compatibility)
     */
    show() {
        this.open();
    }

    /**
     * Hide the modal (Alias for close to maintain API compatibility)
     */
    hide() {
        this.close();
    }

    /**
     * Apply settings (host only)
     * Triggers the onChange callback with all current values
     */
    applySettings() {
        if (!this.isHost || !this.onChange) {
            return;
        }

        if (this.dirtySettings.size === 0) {
            return;
        }

        // Get all current values
        const allValues = this.getAllValues();

        // Trigger onChange for each setting
        // This will cause the settings manager to validate and apply them
        GAME_SETTINGS_SCHEMA.forEach(schema => {
            const value = allValues[schema.id];
            if (value !== undefined) {
                this.onChange(schema.id, value);
            }
        });

        this.resetDirtyState();
    }

    /**
     * Store staged value for a setting
     * @param {string} settingId
     * @param {any} value
     */
    storePendingValue(settingId, value) {
        if (!this.pendingValues) {
            this.pendingValues = { ...(this.originalValues || {}) };
        }
        this.pendingValues[settingId] = value;
    }

    /**
     * Update dirty state for a specific setting
     * @param {string} settingId
     * @param {any} newValue
     */
    updateDirtyForSetting(settingId, newValue) {
        if (!this.isHost) {
            return;
        }

        const currentValue = this.originalValues ? this.originalValues[settingId] : undefined;

        if (this.valuesAreEqual(newValue, currentValue)) {
            this.dirtySettings.delete(settingId);
        } else {
            this.dirtySettings.add(settingId);
        }

        this.updateDirtyState();
    }

    /**
     * Reset dirty tracking and disable Apply button
     */
    resetDirtyState() {
        this.dirtySettings.clear();
        this.updateDirtyState();
    }

    /**
     * Update internal dirty flag and Apply button state
     */
    updateDirtyState() {
        this.isDirty = this.dirtySettings.size > 0;
        if (this.applyButton) {
            this.applyButton.disabled = !this.isDirty;
        }
    }

    /**
     * Compare two values for equality
     * @param {any} a
     * @param {any} b
     * @returns {boolean}
     */
    valuesAreEqual(a, b) {
        if (Number.isNaN(a) && Number.isNaN(b)) {
            return true;
        }

        return a === b;
    }

    /**
     * Clean up component
     */
    cleanup() {
        this.elements.clear();
        super.cleanup();
    }
}
