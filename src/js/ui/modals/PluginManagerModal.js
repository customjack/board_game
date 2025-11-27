import BaseModal from './BaseModal.js';
import ModalUtil from '../../infrastructure/utils/ModalUtil.js';
import MapStorageManager from '../../systems/storage/MapStorageManager.js';

export default class PluginManagerModal extends BaseModal {
    constructor(id, pluginManager, config = {}) {
        super({
            id: id || 'pluginManagerModal',
            title: 'Plugin Manager'
        });

        this.pluginManager = pluginManager;
        this.plugins = [];
        this.filteredPlugins = [];
        this.isHost = pluginManager.isHost;

        this.currentMapInfo = null;
        this.currentMapPluginIds = new Set();
        this.getCurrentMapId = config.getCurrentMapId || (() => MapStorageManager.getSelectedMapId());
    }

    init() {
        super.init();
        this.loadPlugins();
    }

    loadPlugins() {
        this.plugins = this.pluginManager.getAllPlugins();
        this.filteredPlugins = [...this.plugins];
        this.isHost = this.pluginManager.isHost;
    }

    async refreshCurrentMapPlugins() {
        try {
            const mapId = this.getCurrentMapId();
            if (!mapId) {
                this.currentMapInfo = null;
                this.currentMapPluginIds = new Set();
                return;
            }

            const mapMeta = MapStorageManager.getMapById(mapId);
            const mapData = await MapStorageManager.loadMapData(mapId);
            const pluginIds = this.extractPluginIds(mapData);

            this.currentMapInfo = {
                id: mapId,
                name: mapMeta?.name || mapData?.metadata?.name || mapId,
                pluginCount: pluginIds.size
            };
            this.currentMapPluginIds = pluginIds;
        } catch (error) {
            console.warn('Unable to get current map plugins:', error);
            this.currentMapInfo = null;
            this.currentMapPluginIds = new Set();
        }
    }

    extractPluginIds(mapData) {
        const plugins = mapData?.requirements?.plugins || mapData?.metadata?.plugins || mapData?.plugins || [];
        const ids = plugins
            .map(p => (typeof p === 'string' ? p : p.id))
            .filter(Boolean);
        return new Set(ids);
    }

    async onOpen() {
        this.loadPlugins();
        this.renderContent();
        await this.refreshCurrentMapPlugins();
        this.renderContent();
    }

    renderContent() {
        const contentContainer = this.content;
        if (!contentContainer) return;

        contentContainer.innerHTML = '';
        contentContainer.classList.add('plugin-manager-body');
        // Ensure full width/height usage since we don't have a sidebar
        contentContainer.style.padding = '20px';
        contentContainer.style.display = 'flex';
        contentContainer.style.flexDirection = 'column';
        contentContainer.style.height = '100%';

        const header = this.createHeader();
        const searchBar = this.createSearchBar();
        const listContainer = this.createPluginList();

        contentContainer.appendChild(header);
        contentContainer.appendChild(searchBar);
        contentContainer.appendChild(listContainer);

        const listElement = listContainer.querySelector('[data-plugin-list]');
        this.populatePluginList(listElement);
    }

    createHeader() {
        const wrapper = document.createElement('div');
        wrapper.className = 'plugin-manager-summary';
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'space-between';
        wrapper.style.alignItems = 'center';
        wrapper.style.marginBottom = '12px';

        const title = document.createElement('div');
        title.style.display = 'flex';
        title.style.flexDirection = 'column';
        title.style.gap = '4px';

        const heading = document.createElement('h3');
        heading.textContent = 'Available Plugins';
        heading.style.margin = '0';
        heading.style.color = 'var(--text-color, #fff)';

        const sub = document.createElement('div');
        sub.style.color = 'var(--text-color-secondary, #aaa)';
        sub.style.fontSize = '0.9em';
        sub.textContent = `${this.plugins.length} total`;

        title.appendChild(heading);
        title.appendChild(sub);
        wrapper.appendChild(title);

        const mapInfo = document.createElement('div');
        mapInfo.style.display = 'flex';
        mapInfo.style.flexDirection = 'column';
        mapInfo.style.alignItems = 'flex-end';
        mapInfo.style.gap = '4px';

        const mapLabel = document.createElement('span');
        mapLabel.style.fontWeight = '600';
        mapLabel.textContent = this.currentMapInfo?.name || 'No map selected';
        mapLabel.style.color = 'var(--text-color, #fff)';

        const mapPlugins = document.createElement('span');
        mapPlugins.style.fontSize = '0.85em';
        mapPlugins.style.color = 'var(--color-info, #8aa2ff)';
        mapPlugins.textContent = this.currentMapInfo
            ? `${this.currentMapInfo.pluginCount} plugin${this.currentMapInfo.pluginCount === 1 ? '' : 's'} required`
            : 'Map requirements unavailable';

        mapInfo.appendChild(mapLabel);
        mapInfo.appendChild(mapPlugins);
        wrapper.appendChild(mapInfo);

        return wrapper;
    }

    createSearchBar() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'plugin-search-container';
        searchContainer.style.marginBottom = '16px';
        searchContainer.style.display = 'flex';
        searchContainer.style.gap = '10px';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'input plugin-search-input';
        searchInput.placeholder = 'Search plugins...';
        searchInput.style.flex = '1';

        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        const uploadButton = document.createElement('button');
        uploadButton.className = 'button button-primary';
        uploadButton.textContent = 'Add Plugin';
        uploadButton.style.display = this.isHost ? '' : 'none';
        uploadButton.addEventListener('click', () => this.handleAddPlugin());

        searchContainer.appendChild(searchInput);
        searchContainer.appendChild(uploadButton);

        return searchContainer;
    }

    createPluginList() {
        const listContainer = document.createElement('div');
        listContainer.className = 'plugin-list-container';
        listContainer.style.flex = '1';
        listContainer.style.overflowY = 'auto';
        listContainer.style.minHeight = '320px';
        listContainer.style.border = '1px solid var(--border-color, #333)';
        listContainer.style.borderRadius = '8px';
        listContainer.style.backgroundColor = 'var(--background-box, #151515)';

        const list = document.createElement('div');
        list.setAttribute('data-plugin-list', '');
        list.className = 'plugin-list';

        listContainer.appendChild(list);
        return listContainer;
    }

    populatePluginList(listElement) {
        if (!listElement) return;
        listElement.innerHTML = '';

        if (this.filteredPlugins.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = 'No plugins found';
            noResults.style.padding = '20px';
            noResults.style.textAlign = 'center';
            noResults.style.color = 'var(--text-color-secondary, #888)';
            listElement.appendChild(noResults);
            return;
        }

        this.filteredPlugins.forEach(plugin => {
            const row = this.createPluginRow(plugin);
            listElement.appendChild(row);
        });
    }

    createPluginRow(plugin) {
        const row = document.createElement('div');
        row.className = 'plugin-row';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.padding = '14px 16px';
        row.style.borderBottom = '1px solid var(--border-color, #242424)';
        row.style.gap = '12px';

        // Icon removed as per request
        // const icon = document.createElement('div');
        // ...

        const info = document.createElement('div');
        info.className = 'plugin-info';
        info.style.display = 'flex';
        info.style.flexDirection = 'column';
        info.style.gap = '6px';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.gap = '10px';

        const name = document.createElement('h4');
        name.textContent = plugin.name;
        name.style.margin = '0';
        name.style.color = 'var(--text-color, #fff)';

        const version = document.createElement('span');
        version.textContent = `v${plugin.version}`;
        version.style.fontSize = '0.8em';
        version.style.color = 'var(--text-color-secondary, #888)';
        version.style.backgroundColor = 'var(--background-secondary, #202020)';
        version.style.padding = '2px 6px';
        version.style.borderRadius = '4px';

        header.appendChild(name);
        header.appendChild(version);

        const description = document.createElement('p');
        description.textContent = plugin.description || 'No description available';
        description.style.margin = '0';
        description.style.fontSize = '0.9em';
        description.style.color = 'var(--text-color-secondary, #aaa)';

        // Show source information
        if (plugin.source && plugin.source !== 'builtin' && plugin.source !== 'local') {
            const sourceInfo = document.createElement('div');
            sourceInfo.style.fontSize = '0.75em';
            sourceInfo.style.color = 'var(--text-color-tertiary, #666)';
            sourceInfo.style.marginTop = '4px';
            sourceInfo.textContent = `Source: ${plugin.source}`;
            description.appendChild(document.createElement('br'));
            description.appendChild(sourceInfo);
        }

        const chips = document.createElement('div');
        chips.style.display = 'flex';
        chips.style.gap = '6px';
        chips.style.flexWrap = 'wrap';

        const usedByMap = this.currentMapPluginIds.has(plugin.id);
        const mapChip = document.createElement('span');
        mapChip.textContent = usedByMap ? 'Used by map' : 'Not in map';
        mapChip.style.backgroundColor = usedByMap ? 'var(--color-info, #20304f)' : 'var(--background-secondary, #252525)';
        mapChip.style.color = usedByMap ? '#fff' : 'var(--text-tertiary, #999)';
        mapChip.style.fontSize = '0.75em';
        mapChip.style.padding = '2px 6px';
        mapChip.style.borderRadius = '4px';
        chips.appendChild(mapChip);

        info.appendChild(header);
        info.appendChild(description);
        info.appendChild(chips);

        const controls = document.createElement('div');
        controls.className = 'plugin-controls';
        controls.style.display = 'flex';
        controls.style.flexDirection = 'column';
        controls.style.alignItems = 'flex-end';
        controls.style.gap = '8px';
        controls.style.minWidth = '120px';

        // Top row: Remove button (if applicable)
        if (!plugin.isDefault && this.isHost) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'button button-danger button-small';
            removeBtn.textContent = 'Remove';
            removeBtn.title = 'Remove Plugin';
            removeBtn.style.padding = '2px 8px';
            removeBtn.style.fontSize = '0.8em';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleRemovePlugin(plugin);
            });
            controls.appendChild(removeBtn);
        }

        // Bottom row: Status indicators
        const statusContainer = document.createElement('div');
        statusContainer.style.display = 'flex';
        statusContainer.style.flexDirection = 'column';
        statusContainer.style.alignItems = 'flex-end';
        statusContainer.style.gap = '4px';

        if (plugin.isDefault) {
            const badge = document.createElement('span');
            badge.textContent = 'Required';
            badge.style.color = 'var(--text-color-secondary, #888)';
            badge.style.fontSize = '0.85em';
            badge.style.fontStyle = 'italic';
            statusContainer.appendChild(badge);
        } else {
            const usedByMap = this.currentMapPluginIds.has(plugin.id);
            const statusBadge = document.createElement('span');
            statusBadge.style.fontSize = '0.85em';
            statusBadge.style.fontWeight = '500';

            if (usedByMap) {
                statusBadge.textContent = 'Active (Map Requirement)';
                statusBadge.style.color = 'var(--color-success, #4caf50)';
            } else {
                statusBadge.textContent = 'Not Used';
                statusBadge.style.color = 'var(--text-color-secondary, #888)';
                statusBadge.style.fontStyle = 'italic';
            }
            statusContainer.appendChild(statusBadge);
        }

        controls.appendChild(statusContainer);

        row.appendChild(info);
        row.appendChild(controls);

        return row;
    }

    handleSearch(query) {
        if (!query) {
            this.filteredPlugins = [...this.plugins];
        } else {
            const lowerQuery = query.toLowerCase();
            this.filteredPlugins = this.plugins.filter(p =>
                p.name.toLowerCase().includes(lowerQuery) ||
                (p.description && p.description.toLowerCase().includes(lowerQuery))
            );
        }

        const listElement = this.modal.querySelector('[data-plugin-list]');
        if (listElement) {
            this.populatePluginList(listElement);
        }
    }

    async handleTogglePlugin(pluginId, enabled) {
        if (!this.isHost) return;

        let success;
        if (enabled) {
            success = this.pluginManager.enablePlugin(pluginId);
        } else {
            success = this.pluginManager.disablePlugin(pluginId);
        }

        if (!success) {
            await ModalUtil.alert(`Failed to ${enabled ? 'enable' : 'disable'} plugin. Check console for details.`);
        }

        this.loadPlugins();
        const listElement = this.modal.querySelector('[data-plugin-list]');
        if (listElement) {
            this.populatePluginList(listElement);
        }
    }

    async handleAddPlugin() {
        // Simple form - only CDN URL needed, metadata comes from plugin
        const form = document.createElement('div');
        form.style.display = 'flex';
        form.style.flexDirection = 'column';
        form.style.gap = '12px';
        form.style.padding = '16px';

        const urlLabel = document.createElement('label');
        urlLabel.textContent = 'Plugin CDN URL:';
        urlLabel.style.fontWeight = '600';
        
        const urlInput = document.createElement('input');
        urlInput.type = 'url';
        urlInput.className = 'input';
        urlInput.placeholder = 'https://cdn.example.com/plugin.js';
        urlInput.style.width = '100%';

        const infoText = document.createElement('p');
        infoText.textContent = 'The plugin name and description will be loaded from the plugin\'s metadata.';
        infoText.style.fontSize = '0.85em';
        infoText.style.color = 'var(--text-color-secondary, #aaa)';
        infoText.style.margin = '0';

        form.appendChild(urlLabel);
        form.appendChild(urlInput);
        form.appendChild(infoText);

        const confirmed = await ModalUtil.customConfirm(
            form,
            'Add Remote Plugin',
            'Load',
            'Cancel'
        );

        if (!confirmed || !urlInput.value.trim()) {
            return;
        }

        try {
            const result = await this.pluginManager.loadPluginFromUrl(urlInput.value.trim());
            
            if (result.success) {
                await ModalUtil.alert('Plugin loaded successfully!');
                this.loadPlugins();
                const listElement = this.modal.querySelector('[data-plugin-list]');
                if (listElement) {
                    this.populatePluginList(listElement);
                }
            } else {
                await ModalUtil.alert(`Failed to load plugin: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error loading plugin:', error);
            await ModalUtil.alert('Error loading plugin: ' + error.message);
        }
    }

    async handleRemovePlugin(plugin) {
        // Cannot remove default/core plugins
        if (plugin.isDefault || plugin.id === 'core') {
            await ModalUtil.alert('Cannot remove core/default plugins.', 'Cannot Remove');
            return;
        }

        const confirmed = await ModalUtil.confirm(
            `Are you sure you want to remove plugin "${plugin.name}"? This will also remove it from your saved plugins.`,
            'Remove Plugin'
        );
        
        if (confirmed) {
            if (this.pluginManager.unregisterPlugin(plugin.id)) {
                // Also remove from remote plugin cache
                this.pluginManager.removeSavedRemotePlugin(plugin.id);
                this.loadPlugins();
                const listElement = this.modal.querySelector('[data-plugin-list]');
                if (listElement) {
                    this.populatePluginList(listElement);
                }
            }
        }
    }
}
