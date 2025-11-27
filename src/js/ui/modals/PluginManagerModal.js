import BaseModal from './BaseModal.js';
import ModalUtil from '../../infrastructure/utils/ModalUtil.js';
import MapStorageManager from '../../systems/storage/MapStorageManager.js';
import PluginSettingsModal from './PluginSettingsModal.js';
import { createInfoIcon, createGearIcon, createIconButton } from '../../infrastructure/utils/IconUtils.js';

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
        row.style.position = 'relative';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.padding = '14px 16px';
        row.style.borderBottom = '1px solid var(--border-color, #242424)';
        row.style.gap = '12px';

        const info = document.createElement('div');
        info.className = 'plugin-info';
        info.style.display = 'flex';
        info.style.flexDirection = 'column';
        info.style.gap = '4px';
        info.style.flex = '1';
        info.style.minWidth = '0'; // Allow text truncation

        const name = document.createElement('h4');
        name.textContent = plugin.name;
        name.style.margin = '0';
        name.style.color = 'var(--text-color, #fff)';
        name.style.fontSize = '1.05em';
        name.style.overflow = 'hidden';
        name.style.textOverflow = 'ellipsis';
        name.style.whiteSpace = 'nowrap';

        const author = document.createElement('p');
        author.textContent = `by ${plugin.author || 'Unknown'}`;
        author.style.margin = '0';
        author.style.fontSize = '0.9em';
        author.style.color = 'var(--text-color-secondary, #aaa)';
        author.style.overflow = 'hidden';
        author.style.textOverflow = 'ellipsis';
        author.style.whiteSpace = 'nowrap';

        info.appendChild(name);
        info.appendChild(author);

        // Controls container in top right
        const controls = document.createElement('div');
        controls.className = 'plugin-controls';
        controls.style.display = 'flex';
        controls.style.alignItems = 'center';
        controls.style.gap = '8px';
        controls.style.flexShrink = '0';

        // Settings button (to the left of info button)
        const settingsButton = createIconButton(
            createGearIcon(18, 'var(--text-color, #fff)'),
            'Plugin settings',
            (e) => {
                e.stopPropagation();
                this.showPluginSettings(plugin);
            }
        );
        settingsButton.style.backgroundColor = 'var(--background-box, #1f1f1f)';
        settingsButton.style.border = '1px solid var(--border-color, #444)';
        settingsButton.style.padding = '6px';
        controls.appendChild(settingsButton);

        // Info button (top right)
        const infoButton = createIconButton(
            createInfoIcon(18, 'var(--text-color, #fff)'),
            'View plugin details',
            (e) => {
                e.stopPropagation();
                this.showPluginInfo(plugin);
            }
        );
        infoButton.style.backgroundColor = 'var(--background-box, #1f1f1f)';
        infoButton.style.border = '1px solid var(--border-color, #444)';
        infoButton.style.padding = '6px';
        controls.appendChild(infoButton);

        row.appendChild(info);
        row.appendChild(controls);

        return row;
    }

    showPluginInfo(plugin) {
        const infoContent = document.createElement('div');
        infoContent.style.display = 'flex';
        infoContent.style.flexDirection = 'column';
        infoContent.style.gap = '20px';
        infoContent.style.padding = '20px';
        infoContent.style.maxWidth = '600px';
        infoContent.style.width = '100%';
        infoContent.style.textAlign = 'left';

        // Plugin Information section (outline format)
        const pluginInfo = document.createElement('div');
        pluginInfo.style.border = '1px solid var(--border-color, #444)';
        pluginInfo.style.borderRadius = '8px';
        pluginInfo.style.padding = '16px';
        pluginInfo.style.backgroundColor = 'var(--background-box, #1f1f1f)';
        pluginInfo.style.textAlign = 'left';

        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = 'Plugin Information';
        sectionTitle.style.margin = '0 0 16px 0';
        sectionTitle.style.color = 'var(--text-color, #fff)';
        sectionTitle.style.fontSize = '1.2em';
        sectionTitle.style.textAlign = 'left';
        pluginInfo.appendChild(sectionTitle);

        // Create info list
        const infoList = document.createElement('div');
        infoList.style.display = 'flex';
        infoList.style.flexDirection = 'column';
        infoList.style.gap = '12px';

        const infoItems = [
            { label: 'Name:', value: plugin.name },
            { label: 'Author:', value: plugin.author || 'Unknown' },
            { label: 'Version:', value: plugin.version || '1.0.0' },
            { label: 'ID:', value: plugin.id },
            { label: 'Source:', value: plugin.source === 'builtin' ? 'built-in' : 
                      plugin.source === 'local' ? 'local' : 
                      plugin.cdn ? 'remote' : 
                      plugin.source || 'built-in' }
        ];

        infoItems.forEach(item => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.padding = '8px 0';
            row.style.borderBottom = '1px solid var(--border-color, #242424)';

            const label = document.createElement('span');
            label.textContent = item.label;
            label.style.color = 'var(--text-color-secondary, #aaa)';
            label.style.fontSize = '0.95em';
            label.style.fontWeight = '500';

            const value = document.createElement('span');
            value.textContent = item.value;
            value.style.color = 'var(--text-color, #fff)';
            value.style.fontSize = '0.95em';
            value.style.textAlign = 'right';
            value.style.maxWidth = '60%';
            value.style.overflow = 'hidden';
            value.style.textOverflow = 'ellipsis';
            value.style.whiteSpace = 'nowrap';

            row.appendChild(label);
            row.appendChild(value);
            infoList.appendChild(row);
        });

        pluginInfo.appendChild(infoList);
        infoContent.appendChild(pluginInfo);

        // Description if available
        if (plugin.description) {
            const descInfo = document.createElement('div');
            descInfo.style.border = '1px solid var(--border-color, #444)';
            descInfo.style.borderRadius = '8px';
            descInfo.style.padding = '16px';
            descInfo.style.backgroundColor = 'var(--background-box, #1f1f1f)';
            descInfo.style.textAlign = 'left';

            const descLabel = document.createElement('div');
            descLabel.textContent = 'Description:';
            descLabel.style.color = 'var(--text-color-secondary, #aaa)';
            descLabel.style.fontSize = '0.95em';
            descLabel.style.fontWeight = '500';
            descLabel.style.marginBottom = '8px';

            const descValue = document.createElement('p');
            descValue.textContent = plugin.description;
            descValue.style.margin = '0';
            descValue.style.color = 'var(--text-color, #fff)';
            descValue.style.lineHeight = '1.5';
            descValue.style.fontSize = '0.9em';

            descInfo.appendChild(descLabel);
            descInfo.appendChild(descValue);
            infoContent.appendChild(descInfo);
        }

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal custom-modal';
        modal.style.display = 'block';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.maxWidth = '650px';
        modalContent.style.width = '90%';

        const title = document.createElement('h2');
        title.textContent = 'Plugin Information';
        title.style.textAlign = 'left';
        title.style.marginBottom = '20px';
        title.style.color = 'var(--text-color, #fff)';
        modalContent.appendChild(title);

        // Left-align the content
        const contentWrapper = document.createElement('div');
        contentWrapper.style.display = 'flex';
        contentWrapper.style.justifyContent = 'flex-start';
        contentWrapper.style.width = '100%';
        contentWrapper.appendChild(infoContent);
        modalContent.appendChild(contentWrapper);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'modal-buttons';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.marginTop = '20px';

        const closeButton = document.createElement('button');
        closeButton.className = 'button button-primary';
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        });

        buttonContainer.appendChild(closeButton);
        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }

    showPluginSettings(plugin) {
        const settingsModal = new PluginSettingsModal(
            `pluginSettings-${plugin.id}`,
            plugin,
            this.pluginManager,
            () => {
                // Refresh plugin list when settings modal closes
                this.loadPlugins();
                const listElement = this.modal.querySelector('[data-plugin-list]');
                if (listElement) {
                    this.populatePluginList(listElement);
                }
            }
        );
        settingsModal.init();
        settingsModal.open();
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
        urlLabel.style.display = 'block';
        urlLabel.style.textAlign = 'left';
        
        const urlInput = document.createElement('input');
        urlInput.type = 'url';
        urlInput.className = 'input';
        urlInput.placeholder = 'https://cdn.example.com/plugin.js';
        urlInput.style.width = '100%';
        urlInput.style.boxSizing = 'border-box';

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
            const url = urlInput.value.trim();
            const result = await this.pluginManager.loadPluginFromUrl(url);
            
            if (result.success) {
                await ModalUtil.pluginResult(
                    true,
                    `Plugin "${result.pluginId || 'Unknown'}" loaded successfully!`,
                    null,
                    'Success'
                );
                this.loadPlugins();
                const listElement = this.modal.querySelector('[data-plugin-list]');
                if (listElement) {
                    this.populatePluginList(listElement);
                }
            } else {
                const errorMessage = result.error || 'Unknown error occurred';
                await ModalUtil.pluginResult(
                    false,
                    `Failed to load plugin from ${url}`,
                    errorMessage,
                    'Error'
                );
            }
        } catch (error) {
            console.error('Error loading plugin:', error);
            const url = urlInput.value.trim();
            await ModalUtil.pluginResult(
                false,
                `Failed to load plugin from ${url}`,
                error.message || String(error),
                'Error'
            );
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
