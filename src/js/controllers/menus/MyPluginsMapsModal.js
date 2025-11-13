import BaseMenu from './BaseMenu.js';

/**
 * MyPluginsMapsModal - UI controller for viewing installed plugins and maps
 *
 * Read-only view for all users to see their local plugins and maps.
 * Shows both registered plugins (from PluginManager) and custom plugins/maps (from LocalStorage).
 */
export default class MyPluginsMapsModal extends BaseMenu {
    /**
     * @param {string} modalId - ID of the modal element
     * @param {PluginManager} pluginManager - Plugin manager instance
     * @param {LocalStorageManager} localStorageManager - Local storage manager instance
     */
    constructor(modalId, pluginManager, localStorageManager) {
        super(modalId);
        this.pluginManager = pluginManager;
        this.localStorageManager = localStorageManager;

        // Get tab elements
        this.pluginsTabButton = document.getElementById('pluginsTabButton');
        this.mapsTabButton = document.getElementById('mapsTabButton');
        this.pluginsTabContent = document.getElementById('pluginsTabContent');
        this.mapsTabContent = document.getElementById('mapsTabContent');

        // Get list containers
        this.myPluginsList = document.getElementById('myPluginsList');
        this.myMapsList = document.getElementById('myMapsList');

        // Set up close button
        const closeButton = document.getElementById('closeMyPluginsMapsButton');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.hide());
        }

        // Set up tab switching
        this.pluginsTabButton?.addEventListener('click', () => this.showTab('plugins'));
        this.mapsTabButton?.addEventListener('click', () => this.showTab('maps'));

        // Close modal when clicking outside of it
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.hide();
            }
        });
    }

    /**
     * Show the modal and refresh content
     */
    show() {
        super.show();
        this.showTab('plugins'); // Default to plugins tab
        this.refreshPluginsList();
        this.refreshMapsList();
    }

    /**
     * Switch between tabs
     */
    showTab(tab) {
        if (tab === 'plugins') {
            this.pluginsTabButton.classList.add('active');
            this.pluginsTabButton.style.borderBottom = '2px solid var(--primary-color)';
            this.pluginsTabButton.style.fontWeight = 'bold';
            this.pluginsTabButton.style.color = '';

            this.mapsTabButton.classList.remove('active');
            this.mapsTabButton.style.borderBottom = 'none';
            this.mapsTabButton.style.fontWeight = 'normal';
            this.mapsTabButton.style.color = 'var(--text-secondary)';

            this.pluginsTabContent.style.display = 'block';
            this.mapsTabContent.style.display = 'none';
        } else {
            this.mapsTabButton.classList.add('active');
            this.mapsTabButton.style.borderBottom = '2px solid var(--primary-color)';
            this.mapsTabButton.style.fontWeight = 'bold';
            this.mapsTabButton.style.color = '';

            this.pluginsTabButton.classList.remove('active');
            this.pluginsTabButton.style.borderBottom = 'none';
            this.pluginsTabButton.style.fontWeight = 'normal';
            this.pluginsTabButton.style.color = 'var(--text-secondary)';

            this.mapsTabContent.style.display = 'block';
            this.pluginsTabContent.style.display = 'none';
        }
    }

    /**
     * Refresh the plugins list
     */
    refreshPluginsList() {
        this.myPluginsList.innerHTML = '';

        // Get all plugins from PluginManager
        const registeredPlugins = this.pluginManager.getAllPlugins();

        // Get custom plugins from LocalStorage
        const customPlugins = this.localStorageManager.getAllPlugins();

        if (registeredPlugins.length === 0 && Object.keys(customPlugins).length === 0) {
            this.myPluginsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No plugins installed.</p>';
            return;
        }

        // Show registered plugins
        if (registeredPlugins.length > 0) {
            const header = document.createElement('h4');
            header.textContent = 'Registered Plugins';
            header.style.cssText = 'margin-bottom: 12px; color: var(--text-color);';
            this.myPluginsList.appendChild(header);

            registeredPlugins.forEach(plugin => {
                const row = this._createPluginRow(plugin, 'registered');
                this.myPluginsList.appendChild(row);
            });
        }

        // Show custom plugins
        const customPluginList = Object.values(customPlugins);
        if (customPluginList.length > 0) {
            const header = document.createElement('h4');
            header.textContent = 'Custom Plugins (Local Storage)';
            header.style.cssText = 'margin-top: 24px; margin-bottom: 12px; color: var(--text-color);';
            this.myPluginsList.appendChild(header);

            customPluginList.forEach(plugin => {
                const row = this._createPluginRow(plugin, 'custom');
                this.myPluginsList.appendChild(row);
            });
        }
    }

    /**
     * Refresh the maps list
     */
    refreshMapsList() {
        this.myMapsList.innerHTML = '';

        const maps = this.localStorageManager.getAllMaps();
        const mapList = Object.values(maps);

        if (mapList.length === 0) {
            this.myMapsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No custom maps installed.</p>';
            return;
        }

        mapList.forEach(map => {
            const row = this._createMapRow(map);
            this.myMapsList.appendChild(row);
        });
    }

    /**
     * Create a plugin row element
     * @private
     */
    _createPluginRow(plugin, source) {
        const row = document.createElement('div');
        row.className = 'plugin-row';

        // Left side: Plugin info
        const infoContainer = document.createElement('div');
        infoContainer.className = 'plugin-info';

        // Plugin name with badges
        const nameContainer = document.createElement('div');
        nameContainer.className = 'plugin-name-container';

        const nameEl = document.createElement('div');
        nameEl.className = 'plugin-name';
        nameEl.textContent = plugin.name || plugin.metadata?.name || 'Unknown Plugin';
        nameContainer.appendChild(nameEl);

        // Core badge
        if (plugin.isDefault || plugin.metadata?.isDefault) {
            const badge = document.createElement('span');
            badge.className = 'plugin-badge';
            badge.textContent = 'CORE';
            nameContainer.appendChild(badge);
        }

        // Source badge
        if (source === 'custom') {
            const badge = document.createElement('span');
            badge.className = 'plugin-badge';
            badge.style.background = 'var(--color-info, #17a2b8)';
            badge.textContent = 'CUSTOM';
            nameContainer.appendChild(badge);
        }

        infoContainer.appendChild(nameContainer);

        // Description
        const descEl = document.createElement('div');
        descEl.className = 'plugin-description';
        descEl.textContent = plugin.description || plugin.metadata?.description || 'No description available';
        infoContainer.appendChild(descEl);

        // Tags
        const tags = plugin.tags || plugin.metadata?.tags || [];
        if (tags.length > 0) {
            const tagsEl = document.createElement('div');
            tagsEl.className = 'plugin-tags';
            tagsEl.innerHTML = tags.map(tag => `<span class="plugin-tag">${tag}</span>`).join(' ');
            infoContainer.appendChild(tagsEl);
        }

        // Version
        const versionEl = document.createElement('div');
        versionEl.className = 'plugin-provides';
        versionEl.textContent = `Version: ${plugin.version || plugin.metadata?.version || '1.0.0'}`;
        infoContainer.appendChild(versionEl);

        row.appendChild(infoContainer);

        // Right side: Status
        const controlContainer = document.createElement('div');
        controlContainer.className = 'plugin-control';

        const statusEl = document.createElement('div');
        statusEl.className = 'plugin-status';

        if (source === 'registered') {
            statusEl.textContent = plugin.enabled ? 'Enabled' : 'Disabled';
            statusEl.style.color = plugin.enabled ? 'var(--color-success)' : 'var(--text-secondary)';
        } else {
            statusEl.textContent = 'In Storage';
            statusEl.style.color = 'var(--text-secondary)';
        }

        controlContainer.appendChild(statusEl);
        row.appendChild(controlContainer);

        return row;
    }

    /**
     * Create a map row element
     * @private
     */
    _createMapRow(map) {
        const row = document.createElement('div');
        row.className = 'plugin-row';

        // Left side: Map info
        const infoContainer = document.createElement('div');
        infoContainer.className = 'plugin-info';

        // Map name
        const nameContainer = document.createElement('div');
        nameContainer.className = 'plugin-name-container';

        const nameEl = document.createElement('div');
        nameEl.className = 'plugin-name';
        nameEl.textContent = map.metadata?.name || 'Unknown Map';
        nameContainer.appendChild(nameEl);

        // Plugin-bundled badge
        if (map.source && map.source !== 'user-upload') {
            const badge = document.createElement('span');
            badge.className = 'plugin-badge';
            badge.style.background = 'var(--color-warning, #ffc107)';
            badge.textContent = 'PLUGIN';
            nameContainer.appendChild(badge);
        }

        infoContainer.appendChild(nameContainer);

        // Description
        const descEl = document.createElement('div');
        descEl.className = 'plugin-description';
        descEl.textContent = map.metadata?.description || 'No description available';
        infoContainer.appendChild(descEl);

        // Required plugins
        const requiredPlugins = map.metadata?.requiredPlugins || [];
        if (requiredPlugins.length > 0) {
            const reqEl = document.createElement('div');
            reqEl.className = 'plugin-provides';
            reqEl.innerHTML = `<em>Requires plugins:</em> ${requiredPlugins.join(', ')}`;
            infoContainer.appendChild(reqEl);
        }

        // Version and author
        const metaEl = document.createElement('div');
        metaEl.className = 'plugin-provides';
        metaEl.textContent = `Version ${map.metadata?.version || '1.0.0'}`;
        if (map.metadata?.author) {
            metaEl.textContent += ` • by ${map.metadata.author}`;
        }
        infoContainer.appendChild(metaEl);

        row.appendChild(infoContainer);

        // Right side: Source
        const controlContainer = document.createElement('div');
        controlContainer.className = 'plugin-control';

        const sourceEl = document.createElement('div');
        sourceEl.className = 'plugin-status';
        sourceEl.style.fontSize = '0.85em';
        sourceEl.textContent = map.source === 'user-upload' ? 'User Upload' : `From: ${map.source}`;
        sourceEl.style.color = 'var(--text-secondary)';

        controlContainer.appendChild(sourceEl);
        row.appendChild(controlContainer);

        return row;
    }
}
