/**
 * SettingsUIComponent - Dynamically generates settings UI from schema
 *
 * Automatically renders host (editable) or client (read-only) settings
 * based on the settings schema configuration.
 */

import BaseUIComponent from '../BaseUIComponent.js';
import {
    GAME_SETTINGS_SCHEMA,
    SETTING_CATEGORIES,
    SETTING_TYPES,
    getSettingsByCategory
} from '../../config/settings-schema.js';

export default class SettingsUIComponent extends BaseUIComponent {
    constructor(config = {}) {
        super({
            id: 'SettingsUIComponent',
            ...config
        });

        this.isHost = config.isHost || false;
        this.settings = config.settings || null;
        this.onChange = config.onChange || null;
        this.containerId = config.containerId || (this.isHost ? 'settingsSectionHost' : 'settingsSectionClient');

        // Cache of input/display elements
        this.elements = new Map();
    }

    /**
     * Render the settings UI
     */
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Settings container not found: ${this.containerId}`);
            return;
        }

        container.innerHTML = '';

        // Add collapse/expand all button
        const controlsBar = document.createElement('div');
        controlsBar.className = 'settings-controls';

        const toggleAllBtn = document.createElement('button');
        toggleAllBtn.className = 'button button-secondary button-small settings-toggle-all';
        toggleAllBtn.textContent = 'Collapse All';
        toggleAllBtn.addEventListener('click', () => this.toggleAllCategories());

        controlsBar.appendChild(toggleAllBtn);
        container.appendChild(controlsBar);

        // Store category sections for toggle all functionality
        this.categorySections = [];

        // Group settings by category
        const categoryOrder = [
            SETTING_CATEGORIES.PLAYERS,
            SETTING_CATEGORIES.TIMING,
            SETTING_CATEGORIES.UI,
            SETTING_CATEGORIES.ADVANCED
        ];

        categoryOrder.forEach(category => {
            const settings = getSettingsByCategory(category);
            if (settings.length > 0) {
                const categorySection = this.createCategorySection(category, settings);
                container.appendChild(categorySection);

                // Store reference for toggle all
                this.categorySections.push({
                    header: categorySection.querySelector('.settings-category-header'),
                    content: categorySection.querySelector('.settings-category-content'),
                    icon: categorySection.querySelector('.settings-category-icon')
                });
            }
        });

        // Sync with current settings if available
        if (this.settings) {
            this.updateFromSettings(this.settings);
        }
    }

    /**
     * Toggle all categories at once
     */
    toggleAllCategories() {
        if (!this.categorySections || this.categorySections.length === 0) return;

        // Check if any are expanded
        const anyExpanded = this.categorySections.some(section =>
            section.header.getAttribute('aria-expanded') === 'true'
        );

        // If any are expanded, collapse all. Otherwise expand all
        const shouldCollapse = anyExpanded;

        this.categorySections.forEach(section => {
            if (shouldCollapse) {
                // Collapse
                section.content.style.display = 'none';
                section.icon.textContent = '▶';
                section.header.setAttribute('aria-expanded', 'false');
                section.header.classList.add('collapsed');
            } else {
                // Expand
                section.content.style.display = 'block';
                section.icon.textContent = '▼';
                section.header.setAttribute('aria-expanded', 'true');
                section.header.classList.remove('collapsed');
            }
        });

        // Update button text
        const toggleBtn = document.querySelector('.settings-toggle-all');
        if (toggleBtn) {
            toggleBtn.textContent = shouldCollapse ? 'Expand All' : 'Collapse All';
        }
    }

    /**
     * Create a category section (collapsible accordion)
     * @param {string} category - Category name
     * @param {Array} settings - Settings schemas for this category
     * @returns {HTMLElement} Category section element
     */
    createCategorySection(category, settings) {
        const section = document.createElement('div');
        section.className = 'settings-category';
        section.setAttribute('data-category', category);

        // Category header (clickable to expand/collapse)
        const header = document.createElement('div');
        header.className = 'settings-category-header';
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-expanded', 'true'); // Start expanded

        const headerTitle = document.createElement('h4');
        headerTitle.className = 'settings-category-title';
        headerTitle.textContent = this.getCategoryLabel(category);

        const headerIcon = document.createElement('span');
        headerIcon.className = 'settings-category-icon';
        headerIcon.textContent = '▼'; // Down arrow when expanded

        header.appendChild(headerTitle);
        header.appendChild(headerIcon);

        // Content container (collapsible)
        const content = document.createElement('div');
        content.className = 'settings-category-content';
        content.style.display = 'block'; // Start expanded

        // Settings rows
        settings.forEach(settingSchema => {
            const row = this.createSettingRow(settingSchema);
            content.appendChild(row);
        });

        // Toggle on click
        header.addEventListener('click', () => this.toggleCategory(header, content, headerIcon));
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleCategory(header, content, headerIcon);
            }
        });

        section.appendChild(header);
        section.appendChild(content);

        return section;
    }

    /**
     * Toggle category expansion
     * @param {HTMLElement} header - Header element
     * @param {HTMLElement} content - Content element
     * @param {HTMLElement} icon - Icon element
     */
    toggleCategory(header, content, icon) {
        const isExpanded = header.getAttribute('aria-expanded') === 'true';

        if (isExpanded) {
            // Collapse
            content.style.display = 'none';
            icon.textContent = '▶'; // Right arrow when collapsed
            header.setAttribute('aria-expanded', 'false');
            header.classList.add('collapsed');
        } else {
            // Expand
            content.style.display = 'block';
            icon.textContent = '▼'; // Down arrow when expanded
            header.setAttribute('aria-expanded', 'true');
            header.classList.remove('collapsed');
        }
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

        // Call onChange callback if provided
        if (this.onChange) {
            const value = this.getValue(settingId);
            this.onChange(settingId, value);
        }
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
        return `${settingId}${this.isHost ? 'Host' : 'Client'}`;
    }

    /**
     * Clean up component
     */
    cleanup() {
        this.elements.clear();
        super.cleanup();
    }
}
