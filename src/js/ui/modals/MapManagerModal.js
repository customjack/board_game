import BaseModal from './BaseModal.js';
import MapStorageManager from '../../systems/storage/MapStorageManager.js';
import ModalUtil from '../../infrastructure/utils/ModalUtil.js';

export default class MapManagerModal extends BaseModal {
    constructor(id, config = {}) {
        super({
            id: id || 'mapManagerModal',
            title: 'Select a Map'
        });

        this.maps = [];
        this.filteredMaps = [];
        this.selectedMapId = null;
        this.onMapSelected = config.onMapSelected || null;
        this.onMapUploaded = config.onMapUploaded || null;
        this.isHost = config.isHost || false;
        this.factoryManager = config.factoryManager;

        this.applyButton = null;
    }

    init() {
        super.init();
        this.createApplyButton();
        this.loadMaps();
    }

    updateConfig(config = {}) {
        if (config.isHost !== undefined) this.isHost = config.isHost;
        if (config.onMapSelected !== undefined) this.onMapSelected = config.onMapSelected;
        if (config.onMapUploaded !== undefined) this.onMapUploaded = config.onMapUploaded;
        if (config.factoryManager !== undefined) this.factoryManager = config.factoryManager;
    }

    loadMaps() {
        this.maps = MapStorageManager.getAllMaps();
        this.filteredMaps = [...this.maps];
        this.selectedMapId = MapStorageManager.getSelectedMapId();
    }

    onOpen() {
        this.loadMaps();
        this.renderContent();
    }

    createApplyButton() {
        const headerButtons = this.modal.querySelector('.settings-modal-header-buttons');
        if (!headerButtons || headerButtons.querySelector('#applyMapSelection')) return;

        const applyButton = document.createElement('button');
        applyButton.className = 'button settings-modal-apply';
        applyButton.textContent = 'Apply Map';
        applyButton.id = 'applyMapSelection';
        applyButton.disabled = !this.selectedMapId;
        applyButton.addEventListener('click', () => this.handleConfirm());

        const closeButton = headerButtons.querySelector('.settings-modal-close');
        if (closeButton) {
            headerButtons.insertBefore(applyButton, closeButton);
        } else {
            headerButtons.appendChild(applyButton);
        }

        this.applyButton = applyButton;
    }

    renderContent() {
        const contentContainer = this.content;
        if (!contentContainer) return;

        contentContainer.innerHTML = '';
        contentContainer.classList.add('map-manager-body');
        // Ensure full width/height usage since we don't have a sidebar
        contentContainer.style.padding = '20px';
        contentContainer.style.display = 'flex';
        contentContainer.style.flexDirection = 'column';
        contentContainer.style.height = '100%';

        const toolbar = this.createSearchBar();
        const gridWrapper = this.createMapGrid();

        contentContainer.appendChild(toolbar);
        contentContainer.appendChild(gridWrapper);

        const gridElement = gridWrapper.querySelector('[data-map-grid]');
        this.populateMapGrid(gridElement);
        this.updateApplyButtonState();
    }

    createSearchBar() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'map-search-container';
        searchContainer.style.marginBottom = '16px';
        searchContainer.style.display = 'flex';
        searchContainer.style.gap = '10px';
        searchContainer.style.alignItems = 'center';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'input map-search-input';
        searchInput.placeholder = 'Search maps by name, author, or description...';
        searchInput.style.flex = '1';

        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        const uploadButton = document.createElement('button');
        uploadButton.className = 'button button-primary';
        uploadButton.textContent = '+ Upload Custom Map';
        uploadButton.style.display = this.isHost ? '' : 'none';
        uploadButton.addEventListener('click', () => this.handleUpload());

        searchContainer.appendChild(searchInput);
        searchContainer.appendChild(uploadButton);

        return searchContainer;
    }

    createMapGrid() {
        const gridContainer = document.createElement('div');
        gridContainer.className = 'map-grid-container';
        gridContainer.style.flex = '1';
        gridContainer.style.overflowY = 'auto';
        gridContainer.style.minHeight = '320px';
        gridContainer.style.padding = '4px';

        const mapGrid = document.createElement('div');
        mapGrid.className = 'map-grid';
        mapGrid.setAttribute('data-map-grid', '');
        mapGrid.style.display = 'grid';
        mapGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
        mapGrid.style.gap = '16px';
        mapGrid.style.padding = '8px';

        gridContainer.appendChild(mapGrid);
        return gridContainer;
    }

    populateMapGrid(gridElement) {
        if (!gridElement) return;
        gridElement.innerHTML = '';

        if (this.filteredMaps.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = 'No maps found';
            noResults.style.gridColumn = '1 / -1';
            noResults.style.textAlign = 'center';
            noResults.style.padding = '40px';
            noResults.style.color = '#888';
            gridElement.appendChild(noResults);
            return;
        }

        this.filteredMaps.forEach(map => {
            const card = this.createMapCard(map);
            gridElement.appendChild(card);
        });
    }

    createMapCard(map) {
        const card = document.createElement('div');
        card.className = 'map-card';
        card.setAttribute('data-map-id', map.id);
        // Use theme variables
        card.style.border = '1px solid var(--border-color, #444)';
        card.style.borderRadius = '8px';
        card.style.overflow = 'hidden';
        card.style.cursor = 'pointer';
        card.style.transition = 'all 0.2s ease';
        card.style.backgroundColor = 'var(--background-box, #1f1f1f)';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';

        if (map.id === this.selectedMapId) {
            card.classList.add('selected');
            card.style.borderColor = 'var(--color-primary, #4a90e2)';
            card.style.boxShadow = '0 0 0 2px var(--color-primary, #4a90e2)';
        }

        card.addEventListener('click', () => this.handleMapCardClick(card, map.id));

        const thumbnail = document.createElement('div');
        thumbnail.className = 'map-thumbnail';
        thumbnail.style.height = '140px';
        thumbnail.style.backgroundColor = 'var(--background-secondary, #141414)';
        thumbnail.style.display = 'flex';
        thumbnail.style.alignItems = 'center';
        thumbnail.style.justifyContent = 'center';

        if (map.thumbnail) {
            const img = document.createElement('img');
            img.src = map.thumbnail;
            img.alt = map.name;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            thumbnail.appendChild(img);
        } else {
            thumbnail.textContent = '🗺️';
            thumbnail.style.fontSize = '48px';
        }

        const info = document.createElement('div');
        info.className = 'map-info';
        info.style.padding = '14px';
        info.style.flex = '1';
        info.style.display = 'flex';
        info.style.flexDirection = 'column';
        info.style.gap = '8px';

        // Header with name and info button
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'flex-start';
        header.style.gap = '8px';

        const nameAuthor = document.createElement('div');
        nameAuthor.style.flex = '1';
        nameAuthor.style.minWidth = '0'; // Allow text truncation

        const name = document.createElement('h3');
        name.className = 'map-name';
        name.textContent = map.name;
        name.style.margin = '0 0 4px 0';
        name.style.fontSize = '1.05em';
        name.style.color = 'var(--text-color, #fff)';
        name.style.overflow = 'hidden';
        name.style.textOverflow = 'ellipsis';
        name.style.whiteSpace = 'nowrap';

        const author = document.createElement('p');
        author.className = 'map-author';
        author.textContent = `by ${map.author}`;
        author.style.margin = '0';
        author.style.fontSize = '0.9em';
        author.style.color = 'var(--text-color-secondary, #aaa)';
        author.style.overflow = 'hidden';
        author.style.textOverflow = 'ellipsis';
        author.style.whiteSpace = 'nowrap';

        nameAuthor.appendChild(name);
        nameAuthor.appendChild(author);

        // Info button
        const infoButton = document.createElement('button');
        infoButton.className = 'button button-secondary';
        infoButton.textContent = 'ℹ️';
        infoButton.title = 'View map details';
        infoButton.style.padding = '4px 8px';
        infoButton.style.fontSize = '1.2em';
        infoButton.style.minWidth = '32px';
        infoButton.style.flexShrink = '0';
        infoButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showMapInfo(map);
        });

        header.appendChild(nameAuthor);
        header.appendChild(infoButton);

        // Actions for custom maps (host only)
        if (!map.isBuiltIn && this.isHost) {
            const actions = document.createElement('div');
            actions.className = 'map-actions';
            actions.style.display = 'flex';
            actions.style.gap = '8px';
            actions.style.marginTop = '4px';

            const exportButton = document.createElement('button');
            exportButton.className = 'button button-secondary button-small';
            exportButton.textContent = 'Export';
            exportButton.style.fontSize = '0.75em';
            exportButton.style.padding = '4px 8px';
            exportButton.style.flex = '1';
            exportButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleExport(map.id);
            });

            const deleteButton = document.createElement('button');
            deleteButton.className = 'button button-danger button-small';
            deleteButton.textContent = 'Delete';
            deleteButton.style.fontSize = '0.75em';
            deleteButton.style.padding = '4px 8px';
            deleteButton.style.flex = '1';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleDelete(map.id);
            });

            actions.appendChild(exportButton);
            actions.appendChild(deleteButton);
            info.appendChild(actions);
        }

        info.appendChild(header);

        card.appendChild(thumbnail);
        card.appendChild(info);

        return card;
    }

    handleSearch(query) {
        this.filteredMaps = MapStorageManager.searchMaps(query);
        const gridElement = this.modal.querySelector('[data-map-grid]');
        if (gridElement) {
            this.populateMapGrid(gridElement);
        }
    }

    handleMapCardClick(card, mapId) {
        const allCards = this.modal.querySelectorAll('.map-card');
        allCards.forEach(c => {
            c.classList.remove('selected');
            c.style.borderColor = 'var(--border-color, #444)';
            c.style.boxShadow = 'none';
        });

        card.classList.add('selected');
        card.style.borderColor = 'var(--primary-color, #4a90e2)';
        card.style.boxShadow = '0 0 0 2px var(--primary-color, #4a90e2)';

        this.selectedMapId = mapId;
        this.updateApplyButtonState();
    }

    async handleConfirm() {
        if (!this.selectedMapId) {
            await ModalUtil.alert('Please select a map first');
            return;
        }

        MapStorageManager.setSelectedMapId(this.selectedMapId);

        if (this.onMapSelected) {
            try {
                await this.onMapSelected(this.selectedMapId);
            } catch (error) {
                console.error('Error in onMapSelected callback:', error);
                await ModalUtil.alert(`Failed to load map: ${error.message}`);
                return;
            }
        }

        this.close();
    }

    updateApplyButtonState() {
        if (this.applyButton) {
            this.applyButton.disabled = !this.selectedMapId;
        }
    }

    handleUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';

        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    await this.uploadMapFile(file);
                } catch (error) {
                    console.error('Error uploading map:', error);
                    await ModalUtil.alert(`Failed to upload map: ${error.message}`);
                }
            }
        });

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    async uploadMapFile(file) {
        const text = await file.text();
        const mapData = JSON.parse(text);

        const mapObject = MapStorageManager.addCustomMap(mapData);

        this.loadMaps();
        const gridElement = this.modal.querySelector('[data-map-grid]');
        if (gridElement) {
            this.populateMapGrid(gridElement);
        }

        if (this.onMapUploaded) {
            this.onMapUploaded(mapObject);
        }

        await ModalUtil.alert(`Map "${mapObject.name}" uploaded successfully!`);
    }

    async handleDelete(mapId) {
        const map = MapStorageManager.getMapById(mapId);
        if (!map) return;

        const confirmed = await ModalUtil.confirm(
            `Are you sure you want to delete "${map.name}"?`,
            'Delete Map'
        );

        if (confirmed) {
            MapStorageManager.deleteCustomMap(mapId);
            this.loadMaps();

            const gridElement = this.modal.querySelector('[data-map-grid]');
            if (gridElement) {
                this.populateMapGrid(gridElement);
            }

            if (this.selectedMapId === mapId) {
                this.selectedMapId = 'default';
                MapStorageManager.setSelectedMapId('default');
            }

            this.updateApplyButtonState();
        }
    }

    async handleExport(mapId) {
        try {
            await MapStorageManager.exportMap(mapId);
        } catch (error) {
            console.error('Error exporting map:', error);
            await ModalUtil.alert(`Failed to export map: ${error.message}`);
        }
    }

    async showMapInfo(map) {
        // Load map data to get full information
        let mapData = null;
        try {
            mapData = await MapStorageManager.loadMapData(map.id);
        } catch (error) {
            console.error('Error loading map data:', error);
        }

        const infoContent = document.createElement('div');
        infoContent.style.display = 'flex';
        infoContent.style.flexDirection = 'column';
        infoContent.style.gap = '16px';
        infoContent.style.padding = '16px';
        infoContent.style.maxWidth = '500px';

        // Basic info
        const basicInfo = document.createElement('div');
        basicInfo.style.display = 'flex';
        basicInfo.style.flexDirection = 'column';
        basicInfo.style.gap = '8px';

        const name = document.createElement('h3');
        name.textContent = map.name;
        name.style.margin = '0';
        name.style.color = 'var(--text-color, #fff)';

        const author = document.createElement('p');
        author.textContent = `Author: ${map.author}`;
        author.style.margin = '0';
        author.style.color = 'var(--text-color-secondary, #aaa)';

        const description = document.createElement('p');
        description.textContent = map.description || map.metadata?.description || 'No description available';
        description.style.margin = '8px 0 0 0';
        description.style.color = 'var(--text-color, #fff)';
        description.style.lineHeight = '1.5';

        basicInfo.appendChild(name);
        basicInfo.appendChild(author);
        basicInfo.appendChild(description);
        infoContent.appendChild(basicInfo);

        // Engine info
        const engine = map.engineType ||
            mapData?.engine?.type ||
            mapData?.metadata?.gameEngine?.type ||
            'turn-based';

        const engineInfo = document.createElement('div');
        engineInfo.style.display = 'flex';
        engineInfo.style.flexDirection = 'column';
        engineInfo.style.gap = '8px';
        engineInfo.style.padding = '12px';
        engineInfo.style.backgroundColor = 'var(--background-secondary, #202020)';
        engineInfo.style.borderRadius = '8px';

        const engineLabel = document.createElement('strong');
        engineLabel.textContent = 'Game Engine:';
        engineLabel.style.color = 'var(--text-color, #fff)';

        const engineValue = document.createElement('span');
        engineValue.textContent = engine;
        engineValue.style.color = 'var(--color-info, #8aa2ff)';

        engineInfo.appendChild(engineLabel);
        engineInfo.appendChild(engineValue);
        infoContent.appendChild(engineInfo);

        // Plugin requirements
        const plugins = mapData?.requirements?.plugins || [];
        const nonCorePlugins = plugins.filter(p => {
            const id = typeof p === 'string' ? p : p.id;
            return id !== 'core' && (typeof p === 'object' ? p.source !== 'builtin' : false);
        });

        if (nonCorePlugins.length > 0) {
            const pluginsInfo = document.createElement('div');
            pluginsInfo.style.display = 'flex';
            pluginsInfo.style.flexDirection = 'column';
            pluginsInfo.style.gap = '8px';
            pluginsInfo.style.padding = '12px';
            pluginsInfo.style.backgroundColor = 'var(--background-secondary, #202020)';
            pluginsInfo.style.borderRadius = '8px';

            const pluginsLabel = document.createElement('strong');
            pluginsLabel.textContent = 'Required Plugins:';
            pluginsLabel.style.color = 'var(--text-color, #fff)';
            pluginsLabel.style.marginBottom = '4px';

            const pluginsList = document.createElement('div');
            pluginsList.style.display = 'flex';
            pluginsList.style.flexDirection = 'column';
            pluginsList.style.gap = '6px';

            nonCorePlugins.forEach(plugin => {
                const pluginItem = document.createElement('div');
                pluginItem.style.display = 'flex';
                pluginItem.style.flexDirection = 'column';
                pluginItem.style.gap = '2px';
                pluginItem.style.padding = '6px';
                pluginItem.style.backgroundColor = 'var(--background-box, #151515)';
                pluginItem.style.borderRadius = '4px';

                const pluginName = document.createElement('span');
                pluginName.textContent = (typeof plugin === 'object' ? plugin.name || plugin.id : plugin);
                pluginName.style.color = 'var(--text-color, #fff)';
                pluginName.style.fontWeight = '500';

                const pluginDesc = document.createElement('span');
                pluginDesc.textContent = (typeof plugin === 'object' ? plugin.description || 'No description' : 'No description');
                pluginDesc.style.fontSize = '0.85em';
                pluginDesc.style.color = 'var(--text-color-secondary, #aaa)';

                if (typeof plugin === 'object' && plugin.cdn) {
                    const pluginSource = document.createElement('span');
                    pluginSource.textContent = `Source: ${plugin.cdn}`;
                    pluginSource.style.fontSize = '0.75em';
                    pluginSource.style.color = 'var(--text-color-tertiary, #666)';
                    pluginItem.appendChild(pluginSource);
                }

                pluginItem.appendChild(pluginName);
                pluginItem.appendChild(pluginDesc);
                pluginsList.appendChild(pluginItem);
            });

            pluginsInfo.appendChild(pluginsLabel);
            pluginsInfo.appendChild(pluginsList);
            infoContent.appendChild(pluginsInfo);
        }

        // Map source info
        const sourceInfo = document.createElement('div');
        sourceInfo.style.display = 'flex';
        sourceInfo.style.justifyContent = 'space-between';
        sourceInfo.style.padding = '8px';
        sourceInfo.style.fontSize = '0.85em';
        sourceInfo.style.color = 'var(--text-color-secondary, #aaa)';

        const sourceLabel = document.createElement('span');
        sourceLabel.textContent = 'Source:';
        const sourceValue = document.createElement('span');
        sourceValue.textContent = map.isBuiltIn ? 'Built-in' : 'Custom Upload';
        sourceValue.style.color = map.isBuiltIn ? 'var(--color-info, #8aa2ff)' : 'var(--color-warning, #ffa726)';

        sourceInfo.appendChild(sourceLabel);
        sourceInfo.appendChild(sourceValue);
        infoContent.appendChild(sourceInfo);

        // Create a simple info modal (no cancel button needed)
        const modal = document.createElement('div');
        modal.className = 'modal custom-modal';
        modal.style.display = 'block';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.maxWidth = '600px';

        const title = document.createElement('h2');
        title.textContent = 'Map Information';
        modalContent.appendChild(title);

        modalContent.appendChild(infoContent);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'modal-buttons';
        buttonContainer.style.justifyContent = 'flex-end';

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
}
