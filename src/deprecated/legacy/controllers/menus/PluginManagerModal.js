import BaseMenu from './BaseMenu.js';

/**
 * PluginManagerModal - UI controller for the Plugin Manager modal
 *
 * Displays installed plugins in a scrollable list with toggle switches
 * for custom plugins and status indicators for core plugins.
 */
export default class PluginManagerModal extends BaseMenu {
    /**
     * @param {string} modalId - ID of the modal element
     * @param {PluginManager} pluginManager - Plugin manager instance
     * @param {boolean} isHost - Whether the current user is the host
     * @param {EventBus} eventBus - Event bus for listening to plugin state changes
     */
    constructor(modalId, pluginManager, isHost = false, eventBus = null) {
        super(modalId);
        this.pluginManager = pluginManager;
        this.isHost = isHost;
        this.eventBus = eventBus;
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

        // Listen for plugin state updates from host (for clients)
        if (this.eventBus) {
            this.eventBus.on('pluginStatesReceived', () => {
                // Refresh the plugin list if modal is open
                if (this.modal && this.modal.style.display !== 'none') {
                    this.refreshPluginList();
                }
            });
        }
    }

    /**
     * Set the host status
     * @param {boolean} isHost - Whether the current user is the host
     */
    setHost(isHost) {
        this.isHost = isHost;
    }

    /**
     * Show the modal and refresh plugin list
     * @param {boolean} showAddSection - Whether to show the "Add Plugin" section (default: true)
     */
    show(showAddSection = true) {
        super.show();
        this.refreshPluginList();

        // Control visibility of Add Plugin section
        const addPluginSection = document.getElementById('addPluginSection');
        if (addPluginSection) {
            addPluginSection.style.display = showAddSection ? 'block' : 'none';
        }
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
            this.pluginListContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No plugins registered.</p>';
            return;
        }

        // Render each plugin as a row
        plugins.forEach(plugin => {
            const pluginRow = this._createPluginRow(plugin);
            this.pluginListContainer.appendChild(pluginRow);
        });
    }

    /**
     * Create a plugin row element
     * @private
     * @param {Object} plugin - Plugin metadata
     * @returns {HTMLElement} Plugin row element
     */
    _createPluginRow(plugin) {
        const row = document.createElement('div');
        row.className = 'plugin-row';

        // Left side: Plugin info
        const infoContainer = document.createElement('div');
        infoContainer.className = 'plugin-info';

        // Plugin name with badge
        const nameContainer = document.createElement('div');
        nameContainer.className = 'plugin-name-container';

        const nameEl = document.createElement('div');
        nameEl.className = 'plugin-name';
        nameEl.textContent = plugin.name;
        nameContainer.appendChild(nameEl);

        // CORE badge for default plugins
        if (plugin.isDefault) {
            const badge = document.createElement('span');
            badge.className = 'plugin-badge';
            badge.textContent = 'CORE';
            nameContainer.appendChild(badge);
        }

        infoContainer.appendChild(nameContainer);

        // Description
        const descEl = document.createElement('div');
        descEl.className = 'plugin-description';
        descEl.textContent = plugin.description || 'No description available';
        infoContainer.appendChild(descEl);

        // Tags (if any)
        if (plugin.tags && plugin.tags.length > 0) {
            const tagsEl = document.createElement('div');
            tagsEl.className = 'plugin-tags';
            tagsEl.innerHTML = plugin.tags.map(tag => `<span class="plugin-tag">${tag}</span>`).join(' ');
            infoContainer.appendChild(tagsEl);
        }

        // Provides info
        if (plugin.provides) {
            const providesInfo = this._formatProvidesInfo(plugin.provides);
            if (providesInfo) {
                const providesEl = document.createElement('div');
                providesEl.className = 'plugin-provides';
                providesEl.innerHTML = `<em>Provides:</em> ${providesInfo}`;
                infoContainer.appendChild(providesEl);
            }
        }

        row.appendChild(infoContainer);

        // Right side: Toggle or status
        const controlContainer = document.createElement('div');
        controlContainer.className = 'plugin-control';

        if (plugin.isDefault) {
            // Core plugins: just show enabled status (no toggle)
            const statusEl = document.createElement('div');
            statusEl.className = 'plugin-status';
            statusEl.textContent = 'Always Enabled';
            controlContainer.appendChild(statusEl);
        } else {
            // Custom plugins: show toggle switch (only functional for hosts)
            if (!this.isHost) {
                // Clients see a status indicator instead of a toggle
                const statusEl = document.createElement('div');
                statusEl.className = plugin.enabled ? 'plugin-status enabled' : 'plugin-status disabled';
                statusEl.textContent = plugin.enabled ? 'Enabled' : 'Disabled';
                controlContainer.appendChild(statusEl);
            } else {
                // Hosts see a functional toggle switch
                const toggleContainer = document.createElement('label');
                toggleContainer.className = 'plugin-toggle';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = plugin.enabled;
                checkbox.style.cssText = 'opacity: 0; width: 0; height: 0;';

                const slider = document.createElement('span');
                slider.className = plugin.enabled ? 'plugin-toggle-slider active' : 'plugin-toggle-slider';

                const sliderButton = document.createElement('span');
                sliderButton.className = plugin.enabled ? 'plugin-toggle-button active' : 'plugin-toggle-button inactive';
                slider.appendChild(sliderButton);

                toggleContainer.appendChild(checkbox);
                toggleContainer.appendChild(slider);

                // Handle toggle click
                toggleContainer.addEventListener('click', (e) => {
                    e.preventDefault();
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

                controlContainer.appendChild(toggleContainer);
            }
        }

        row.appendChild(controlContainer);

        return row;
    }

    /**
     * Format provides info into readable string
     * @private
     * @param {Object} provides - Provides object from plugin metadata
     * @returns {string} Formatted provides string
     */
    _formatProvidesInfo(provides) {
        // Count total components across all types
        let totalComponents = 0;

        if (provides.actions && provides.actions.length > 0) {
            totalComponents += provides.actions.length;
        }

        if (provides.triggers && provides.triggers.length > 0) {
            totalComponents += provides.triggers.length;
        }

        if (provides.effects && provides.effects.length > 0) {
            totalComponents += provides.effects.length;
        }

        if (provides.components && provides.components.length > 0) {
            totalComponents += provides.components.length;
        }

        if (totalComponents === 0) {
            return '';
        }

        return `${totalComponents} component${totalComponents > 1 ? 's' : ''}`;
    }
}
