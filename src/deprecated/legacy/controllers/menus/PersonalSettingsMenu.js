/**
 * PersonalSettingsMenu - Sidebar-based personal settings interface
 *
 * Provides a modal dialog with:
 * - Left sidebar showing category navigation
 * - Right content area showing settings for selected category
 * - Support for General settings and Plugins & Maps management
 */

import MapStorageManager from '../../../../js/systems/storage/MapStorageManager.js';

export default class PersonalSettingsMenu {
    constructor(modalId, personalSettings, factoryManager, pluginManager, localStorageManager) {
        this.modalId = modalId;
        this.personalSettings = personalSettings;
        this.factoryManager = factoryManager;
        this.pluginManager = pluginManager;
        this.localStorageManager = localStorageManager;

        // Define available themes
        this.availableThemes = ['light', 'dark', 'retro'];

        // Define categories
        this.categories = {
            GRAPHICS: 'graphics',
            GAMEPLAY: 'gameplay',
            PLUGINS: 'plugins',
            MAPS: 'maps',
            MISC: 'miscellaneous'
        };

        this.selectedCategory = this.categories.GRAPHICS;

        // Modal elements
        this.modal = document.getElementById(modalId);
        this.sidebar = document.getElementById('personalSettingsSidebar');
        this.content = document.getElementById('personalSettingsContent');
        this.closeButton = document.getElementById('closeSettingsButton');

        // Input elements (stored for general settings)
        this.elements = new Map();

        this.initialize();
    }

    initialize() {
        // Set up close button
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.hide());
        }

        // Close on backdrop click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hide();
                }
            });
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.style.display === 'flex') {
                this.hide();
            }
        });

        // Render sidebar and content
        this.renderSidebar();
        this.renderContent();
    }

    /**
     * Render the sidebar navigation
     */
    renderSidebar() {
        if (!this.sidebar) return;

        this.sidebar.innerHTML = '';

        // Graphics
        const graphicsNav = this.createNavItem('Graphics', this.categories.GRAPHICS);
        this.sidebar.appendChild(graphicsNav);

        // Gameplay
        const gameplayNav = this.createNavItem('Gameplay', this.categories.GAMEPLAY);
        this.sidebar.appendChild(gameplayNav);

        // Plugins
        const pluginsNav = this.createNavItem('Plugins', this.categories.PLUGINS);
        this.sidebar.appendChild(pluginsNav);

        // Maps
        const mapsNav = this.createNavItem('Maps', this.categories.MAPS);
        this.sidebar.appendChild(mapsNav);

        // Miscellaneous
        const miscNav = this.createNavItem('Miscellaneous', this.categories.MISC);
        this.sidebar.appendChild(miscNav);
    }

    /**
     * Create a navigation item
     */
    createNavItem(label, category) {
        const navItem = document.createElement('div');
        navItem.className = 'settings-nav-item';
        navItem.setAttribute('data-category', category);

        if (category === this.selectedCategory) {
            navItem.classList.add('active');
        }

        navItem.textContent = label;
        navItem.addEventListener('click', () => this.selectCategory(category));

        return navItem;
    }

    /**
     * Select a category
     */
    selectCategory(category) {
        this.selectedCategory = category;

        // Update active state in sidebar
        const navItems = this.sidebar.querySelectorAll('.settings-nav-item');
        navItems.forEach(item => {
            if (item.getAttribute('data-category') === category) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Re-render content
        this.renderContent();
    }

    /**
     * Render the content area
     */
    renderContent() {
        if (!this.content) return;

        if (this.selectedCategory === this.categories.GRAPHICS) {
            this.renderGraphicsSettings();
        } else if (this.selectedCategory === this.categories.GAMEPLAY) {
            this.renderGameplaySettings();
        } else if (this.selectedCategory === this.categories.PLUGINS) {
            this.renderPluginsSettings();
        } else if (this.selectedCategory === this.categories.MAPS) {
            this.renderMapsSettings();
        } else if (this.selectedCategory === this.categories.MISC) {
            this.renderMiscellaneousSettings();
        }
    }

    /**
     * Render Graphics Settings content
     */
    renderGraphicsSettings() {
        this.content.innerHTML = '';

        const title = document.createElement('h3');
        title.className = 'settings-content-title';
        title.textContent = 'Graphics Settings';
        this.content.appendChild(title);

        // Theme setting
        const themeRow = this.createSettingRow(
            'Theme',
            this.createSelect('themeSelect', this.availableThemes.map(t => ({
                value: t,
                label: t.charAt(0).toUpperCase() + t.slice(1)
            })))
        );
        this.content.appendChild(themeRow);

        // Roll Animation
        const rollAnimRow = this.createSettingRow(
            'Roll Animation',
            this.createSelect('rollAnimationSelect', [])
        );
        this.content.appendChild(rollAnimRow);

        // Load current settings
        this.loadSettingsIntoUI();

        // Set up event listeners
        this.setupGraphicsListeners();

        // Populate animation options after render
        this.populateAnimationOptions();
    }

    /**
     * Render Gameplay Settings content
     */
    renderGameplaySettings() {
        this.content.innerHTML = '';

        const title = document.createElement('h3');
        title.className = 'settings-content-title';
        title.textContent = 'Gameplay Settings';
        this.content.appendChild(title);

        // Show Tips
        const tipsRow = this.createSettingRow(
            'Show Gameplay Tips (Not Functional)',
            this.createCheckbox('showTips')
        );
        this.content.appendChild(tipsRow);

        // Auto Roll
        const autoRollRow = this.createSettingRow(
            'Enable Auto Roll (Not Functional)',
            this.createCheckbox('autoRoll')
        );
        this.content.appendChild(autoRollRow);

        // Sound Volume
        const volumeRow = this.createSettingRow(
            'Sound Volume (Not Functional)',
            this.createRange('soundVolume', 0, 1, 0.1)
        );
        this.content.appendChild(volumeRow);

        // Load current settings
        this.loadSettingsIntoUI();

        // Set up event listeners
        this.setupGameplayListeners();
    }

    /**
     * Render Plugins Settings content
     */
    renderPluginsSettings() {
        this.content.innerHTML = '';

        const title = document.createElement('h3');
        title.className = 'settings-content-title';
        title.textContent = 'Plugins';
        this.content.appendChild(title);

        const addPluginBtn = document.createElement('button');
        addPluginBtn.className = 'button button-secondary';
        addPluginBtn.textContent = 'Add Plugin (Coming Soon)';
        addPluginBtn.style.marginBottom = '12px';
        addPluginBtn.style.width = '100%';
        addPluginBtn.disabled = true;
        this.content.appendChild(addPluginBtn);

        const pluginList = document.createElement('div');
        pluginList.id = 'settingsPluginList';
        pluginList.className = 'plugin-list';
        pluginList.style.maxHeight = '400px';
        pluginList.style.overflowY = 'auto';
        pluginList.style.border = '1px solid var(--border-color)';
        pluginList.style.borderRadius = '4px';
        pluginList.style.padding = '8px';
        this.content.appendChild(pluginList);

        // Populate list
        this.refreshPluginList();
    }

    /**
     * Render Maps Settings content
     */
    renderMapsSettings() {
        this.content.innerHTML = '';

        const title = document.createElement('h3');
        title.className = 'settings-content-title';
        title.textContent = 'Maps';
        this.content.appendChild(title);

        const uploadMapBtn = document.createElement('button');
        uploadMapBtn.className = 'button button-secondary';
        uploadMapBtn.textContent = 'Upload Map';
        uploadMapBtn.style.marginBottom = '12px';
        uploadMapBtn.style.width = '100%';
        uploadMapBtn.id = 'uploadMapButton';
        this.content.appendChild(uploadMapBtn);

        const mapFileInput = document.createElement('input');
        mapFileInput.type = 'file';
        mapFileInput.accept = '.json';
        mapFileInput.style.display = 'none';
        mapFileInput.id = 'uploadMapFileInput';
        this.content.appendChild(mapFileInput);

        const mapList = document.createElement('div');
        mapList.id = 'settingsMapList';
        mapList.className = 'plugin-list';
        mapList.style.maxHeight = '400px';
        mapList.style.overflowY = 'auto';
        mapList.style.border = '1px solid var(--border-color)';
        mapList.style.borderRadius = '4px';
        mapList.style.padding = '8px';
        this.content.appendChild(mapList);

        // Populate list
        this.refreshMapList();

        // Set up listeners
        uploadMapBtn.addEventListener('click', () => mapFileInput.click());
        mapFileInput.addEventListener('change', (e) => this.handleMapUpload(e.target.files[0]));
    }

    /**
     * Render Miscellaneous Settings content
     */
    renderMiscellaneousSettings() {
        this.content.innerHTML = '';

        const title = document.createElement('h3');
        title.className = 'settings-content-title';
        title.textContent = 'Miscellaneous';
        this.content.appendChild(title);

        // Streamer Mode
        const streamerModeRow = this.createSettingRow(
            'Streamer Mode (Blur Invite Code)',
            this.createCheckbox('streamerMode')
        );
        this.content.appendChild(streamerModeRow);

        // Load current settings
        this.loadSettingsIntoUI();

        // Set up event listeners
        this.setupMiscellaneousListeners();
    }

    /**
     * Create a settings row
     */
    createSettingRow(label, inputElement) {
        const row = document.createElement('div');
        row.className = 'settings-row';

        const labelEl = document.createElement('label');
        labelEl.className = 'settings-label';
        labelEl.textContent = label + ':';
        row.appendChild(labelEl);

        row.appendChild(inputElement);

        return row;
    }

    /**
     * Create a select element
     */
    createSelect(id, options) {
        const select = document.createElement('select');
        select.className = 'input settings-input';
        select.id = id;

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            select.appendChild(option);
        });

        this.elements.set(id, select);
        return select;
    }

    /**
     * Create a range input
     */
    createRange(id, min, max, step) {
        const range = document.createElement('input');
        range.type = 'range';
        range.className = 'input-range settings-input';
        range.id = id;
        range.min = min;
        range.max = max;
        range.step = step;

        this.elements.set(id, range);
        return range;
    }

    /**
     * Create a checkbox
     */
    createCheckbox(id) {
        const container = document.createElement('div');
        container.className = 'settings-checkbox-container';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'settings-checkbox';
        checkbox.id = id;

        container.appendChild(checkbox);
        this.elements.set(id, checkbox);
        return container;
    }

    /**
     * Set up event listeners for graphics settings
     */
    setupGraphicsListeners() {
        const themeSelect = this.elements.get('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.personalSettings.setTheme(e.target.value);
                this.applyTheme();
            });
        }

        const rollAnimationSelect = this.elements.get('rollAnimationSelect');
        if (rollAnimationSelect) {
            rollAnimationSelect.addEventListener('change', (e) => {
                this.personalSettings.setRollAnimation(e.target.value);
            });
        }
    }

    /**
     * Set up event listeners for gameplay settings
     */
    setupGameplayListeners() {
        const soundVolume = this.elements.get('soundVolume');
        if (soundVolume) {
            soundVolume.addEventListener('input', (e) => {
                this.personalSettings.setSoundVolume(parseFloat(e.target.value));
            });
        }

        const showTips = this.elements.get('showTips');
        if (showTips) {
            showTips.addEventListener('change', (e) => {
                this.personalSettings.setShowTips(e.target.checked);
            });
        }

        const autoRoll = this.elements.get('autoRoll');
        if (autoRoll) {
            autoRoll.addEventListener('change', (e) => {
                this.personalSettings.setAutoRoll(e.target.checked);
            });
        }
    }

    /**
     * Set up event listeners for miscellaneous settings
     */
    setupMiscellaneousListeners() {
        const streamerMode = this.elements.get('streamerMode');
        if (streamerMode) {
            streamerMode.addEventListener('change', (e) => {
                this.personalSettings.setStreamerMode(e.target.checked);
            });
        }
    }

    /**
     * Populate animation options
     */
    populateAnimationOptions() {
        const rollAnimationSelect = this.elements.get('rollAnimationSelect');
        if (!rollAnimationSelect) return;

        rollAnimationSelect.innerHTML = '';

        const animationFactory = this.factoryManager.getFactory('AnimationFactory');
        if (!animationFactory) {
            console.warn('[PersonalSettingsMenu] AnimationFactory not found');
            return;
        }

        const animations = animationFactory.getSelectableAnimations('roll');
        animations.forEach(anim => {
            const option = document.createElement('option');
            option.value = anim.value;
            option.textContent = anim.label;
            rollAnimationSelect.appendChild(option);
        });

        // Set current value
        rollAnimationSelect.value = this.personalSettings.getRollAnimation();
    }

    /**
     * Load settings into UI
     */
    loadSettingsIntoUI() {
        const themeSelect = this.elements.get('themeSelect');
        if (themeSelect) themeSelect.value = this.personalSettings.getTheme();

        const soundVolume = this.elements.get('soundVolume');
        if (soundVolume) soundVolume.value = this.personalSettings.getSoundVolume();

        const showTips = this.elements.get('showTips');
        if (showTips) showTips.checked = this.personalSettings.getShowTips();

        const autoRoll = this.elements.get('autoRoll');
        if (autoRoll) autoRoll.checked = this.personalSettings.getAutoRoll();

        const rollAnimationSelect = this.elements.get('rollAnimationSelect');
        if (rollAnimationSelect) rollAnimationSelect.value = this.personalSettings.getRollAnimation();
    }

    /**
     * Apply theme
     */
    applyTheme() {
        const theme = this.personalSettings.getTheme();
        document.body.className = '';
        document.body.classList.add(`${theme}-theme`);
        console.log("Switched theme to", theme);
    }

    /**
     * Refresh plugin list
     */
    refreshPluginList() {
        const pluginList = document.getElementById('settingsPluginList');
        if (!pluginList) return;

        pluginList.innerHTML = '';
        const plugins = this.pluginManager.getAllPlugins();

        if (plugins.length === 0) {
            pluginList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 12px;">No plugins registered.</p>';
            return;
        }

        plugins.forEach(plugin => {
            const row = this._createPluginRow(plugin);
            pluginList.appendChild(row);
        });
    }

    /**
     * Refresh map list
     */
    refreshMapList() {
        const mapList = document.getElementById('settingsMapList');
        if (!mapList) return;

        mapList.innerHTML = '';
        const maps = MapStorageManager.getAllMaps(); // Get all maps (built-in + custom)

        if (maps.length === 0) {
            mapList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 12px;">No maps available.</p>';
            return;
        }

        // Group by built-in and custom
        const builtInMaps = maps.filter(m => m.isBuiltIn);
        const customMaps = maps.filter(m => !m.isBuiltIn);

        // Built-in maps section
        if (builtInMaps.length > 0) {
            const builtInHeader = document.createElement('div');
            builtInHeader.style.fontWeight = '600';
            builtInHeader.style.fontSize = '0.9em';
            builtInHeader.style.padding = '8px 4px';
            builtInHeader.style.color = 'var(--text-secondary, #666)';
            builtInHeader.textContent = 'Built-in Maps';
            mapList.appendChild(builtInHeader);

            builtInMaps.forEach(mapData => {
                const row = this._createMapRow(mapData);
                mapList.appendChild(row);
            });
        }

        // Custom maps section
        if (customMaps.length > 0) {
            const customHeader = document.createElement('div');
            customHeader.style.fontWeight = '600';
            customHeader.style.fontSize = '0.9em';
            customHeader.style.padding = '8px 4px';
            customHeader.style.marginTop = '12px';
            customHeader.style.color = 'var(--text-secondary, #666)';
            customHeader.textContent = 'Custom Maps';
            mapList.appendChild(customHeader);

            customMaps.forEach(mapData => {
                const row = this._createMapRow(mapData);
                mapList.appendChild(row);
            });
        } else {
            const noCustom = document.createElement('div');
            noCustom.style.padding = '12px';
            noCustom.style.textAlign = 'center';
            noCustom.style.color = 'var(--text-secondary, #999)';
            noCustom.style.fontSize = '0.85em';
            noCustom.textContent = 'No custom maps uploaded yet. Click "Upload Map" to add one.';
            mapList.appendChild(noCustom);
        }
    }

    _createPluginRow(plugin) {
        const row = document.createElement('div');
        row.className = 'plugin-row';
        row.style.padding = '8px';
        row.style.borderBottom = '1px solid var(--border-light, #eee)';

        const nameEl = document.createElement('div');
        nameEl.style.fontWeight = '500';
        nameEl.style.marginBottom = '4px';
        nameEl.textContent = plugin.name;

        if (plugin.isDefault) {
            const badge = document.createElement('span');
            badge.className = 'plugin-badge';
            badge.textContent = 'CORE';
            badge.style.marginLeft = '8px';
            nameEl.appendChild(badge);
        }

        const descEl = document.createElement('div');
        descEl.style.fontSize = '0.85em';
        descEl.style.color = 'var(--text-secondary, #666)';
        descEl.textContent = plugin.description || 'No description';

        row.appendChild(nameEl);
        row.appendChild(descEl);

        return row;
    }

    _createMapRow(mapData) {
        const row = document.createElement('div');
        row.className = 'plugin-row';
        row.style.padding = '8px';
        row.style.borderBottom = '1px solid var(--border-light, #eee)';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.gap = '12px';

        // Thumbnail container
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.style.width = '60px';
        thumbnailContainer.style.height = '60px';
        thumbnailContainer.style.flexShrink = '0';
        thumbnailContainer.style.borderRadius = '4px';
        thumbnailContainer.style.overflow = 'hidden';
        thumbnailContainer.style.backgroundColor = 'var(--background-box, #f5f5f5)';
        thumbnailContainer.style.display = 'flex';
        thumbnailContainer.style.alignItems = 'center';
        thumbnailContainer.style.justifyContent = 'center';
        thumbnailContainer.style.border = '1px solid var(--border-light, #e0e0e0)';

        if (mapData.thumbnail) {
            const img = document.createElement('img');
            img.src = mapData.thumbnail;
            img.alt = mapData.name;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            thumbnailContainer.appendChild(img);
        } else {
            thumbnailContainer.textContent = '🗺️';
            thumbnailContainer.style.fontSize = '28px';
        }

        row.appendChild(thumbnailContainer);

        // Info container
        const infoContainer = document.createElement('div');
        infoContainer.style.flex = '1';

        const nameEl = document.createElement('div');
        nameEl.style.fontWeight = '500';
        nameEl.style.marginBottom = '4px';
        nameEl.textContent = mapData.name || 'Unnamed Map';

        const authorEl = document.createElement('div');
        authorEl.style.fontSize = '0.85em';
        authorEl.style.color = 'var(--text-secondary, #666)';
        authorEl.textContent = `By ${mapData.author || 'Unknown'}`;

        infoContainer.appendChild(nameEl);
        infoContainer.appendChild(authorEl);

        if (mapData.description) {
            const descEl = document.createElement('div');
            descEl.style.fontSize = '0.8em';
            descEl.style.color = 'var(--text-secondary, #999)';
            descEl.style.marginTop = '2px';
            descEl.textContent = mapData.description;
            infoContainer.appendChild(descEl);
        }

        row.appendChild(infoContainer);

        // Add delete button for custom maps
        if (!mapData.isBuiltIn) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'button button-danger button-small';
            deleteBtn.textContent = 'Delete';
            deleteBtn.style.padding = '4px 8px';
            deleteBtn.style.fontSize = '0.85em';
            deleteBtn.addEventListener('click', async () => {
                if (confirm(`Delete map "${mapData.name}"?`)) {
                    const success = MapStorageManager.deleteCustomMap(mapData.id);
                    if (success) {
                        this.refreshMapList();
                    }
                }
            });
            row.appendChild(deleteBtn);
        }

        return row;
    }

    async handleMapUpload(file) {
        if (!file) return;

        try {
            const text = await this._readFile(file);
            const mapData = JSON.parse(text);

            // Use MapStorageManager which validates the map and extracts metadata
            const mapObject = MapStorageManager.addCustomMap(mapData);

            alert(`Map "${mapObject.name}" uploaded successfully!`);
            this.refreshMapList();
        } catch (error) {
            console.error('Failed to upload map:', error);
            alert(`Failed to upload map: ${error.message}`);
        }

        const fileInput = document.getElementById('uploadMapFileInput');
        if (fileInput) fileInput.value = '';
    }

    _readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (event) => reject(new Error('Failed to read file.'));
            reader.readAsText(file);
        });
    }

    /**
     * Show the modal
     */
    show() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            this.renderContent(); // Re-render current content
            if (this.selectedCategory === this.categories.GRAPHICS ||
                this.selectedCategory === this.categories.GAMEPLAY ||
                this.selectedCategory === this.categories.MISC) {
                this.loadSettingsIntoUI();
            }
        }
    }

    /**
     * Hide the modal
     */
    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }

    /**
     * Toggle visibility
     */
    toggle() {
        if (this.modal.style.display === 'flex') {
            this.hide();
        } else {
            this.show();
        }
    }
}
