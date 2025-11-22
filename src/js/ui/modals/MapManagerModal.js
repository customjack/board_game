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

        const name = document.createElement('h3');
        name.className = 'map-name';
        name.textContent = map.name;
        name.style.margin = '0 0 6px 0';
        name.style.fontSize = '1.05em';
        name.style.color = 'var(--text-color, #fff)';

        const author = document.createElement('p');
        author.className = 'map-author';
        author.textContent = `by ${map.author}`;
        author.style.margin = '0 0 8px 0';
        author.style.fontSize = '0.9em';
        author.style.color = 'var(--text-color-secondary, #aaa)';

        const engineType = document.createElement('p');
        engineType.style.fontSize = '0.85em';
        engineType.style.color = 'var(--text-tertiary, #777)';
        engineType.style.fontStyle = 'italic';
        engineType.style.marginBottom = '6px';
        const engine = map.engineType ||
            map.metadata?.gameEngine?.type ||
            map.gameEngine?.type ||
            map.boardData?.metadata?.gameEngine?.type ||
            map.boardData?.engine?.type ||
            'turn-based';
        engineType.textContent = `Engine: ${engine}`;

        const tags = document.createElement('div');
        tags.className = 'map-tags';
        tags.style.display = 'flex';
        tags.style.gap = '6px';
        tags.style.flexWrap = 'wrap';
        tags.style.marginTop = '8px';

        if (map.isBuiltIn) {
            const builtInTag = document.createElement('span');
            builtInTag.className = 'map-tag built-in';
            builtInTag.textContent = 'Built-in';
            builtInTag.style.backgroundColor = 'var(--background-secondary, #2f2f2f)';
            builtInTag.style.color = 'var(--text-color, #fff)';
            builtInTag.style.border = '1px solid var(--border-color, #444)';
            builtInTag.style.fontSize = '0.75em';
            builtInTag.style.padding = '2px 6px';
            builtInTag.style.borderRadius = '4px';
            tags.appendChild(builtInTag);
        }

        const engineTag = document.createElement('span');
        engineTag.textContent = engine;
        engineTag.style.backgroundColor = 'var(--background-secondary, #2f3644)';
        engineTag.style.color = 'var(--color-info, #cdd9ff)';
        engineTag.style.border = '1px solid var(--border-color, #444)';
        engineTag.style.fontSize = '0.75em';
        engineTag.style.padding = '2px 6px';
        engineTag.style.borderRadius = '4px';
        tags.appendChild(engineTag);

        if (!map.isBuiltIn && this.isHost) {
            const customTag = document.createElement('span');
            customTag.textContent = 'Custom';
            customTag.style.backgroundColor = 'var(--background-secondary, #3a2f2f)';
            customTag.style.color = 'var(--color-warning, #ffd2d2)';
            customTag.style.border = '1px solid var(--border-color, #444)';
            customTag.style.fontSize = '0.75em';
            customTag.style.padding = '2px 6px';
            customTag.style.borderRadius = '4px';
            tags.appendChild(customTag);
        }

        if (!map.isBuiltIn && this.isHost) {
            const actions = document.createElement('div');
            actions.className = 'map-actions';
            actions.style.marginTop = '10px';
            actions.style.display = 'flex';
            actions.style.gap = '8px';

            const deleteButton = document.createElement('button');
            deleteButton.className = 'button button-danger button-small';
            deleteButton.textContent = 'Delete';
            deleteButton.style.fontSize = '0.8em';
            deleteButton.style.padding = '4px 8px';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleDelete(map.id);
            });

            const exportButton = document.createElement('button');
            exportButton.className = 'button button-secondary button-small';
            exportButton.textContent = 'Export';
            exportButton.style.fontSize = '0.8em';
            exportButton.style.padding = '4px 8px';
            exportButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleExport(map.id);
            });

            actions.appendChild(exportButton);
            actions.appendChild(deleteButton);
            info.appendChild(actions);
        }

        info.appendChild(name);
        info.appendChild(author);
        info.appendChild(engineType);
        info.appendChild(tags);

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
}
