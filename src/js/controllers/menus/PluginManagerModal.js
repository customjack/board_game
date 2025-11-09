import BaseMenu from './BaseMenu.js';

/**
 * PluginManagerModal - UI controller for the Plugin Manager modal
 *
 * Displays installed plugins with their metadata and provides
 * controls for managing plugins (enable/disable for custom plugins).
 */
export default class PluginManagerModal extends BaseMenu {
    /**
     * @param {string} modalId - ID of the modal element
     * @param {PluginManager} pluginManager - Plugin manager instance
     */
    constructor(modalId, pluginManager) {
        super(modalId);
        this.pluginManager = pluginManager;
        this.pluginListContainer = document.getElementById('pluginList');

        if (!this.pluginListContainer) {
            throw new Error('Plugin list container not found in modal!');
        }

        // Set up close button
        const closeButton = document.getElementById('closePluginManagerButton');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.hide());
        }

        // Close modal when clicking outside of it
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.hide();
            }
        });
    }

    /**
     * Show the modal and refresh plugin list
     */
    show() {
        super.show();
        this.refreshPluginList();
    }

    /**
     * Refresh the plugin list display
     */
    refreshPluginList() {
        // Clear existing content
        this.pluginListContainer.innerHTML = '';

        // Get all plugins
        const plugins = this.pluginManager.getAllPlugins();

        if (plugins.length === 0) {
            this.pluginListContainer.innerHTML = '<p>No plugins registered.</p>';
            return;
        }

        // Group plugins by type
        const pluginsByType = {
            'core': [],
            'actions': [],
            'triggers': [],
            'effects': []
        };

        plugins.forEach(plugin => {
            if (pluginsByType[plugin.type]) {
                pluginsByType[plugin.type].push(plugin);
            }
        });

        // Render each type group
        Object.entries(pluginsByType).forEach(([type, pluginList]) => {
            if (pluginList.length === 0) return;

            const typeSection = document.createElement('div');
            typeSection.className = 'plugin-type-section';
            typeSection.style.marginBottom = '20px';

            const typeHeader = document.createElement('h3');
            typeHeader.textContent = this._formatTypeName(type);
            typeHeader.style.marginBottom = '10px';
            typeHeader.style.textTransform = 'capitalize';
            typeSection.appendChild(typeHeader);

            pluginList.forEach(plugin => {
                const pluginCard = this._createPluginCard(plugin);
                typeSection.appendChild(pluginCard);
            });

            this.pluginListContainer.appendChild(typeSection);
        });
    }

    /**
     * Create a plugin card element
     * @private
     * @param {Object} plugin - Plugin metadata
     * @returns {HTMLElement} Plugin card element
     */
    _createPluginCard(plugin) {
        const card = document.createElement('div');
        card.className = 'plugin-card';
        card.style.cssText = `
            background: var(--card-background, #f5f5f5);
            border: 1px solid var(--border-color, #ddd);
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 10px;
        `;

        // Header with name and badge
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';

        const nameContainer = document.createElement('div');
        nameContainer.style.cssText = 'display: flex; align-items: center; gap: 10px;';

        const nameEl = document.createElement('strong');
        nameEl.textContent = plugin.name;
        nameEl.style.fontSize = '1.1em';
        nameContainer.appendChild(nameEl);

        // Badge for default plugins
        if (plugin.isDefault) {
            const badge = document.createElement('span');
            badge.textContent = 'CORE';
            badge.style.cssText = `
                background: var(--primary-color, #007bff);
                color: white;
                font-size: 0.7em;
                padding: 2px 8px;
                border-radius: 4px;
                font-weight: bold;
            `;
            nameContainer.appendChild(badge);
        }

        header.appendChild(nameContainer);

        // Status indicator
        const statusContainer = document.createElement('div');
        statusContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';

        const statusDot = document.createElement('span');
        statusDot.textContent = '●';
        statusDot.style.cssText = `
            color: ${plugin.enabled ? '#28a745' : '#dc3545'};
            font-size: 1.2em;
        `;
        statusContainer.appendChild(statusDot);

        const statusText = document.createElement('span');
        statusText.textContent = plugin.enabled ? 'Enabled' : 'Disabled';
        statusText.style.fontSize = '0.9em';
        statusContainer.appendChild(statusText);

        header.appendChild(statusContainer);
        card.appendChild(header);

        // Version and author
        const metaInfo = document.createElement('div');
        metaInfo.style.cssText = 'font-size: 0.85em; color: #666; margin-bottom: 8px;';
        metaInfo.innerHTML = `Version ${plugin.version}`;
        if (plugin.author) {
            metaInfo.innerHTML += ` • by ${plugin.author}`;
        }
        card.appendChild(metaInfo);

        // Description
        if (plugin.description) {
            const desc = document.createElement('p');
            desc.textContent = plugin.description;
            desc.style.cssText = 'font-size: 0.9em; margin: 8px 0; color: #333;';
            card.appendChild(desc);
        }

        // Provides info (what this plugin registers)
        if (plugin.provides) {
            const providesInfo = this._formatProvidesInfo(plugin.provides);
            if (providesInfo) {
                const provides = document.createElement('div');
                provides.style.cssText = 'font-size: 0.85em; color: #555; margin-top: 8px;';
                provides.innerHTML = `<em>Provides:</em> ${providesInfo}`;
                card.appendChild(provides);
            }
        }

        // Toggle button for custom plugins
        if (!plugin.isDefault) {
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'margin-top: 12px; text-align: right;';

            const toggleButton = document.createElement('button');
            toggleButton.className = 'button button-secondary';
            toggleButton.textContent = plugin.enabled ? 'Disable' : 'Enable';
            toggleButton.style.cssText = 'padding: 6px 16px; font-size: 0.9em;';

            toggleButton.addEventListener('click', () => {
                if (plugin.enabled) {
                    const success = this.pluginManager.disablePlugin(plugin.id);
                    if (success) {
                        this.refreshPluginList();
                    }
                } else {
                    const success = this.pluginManager.enablePlugin(plugin.id);
                    if (success) {
                        this.refreshPluginList();
                    }
                }
            });

            buttonContainer.appendChild(toggleButton);
            card.appendChild(buttonContainer);
        }

        return card;
    }

    /**
     * Format type name for display
     * @private
     * @param {string} type - Plugin type
     * @returns {string} Formatted type name
     */
    _formatTypeName(type) {
        const typeNames = {
            'core': 'Core Plugins',
            'actions': 'Action Plugins',
            'triggers': 'Trigger Plugins',
            'effects': 'Effect Plugins'
        };
        return typeNames[type] || type;
    }

    /**
     * Format provides info into readable string
     * @private
     * @param {Object} provides - Provides object from plugin metadata
     * @returns {string} Formatted provides string
     */
    _formatProvidesInfo(provides) {
        const parts = [];

        if (provides.actions && provides.actions.length > 0) {
            parts.push(`${provides.actions.length} action${provides.actions.length > 1 ? 's' : ''}`);
        }

        if (provides.triggers && provides.triggers.length > 0) {
            parts.push(`${provides.triggers.length} trigger${provides.triggers.length > 1 ? 's' : ''}`);
        }

        if (provides.effects && provides.effects.length > 0) {
            parts.push(`${provides.effects.length} effect${provides.effects.length > 1 ? 's' : ''}`);
        }

        return parts.join(', ');
    }
}
