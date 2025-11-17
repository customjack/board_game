/**
 * MapSelectionUI - UI component for selecting maps in the lobby
 *
 * Provides a modal interface for:
 * - Browsing available maps (built-in + custom)
 * - Searching/filtering maps
 * - Previewing map details
 * - Selecting a map for the game
 * - Uploading custom maps
 */

import BaseUIComponent from '../BaseUIComponent.js';
import MapStorageManager from '../../managers/MapStorageManager.js';
import ModalUtil from '../../utils/ModalUtil.js';

export default class MapSelectionUI extends BaseUIComponent {
    constructor(config = {}) {
        super({
            id: 'MapSelectionUI',
            ...config
        });

        this.maps = [];
        this.filteredMaps = [];
        this.selectedMapId = null;
        this.onMapSelected = config.onMapSelected || null;
        this.onMapUploaded = config.onMapUploaded || null;
        this.isHost = config.isHost || false;
    }

    /**
     * Initialize the component
     */
    init() {
        super.init();
        this.loadMaps();
    }

    /**
     * Load all available maps
     */
    loadMaps() {
        this.maps = MapStorageManager.getAllMaps();
        this.filteredMaps = [...this.maps];
        this.selectedMapId = MapStorageManager.getSelectedMapId();
    }

    /**
     * Show the map selection modal
     */
    showMapSelectionModal() {
        this.loadMaps(); // Refresh maps before showing

        const modal = this.createMapSelectionModal();
        document.body.appendChild(modal);
        this.activeModal = modal;

        // Setup event listeners
        this.setupModalEventListeners(modal);
    }

    /**
     * Create the map selection modal
     * @returns {HTMLElement} Modal element
     */
    createMapSelectionModal() {
        const modal = document.createElement('div');
        modal.className = 'modal map-selection-modal';
        modal.style.display = 'block';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content map-selection-content';

        // Header
        const header = this.createModalHeader();
        modalContent.appendChild(header);

        // Search bar
        const searchBar = this.createSearchBar();
        modalContent.appendChild(searchBar);

        // Map grid
        const mapGrid = this.createMapGrid();
        modalContent.appendChild(mapGrid);

        // Action buttons
        const actionButtons = this.createActionButtons();
        modalContent.appendChild(actionButtons);

        modal.appendChild(modalContent);
        return modal;
    }

    /**
     * Create modal header
     * @returns {HTMLElement} Header element
     */
    createModalHeader() {
        const header = document.createElement('div');
        header.className = 'map-selection-header';

        const title = document.createElement('h2');
        title.textContent = 'Select a Map';

        const closeButton = document.createElement('button');
        closeButton.className = 'button button-close';
        closeButton.textContent = '×';
        closeButton.setAttribute('data-action', 'close');

        header.appendChild(title);
        header.appendChild(closeButton);

        return header;
    }

    /**
     * Create search bar
     * @returns {HTMLElement} Search bar element
     */
    createSearchBar() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'map-search-container';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'input map-search-input';
        searchInput.placeholder = 'Search maps by name, author, or description...';
        searchInput.setAttribute('data-search-input', '');

        const uploadButton = document.createElement('button');
        uploadButton.className = 'button button-primary';
        uploadButton.textContent = '+ Upload Custom Map';
        uploadButton.setAttribute('data-action', 'upload');
        uploadButton.style.display = this.isHost ? '' : 'none';

        searchContainer.appendChild(searchInput);
        searchContainer.appendChild(uploadButton);

        return searchContainer;
    }

    /**
     * Create map grid
     * @returns {HTMLElement} Map grid element
     */
    createMapGrid() {
        const gridContainer = document.createElement('div');
        gridContainer.className = 'map-grid-container';

        const mapGrid = document.createElement('div');
        mapGrid.className = 'map-grid';
        mapGrid.setAttribute('data-map-grid', '');

        this.populateMapGrid(mapGrid);

        gridContainer.appendChild(mapGrid);
        return gridContainer;
    }

    /**
     * Populate the map grid with map cards
     * @param {HTMLElement} gridElement - Grid element to populate
     */
    populateMapGrid(gridElement) {
        gridElement.innerHTML = '';

        if (this.filteredMaps.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = 'No maps found';
            gridElement.appendChild(noResults);
            return;
        }

        this.filteredMaps.forEach(map => {
            const card = this.createMapCard(map);
            gridElement.appendChild(card);
        });
    }

    /**
     * Create a map card
     * @param {Object} map - Map object
     * @returns {HTMLElement} Map card element
     */
    createMapCard(map) {
        const card = document.createElement('div');
        card.className = 'map-card';
        card.setAttribute('data-map-id', map.id);

        if (map.id === this.selectedMapId) {
            card.classList.add('selected');
        }

        // Thumbnail or placeholder
        const thumbnail = document.createElement('div');
        thumbnail.className = 'map-thumbnail';

        if (map.thumbnail) {
            const img = document.createElement('img');
            img.src = map.thumbnail;
            img.alt = map.name;
            thumbnail.appendChild(img);
        } else {
            thumbnail.textContent = '🗺️';
            thumbnail.style.fontSize = '48px';
            thumbnail.style.display = 'flex';
            thumbnail.style.alignItems = 'center';
            thumbnail.style.justifyContent = 'center';
        }

        // Map info
        const info = document.createElement('div');
        info.className = 'map-info';

        const name = document.createElement('h3');
        name.className = 'map-name';
        name.textContent = map.name;

        const author = document.createElement('p');
        author.className = 'map-author';
        author.textContent = `by ${map.author}`;

        // Engine type
        const engineType = document.createElement('p');
        engineType.className = 'map-engine-type';
        engineType.style.fontSize = '0.85em';
        engineType.style.color = '#666';
        engineType.style.fontStyle = 'italic';
        const engine = map.engineType ||
            map.metadata?.gameEngine?.type ||
            map.gameEngine?.type ||
            map.boardData?.metadata?.gameEngine?.type ||
            map.boardData?.engine?.type ||
            'turn-based';
        engineType.textContent = `Engine: ${engine}`;

        const description = document.createElement('p');
        description.className = 'map-description';
        description.textContent = map.description || 'No description available';

        // Board requirements (from gameRules)
        const requirements = this.createRequirementsDisplay(map);
        if (requirements) {
            info.appendChild(requirements);
        }

        // Tags/badges
        const tags = document.createElement('div');
        tags.className = 'map-tags';

        if (map.isBuiltIn) {
            const builtInTag = document.createElement('span');
            builtInTag.className = 'map-tag built-in';
            builtInTag.textContent = 'Built-in';
            tags.appendChild(builtInTag);
        }

        info.appendChild(name);
        info.appendChild(author);
        info.appendChild(engineType);
        info.appendChild(description);
        info.appendChild(tags);

        // Actions (for custom maps)
        if (!map.isBuiltIn && this.isHost) {
            const actions = document.createElement('div');
            actions.className = 'map-actions';

            const deleteButton = document.createElement('button');
            deleteButton.className = 'button button-danger button-small';
            deleteButton.textContent = 'Delete';
            deleteButton.setAttribute('data-action', 'delete');
            deleteButton.setAttribute('data-map-id', map.id);

            const exportButton = document.createElement('button');
            exportButton.className = 'button button-secondary button-small';
            exportButton.textContent = 'Export';
            exportButton.setAttribute('data-action', 'export');
            exportButton.setAttribute('data-map-id', map.id);

            actions.appendChild(exportButton);
            actions.appendChild(deleteButton);
            info.appendChild(actions);
        }

        card.appendChild(thumbnail);
        card.appendChild(info);

        return card;
    }

    /**
     * Create requirements display from map's gameRules
     * @param {Object} map - Map object with boardData
     * @returns {HTMLElement|null} Requirements element or null
     */
    createRequirementsDisplay(map) {
        const requirements = map.boardData?.requirements;
        const rules = map.boardData?.rules;
        if (!requirements && !rules) {
            return null;
        }

        const reqDiv = document.createElement('div');
        reqDiv.className = 'map-requirements';

        const minPlayers = requirements?.minPlayers;
        const maxPlayers = requirements?.maxPlayers;
        if (minPlayers || maxPlayers) {
            const min = minPlayers || 1;
            const max = maxPlayers || '∞';
            const playerReq = document.createElement('div');
            playerReq.className = 'map-requirement';
            playerReq.innerHTML = `<span class="req-icon">👥</span> Players: ${min}-${max}`;
            reqDiv.appendChild(playerReq);
        }

        const recommended = rules?.recommendedPlayers;
        if (recommended && (recommended.min || recommended.max)) {
            const rec = document.createElement('div');
            rec.className = 'map-requirement';
            let recText;
            if (recommended.min && recommended.max && recommended.min !== recommended.max) {
                recText = `${recommended.min}-${recommended.max}`;
            } else if (recommended.min && recommended.max) {
                recText = `${recommended.min}`;
            } else if (recommended.min) {
                recText = `${recommended.min}+`;
            } else {
                recText = `≤${recommended.max}`;
            }
            rec.innerHTML = `<span class="req-icon">⭐</span> Recommended: ${recText}`;
            reqDiv.appendChild(rec);
        }

        return reqDiv.children.length > 0 ? reqDiv : null;
    }

    /**
     * Create action buttons (bottom of modal)
     * @returns {HTMLElement} Action buttons container
     */
    createActionButtons() {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'modal-buttons';

        const cancelButton = document.createElement('button');
        cancelButton.className = 'button button-secondary';
        cancelButton.textContent = 'Cancel';
        cancelButton.setAttribute('data-action', 'close');

        const confirmButton = document.createElement('button');
        confirmButton.className = 'button button-primary';
        confirmButton.textContent = 'Select Map';
        confirmButton.setAttribute('data-action', 'confirm');

        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);

        return buttonContainer;
    }

    /**
     * Setup event listeners for the modal
     * @param {HTMLElement} modal - Modal element
     */
    setupModalEventListeners(modal) {
        // Search input
        const searchInput = modal.querySelector('[data-search-input]');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value, modal);
            });
        }

        // Map card clicks (selection)
        const mapGrid = modal.querySelector('[data-map-grid]');
        if (mapGrid) {
            mapGrid.addEventListener('click', (e) => {
                const card = e.target.closest('.map-card');
                if (card) {
                    this.handleMapCardClick(card, modal);
                }
            });
        }

        // Action buttons
        modal.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');

            switch (action) {
                case 'close':
                    this.closeModal(modal);
                    break;
                case 'confirm':
                    this.handleConfirm(modal);
                    break;
                case 'upload':
                    this.handleUpload();
                    break;
                case 'delete':
                    this.handleDelete(e.target.getAttribute('data-map-id'), modal);
                    break;
                case 'export':
                    this.handleExport(e.target.getAttribute('data-map-id'));
                    break;
            }
        });
    }

    /**
     * Handle search input
     * @param {string} query - Search query
     * @param {HTMLElement} modal - Modal element
     */
    handleSearch(query, modal) {
        this.filteredMaps = MapStorageManager.searchMaps(query);
        const mapGrid = modal.querySelector('[data-map-grid]');
        if (mapGrid) {
            this.populateMapGrid(mapGrid);
        }
    }

    /**
     * Handle map card click (selection)
     * @param {HTMLElement} card - Map card element
     * @param {HTMLElement} modal - Modal element
     */
    handleMapCardClick(card, modal) {
        // Remove selection from all cards
        modal.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));

        // Add selection to clicked card
        card.classList.add('selected');

        // Update selected map ID
        this.selectedMapId = card.getAttribute('data-map-id');
    }

    /**
     * Handle confirm button
     * @param {HTMLElement} modal - Modal element
     */
    async handleConfirm(modal) {
        if (!this.selectedMapId) {
            await ModalUtil.alert('Please select a map first');
            return;
        }

        // Save selection to localStorage
        MapStorageManager.setSelectedMapId(this.selectedMapId);

        // Call callback if provided
        if (this.onMapSelected) {
            try {
                await this.onMapSelected(this.selectedMapId);
            } catch (error) {
                console.error('Error in onMapSelected callback:', error);
                await ModalUtil.alert(`Failed to load map: ${error.message}`);
                return;
            }
        }

        this.closeModal(modal);
    }

    /**
     * Handle upload button
     */
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

    /**
     * Upload a map file
     * @param {File} file - Map JSON file
     */
    async uploadMapFile(file) {
        const text = await file.text();
        const mapData = JSON.parse(text);

        // Validate and add the map
        const mapObject = MapStorageManager.addCustomMap(mapData);

        // Reload maps and refresh UI
        this.loadMaps();

        if (this.activeModal) {
            const mapGrid = this.activeModal.querySelector('[data-map-grid]');
            if (mapGrid) {
                this.populateMapGrid(mapGrid);
            }
        }

        // Call callback if provided
        if (this.onMapUploaded) {
            this.onMapUploaded(mapObject);
        }

        await ModalUtil.alert(`Map "${mapObject.name}" uploaded successfully!`);
    }

    /**
     * Handle delete button
     * @param {string} mapId - Map ID to delete
     * @param {HTMLElement} modal - Modal element
     */
    async handleDelete(mapId, modal) {
        const map = MapStorageManager.getMapById(mapId);
        if (!map) return;

        const confirmed = await ModalUtil.confirm(
            `Are you sure you want to delete "${map.name}"?`,
            'Delete Map'
        );

        if (confirmed) {
            MapStorageManager.deleteCustomMap(mapId);
            this.loadMaps();

            const mapGrid = modal.querySelector('[data-map-grid]');
            if (mapGrid) {
                this.populateMapGrid(mapGrid);
            }

            // If deleted map was selected, reset to default
            if (this.selectedMapId === mapId) {
                this.selectedMapId = 'default';
                MapStorageManager.setSelectedMapId('default');
            }
        }
    }

    /**
     * Handle export button
     * @param {string} mapId - Map ID to export
     */
    async handleExport(mapId) {
        try {
            await MapStorageManager.exportMap(mapId);
        } catch (error) {
            console.error('Error exporting map:', error);
            await ModalUtil.alert(`Failed to export map: ${error.message}`);
        }
    }

    /**
     * Close the modal
     * @param {HTMLElement} modal - Modal element
     */
    closeModal(modal) {
        modal.style.display = 'none';
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
        this.activeModal = null;
    }

    /**
     * Clean up component
     */
    cleanup() {
        if (this.activeModal) {
            this.closeModal(this.activeModal);
        }
        super.cleanup();
    }
}
