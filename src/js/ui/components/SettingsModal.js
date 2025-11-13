/**
 * SettingsModal - Modal-based settings interface with sidebar navigation
 *
 * Provides a modal dialog with:
 * - Left sidebar showing category navigation
 * - Right content area showing settings for selected category
 * - Scrollable sections supporting indefinite length
 * - Read-only mode for clients
 */

import BaseUIComponent from '../BaseUIComponent.js';
import {
    GAME_SETTINGS_SCHEMA,
    SETTING_CATEGORIES,
    SETTING_TYPES,
    getSettingsByCategory
} from '../../config/settings-schema.js';

export default class SettingsModal extends BaseUIComponent {
    constructor(config = {}) {
        super({
            id: 'SettingsModal',
            ...config
        });

        this.isHost = config.isHost || false;
        this.settings = config.settings || null;
        this.onChange = config.onChange || null;

        // Cache of input/display elements
        this.elements = new Map();

        // Current selected category
        this.selectedCategory = SETTING_CATEGORIES.PLAYERS;

        // Modal element reference
        this.modalElement = null;
        this.applyButton = null;

        // Pending values mirror current inputs so switching tabs preserves edits
        this.pendingValues = this.settings ? this.extractValues(this.settings) : null;

        // Track pending changes
        this.dirtySettings = new Set();
        this.isDirty = false;
    }

    /**
     * Render the modal (creates the modal structure, but keeps it hidden)
     */
    render() {
        // Create modal if it doesn't exist
        if (!this.modalElement) {
            this.createModal();
        }

        // Populate the content
        this.renderSidebar();
        this.renderContent();

        // Sync with current settings if available
        if (this.settings) {
            this.updateFromSettings(this.settings);
        }
    }

    /**
     * Create the modal structure
     */
    createModal() {
        // Create modal backdrop
        const modal = document.createElement('div');
        modal.className = 'settings-modal-backdrop';
        modal.id = 'settingsModalBackdrop';
        modal.style.display = 'none';

        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.className = 'settings-modal-container';

        // Create modal header
        const modalHeader = document.createElement('div');
        modalHeader.className = 'settings-modal-header';

        const modalTitle = document.createElement('h2');
        modalTitle.textContent = this.isHost ? 'Game Settings' : 'Game Settings (Read Only)';

        // Header buttons container
        const headerButtons = document.createElement('div');
        headerButtons.className = 'settings-modal-header-buttons';

        // Apply button (only for host)
        if (this.isHost) {
            const applyButton = document.createElement('button');
            applyButton.className = 'button settings-modal-apply';
            applyButton.textContent = 'Apply Settings';
            applyButton.id = 'settingsModalApplyButton';
            applyButton.disabled = true;
            applyButton.addEventListener('click', () => this.applySettings());
            headerButtons.appendChild(applyButton);
            this.applyButton = applyButton;
        }

        const closeButton = document.createElement('button');
        closeButton.className = 'button button-secondary settings-modal-close';
        closeButton.textContent = '×';
        closeButton.addEventListener('click', () => this.hide());

        headerButtons.appendChild(closeButton);

        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(headerButtons);

        // Create modal body (two-column layout)
        const modalBody = document.createElement('div');
        modalBody.className = 'settings-modal-body';

        // Left sidebar for navigation
        const sidebar = document.createElement('div');
        sidebar.className = 'settings-modal-sidebar';
        sidebar.id = 'settingsModalSidebar';

        // Right content area
        const content = document.createElement('div');
        content.className = 'settings-modal-content';
        content.id = 'settingsModalContent';

        modalBody.appendChild(sidebar);
        modalBody.appendChild(content);

        // Assemble modal
        modalContainer.appendChild(modalHeader);
        modalContainer.appendChild(modalBody);
        modal.appendChild(modalContainer);

        // Add to DOM
        document.body.appendChild(modal);
        this.modalElement = modal;

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hide();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalElement.style.display === 'flex') {
                this.hide();
            }
        });
    }

    /**
     * Render the sidebar navigation
     */
    renderSidebar() {
        const sidebar = document.getElementById('settingsModalSidebar');
        if (!sidebar) return;

        sidebar.innerHTML = '';

        const categoryOrder = [
            SETTING_CATEGORIES.PLAYERS,
            SETTING_CATEGORIES.TIMING,
            SETTING_CATEGORIES.UI,
            SETTING_CATEGORIES.ADVANCED
        ];

        categoryOrder.forEach(category => {
            const settings = getSettingsByCategory(category);
            if (settings.length > 0) {
                const navItem = this.createNavItem(category);
                sidebar.appendChild(navItem);
            }
        });
    }

    /**
     * Create a navigation item for the sidebar
     * @param {string} category - Category ID
     * @returns {HTMLElement} Navigation item
     */
    createNavItem(category) {
        const navItem = document.createElement('div');
        navItem.className = 'settings-nav-item';
        navItem.setAttribute('data-category', category);

        if (category === this.selectedCategory) {
            navItem.classList.add('active');
        }

        navItem.textContent = this.getCategoryLabel(category);

        navItem.addEventListener('click', () => this.selectCategory(category));

        return navItem;
    }

    /**
     * Select a category and update the content area
     * @param {string} category - Category to select
     */
    selectCategory(category) {
        this.selectedCategory = category;

        // Update active state in sidebar
        const navItems = document.querySelectorAll('.settings-nav-item');
        navItems.forEach(item => {
            if (item.getAttribute('data-category') === category) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Re-render content
        this.renderContent();
    }

    /**
     * Render the content area for the selected category
     */
    renderContent() {
        const content = document.getElementById('settingsModalContent');
        if (!content) return;

        content.innerHTML = '';

        // Get settings for selected category
        const settings = getSettingsByCategory(this.selectedCategory);

        // Create category title
        const categoryTitle = document.createElement('h3');
        categoryTitle.className = 'settings-content-title';
        categoryTitle.textContent = this.getCategoryLabel(this.selectedCategory);
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

        this.elements.set(schema.id, inputElement);
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
            case SETTING_TYPES.RANGE:
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
                break;

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
     * Show the modal
     */
    show() {
        if (this.modalElement) {
            this.modalElement.style.display = 'flex';

            // Re-render to ensure latest settings are shown
            this.renderContent();

            // Update from current settings
            if (this.settings) {
                this.updateFromSettings(this.settings);
            }
        }
    }

    /**
     * Hide the modal
     */
    hide() {
        if (this.modalElement) {
            this.modalElement.style.display = 'none';
        }
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
            this.pendingValues = this.extractValues(this.settings || {});
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

        const currentValue = this.settings ? this.settings[settingId] : undefined;

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
        if (this.modalElement) {
            this.modalElement.remove();
            this.modalElement = null;
        }
        this.elements.clear();
        super.cleanup();
    }
}
