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
        const enabledCount = this.plugins.filter(p => p.enabled).length;
        sub.textContent = `${enabledCount} enabled • ${this.plugins.length} total`;

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
        uploadButton.textContent = 'Add Plugin (Coming Soon)';
        uploadButton.disabled = true;
        uploadButton.style.opacity = '0.6';
        uploadButton.style.cursor = 'not-allowed';
        uploadButton.style.display = this.isHost ? '' : 'none';
        // uploadButton.addEventListener('click', () => this.handleUpload());

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
        row.style.display = 'grid';
        row.style.gridTemplateColumns = 'auto 1fr auto';
        row.style.alignItems = 'center';
        row.style.padding = '14px 16px';
        row.style.borderBottom = '1px solid var(--border-color, #242424)';
        row.style.gap = '12px';

        const icon = document.createElement('div');
        icon.className = 'plugin-icon';
        icon.style.fontSize = '24px';
        icon.textContent = plugin.isDefault ? '📦' : '🧩';
        icon.title = plugin.isDefault ? 'Core Plugin' : 'Custom Plugin';

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

        const chips = document.createElement('div');
        chips.style.display = 'flex';
        chips.style.gap = '6px';
        chips.style.flexWrap = 'wrap';

        const statusChip = document.createElement('span');
        statusChip.textContent = plugin.enabled ? 'Enabled' : 'Disabled';
        statusChip.style.backgroundColor = plugin.enabled ? 'var(--color-success, #1f3d26)' : 'var(--color-danger, #3a2f2f)';
        statusChip.style.color = plugin.enabled ? '#fff' : '#fff';
        statusChip.style.fontSize = '0.75em';
        statusChip.style.padding = '2px 6px';
        statusChip.style.borderRadius = '4px';
        chips.appendChild(statusChip);

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
        controls.style.alignItems = 'center';
        controls.style.gap = '10px';

        if (plugin.isDefault) {
            const badge = document.createElement('span');
            badge.textContent = 'Required';
            badge.style.color = 'var(--text-color-secondary, #888)';
            badge.style.fontSize = '0.85em';
            badge.style.fontStyle = 'italic';
            controls.appendChild(badge);
        } else {
            const usedByMap = this.currentMapPluginIds.has(plugin.id);

            const statusBadge = document.createElement('span');
            statusBadge.style.fontSize = '0.85em';
            statusBadge.style.padding = '4px 8px';
            statusBadge.style.borderRadius = '4px';
            statusBadge.style.fontWeight = '500';

            if (usedByMap) {
                statusBadge.textContent = 'Active (Map Requirement)';
                statusBadge.style.backgroundColor = 'var(--color-success, #1f3d26)';
                statusBadge.style.color = '#fff';
                statusBadge.style.border = '1px solid var(--color-success-border, #2f5d36)';
            } else {
                statusBadge.textContent = 'Not Used';
                statusBadge.style.color = 'var(--text-color-secondary, #888)';
                statusBadge.style.fontStyle = 'italic';
            }

            controls.appendChild(statusBadge);
        }

        row.appendChild(icon);
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
            this.loadPlugins();
            const listElement = this.modal.querySelector('[data-plugin-list]');
            if (listElement) {
                this.populatePluginList(listElement);
            }
            await ModalUtil.alert(`Failed to ${enabled ? 'enable' : 'disable'} plugin. Check console for details.`);
        } else {
            this.loadPlugins();
            const listElement = this.modal.querySelector('[data-plugin-list]');
            if (listElement) {
                this.populatePluginList(listElement);
            }
        }
    }

    handleUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.js';
        input.style.display = 'none';

        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    await this.pluginManager.initializePluginFromFile(file);
                    this.loadPlugins();
                    const listElement = this.modal.querySelector('[data-plugin-list]');
                    if (listElement) {
                        this.populatePluginList(listElement);
                    }
                    await ModalUtil.alert('Plugin uploaded successfully!');
                } catch (error) {
                    console.error('Error uploading plugin:', error);
                    await ModalUtil.alert(`Failed to upload plugin: ${error.message}`);
                }
            }
        });

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }
}
