import SettingsBaseModal from './SettingsBaseModal.js';
import MapStorageManager from '../../systems/storage/MapStorageManager.js';

const CATEGORIES = {
    GRAPHICS: 'graphics',
    GAMEPLAY: 'gameplay',
    PLUGINS: 'plugins',
    MAPS: 'maps',
    MISC: 'misc'
};

export default class PersonalSettingsModal extends SettingsBaseModal {
    constructor(config = {}) {
        super({
            id: config.id || 'settingsModal',
            title: 'Personal Settings',
            initialTab: CATEGORIES.GRAPHICS
        });

        this.personalSettings = config.personalSettings;
        this.factoryManager = config.factoryManager;
        this.pluginManager = config.pluginManager;
        this.localStorageManager = config.localStorageManager;

        this.selectedTab = CATEGORIES.GRAPHICS;
        this.inputs = new Map();
        this.applyButton = null;
    }

    init() {
        super.init();
        this.createApplyButton();
        this.renderTabs(this.getTabs());
        this.renderContent();
    }

    onOpen() {
        this.renderTabs(this.getTabs());
        this.renderContent();
    }

    getTabs() {
        return [
            { id: CATEGORIES.GRAPHICS, label: 'Graphics' },
            { id: CATEGORIES.GAMEPLAY, label: 'Gameplay' },
            { id: CATEGORIES.PLUGINS, label: 'Plugins' },
            { id: CATEGORIES.MAPS, label: 'Maps' },
            { id: CATEGORIES.MISC, label: 'Misc' }
        ];
    }

    createApplyButton() {
        const headerButtons = this.modal.querySelector('.settings-modal-header-buttons');
        if (!headerButtons || headerButtons.querySelector('#personalSettingsApplyButton')) return;

        const applyButton = document.createElement('button');
        applyButton.className = 'button settings-modal-apply';
        applyButton.textContent = 'Apply';
        applyButton.id = 'personalSettingsApplyButton';
        applyButton.addEventListener('click', () => this.applySettings());

        const closeButton = headerButtons.querySelector('.settings-modal-close');
        if (closeButton) {
            headerButtons.insertBefore(applyButton, closeButton);
        } else {
            headerButtons.appendChild(applyButton);
        }

        this.applyButton = applyButton;
    }

    renderContent() {
        const content = this.modal.querySelector(`#${this.id}Content`) || this.content;
        if (!content) return;

        content.innerHTML = '';
        this.inputs.clear();

        switch (this.selectedTab) {
            case CATEGORIES.GRAPHICS:
                this.renderGraphicsSettings(content);
                break;
            case CATEGORIES.GAMEPLAY:
                this.renderGameplaySettings(content);
                break;
            case CATEGORIES.PLUGINS:
                this.renderPluginsSettings(content);
                break;
            case CATEGORIES.MAPS:
                this.renderMapsSettings(content);
                break;
            case CATEGORIES.MISC:
                this.renderMiscSettings(content);
                break;
            default:
                break;
        }

        this.updateTabDisplay();
        this.loadSettingsIntoUI();
    }

    renderGraphicsSettings(container) {
        const title = this.createTitle('Graphics Settings');
        container.appendChild(title);

        container.appendChild(this.createSelectRow(
            'Theme',
            'theme',
            [
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'retro', label: 'Retro' }
            ]
        ));

        container.appendChild(this.createSelectRow(
            'Roll Animation',
            'rollAnimation',
            this.getRollAnimations()
        ));
    }

    renderGameplaySettings(container) {
        const title = this.createTitle('Gameplay Settings');
        container.appendChild(title);

        container.appendChild(this.createCheckboxRow('Show Gameplay Tips (Not Functional)', 'showTips'));
        container.appendChild(this.createCheckboxRow('Enable Auto Roll (Not Functional)', 'autoRoll'));
        container.appendChild(this.createRangeRow('Sound Volume (Not Functional)', 'soundVolume', 0, 1, 0.1));
    }

    renderPluginsSettings(container) {
        const title = this.createTitle('Plugins');
        container.appendChild(title);

        const list = document.createElement('div');
        list.className = 'plugin-list';
        list.style.maxHeight = '400px';
        list.style.overflowY = 'auto';
        list.style.border = '1px solid var(--border-color)';
        list.style.borderRadius = '4px';
        list.style.padding = '8px';

        const plugins = this.pluginManager?.getAllPlugins?.() || [];
        if (plugins.length === 0) {
            list.textContent = 'No plugins loaded yet.';
        } else {
            plugins.forEach(plugin => {
                const row = document.createElement('div');
                row.className = 'plugin-row';
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                row.style.padding = '6px 0';
                row.style.borderBottom = '1px solid var(--border-color)';

                const info = document.createElement('div');
                info.style.display = 'flex';
                info.style.flexDirection = 'column';
                info.innerHTML = `<strong>${plugin.name}</strong><span style="font-size: 0.85em; color: var(--text-secondary, #666);">${plugin.description || ''}</span>`;

                row.appendChild(info);

                const tag = document.createElement('span');
                tag.style.fontSize = '0.8em';
                tag.textContent = plugin.enabled ? 'Enabled' : 'Disabled';
                row.appendChild(tag);

                list.appendChild(row);
            });
        }

        container.appendChild(list);
    }

    renderMapsSettings(container) {
        const title = this.createTitle('Maps');
        container.appendChild(title);

        const uploadBtn = document.createElement('button');
        uploadBtn.className = 'button button-secondary';
        uploadBtn.textContent = 'Upload Map';
        uploadBtn.style.marginBottom = '12px';
        uploadBtn.style.width = '100%';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';

        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleMapUpload(e.target.files[0]));

        container.appendChild(uploadBtn);
        container.appendChild(fileInput);

        const list = document.createElement('div');
        list.className = 'plugin-list';
        list.style.maxHeight = '400px';
        list.style.overflowY = 'auto';
        list.style.border = '1px solid var(--border-color)';
        list.style.borderRadius = '4px';
        list.style.padding = '8px';

        this.populateMapList(list);
        container.appendChild(list);
    }

    renderMiscSettings(container) {
        const title = this.createTitle('Miscellaneous');
        container.appendChild(title);

        container.appendChild(this.createCheckboxRow('Streamer Mode (Blur Invite Code)', 'streamerMode'));
    }

    createTitle(text) {
        const el = document.createElement('h3');
        el.className = 'settings-content-title';
        el.textContent = text;
        return el;
    }

    createSettingRow(label, inputElement) {
        const row = document.createElement('div');
        row.className = 'settings-row';

        const labelEl = document.createElement('label');
        labelEl.className = 'settings-label';
        labelEl.textContent = `${label}:`;
        row.appendChild(labelEl);
        row.appendChild(inputElement);
        return row;
    }

    createSelectRow(label, key, options) {
        const select = document.createElement('select');
        select.className = 'input settings-input';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            select.appendChild(option);
        });
        this.inputs.set(key, select);
        return this.createSettingRow(label, select);
    }

    createCheckboxRow(label, key, checked = false) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'settings-checkbox';
        checkbox.checked = checked;
        this.inputs.set(key, checkbox);
        return this.createSettingRow(label, checkbox);
    }

    createRangeRow(label, key, min, max, step) {
        const range = document.createElement('input');
        range.type = 'range';
        range.min = min;
        range.max = max;
        range.step = step;
        range.className = 'settings-input';
        this.inputs.set(key, range);
        return this.createSettingRow(label, range);
    }

    loadSettingsIntoUI() {
        if (!this.personalSettings) return;
        const theme = this.inputs.get('theme');
        if (theme) theme.value = this.personalSettings.getTheme();

        const rollAnimation = this.inputs.get('rollAnimation');
        if (rollAnimation) rollAnimation.value = this.personalSettings.getRollAnimation();

        const showTips = this.inputs.get('showTips');
        if (showTips) showTips.checked = this.personalSettings.getShowTips();

        const autoRoll = this.inputs.get('autoRoll');
        if (autoRoll) autoRoll.checked = this.personalSettings.getAutoRoll();

        const soundVolume = this.inputs.get('soundVolume');
        if (soundVolume) soundVolume.value = this.personalSettings.getSoundVolume();

        const streamerMode = this.inputs.get('streamerMode');
        if (streamerMode) streamerMode.checked = this.personalSettings.getStreamerMode();
    }

    applySettings() {
        if (!this.personalSettings) return;

        const theme = this.inputs.get('theme')?.value;
        const rollAnimation = this.inputs.get('rollAnimation')?.value;
        const showTips = this.inputs.get('showTips')?.checked;
        const autoRoll = this.inputs.get('autoRoll')?.checked;
        const soundVolume = parseFloat(this.inputs.get('soundVolume')?.value);
        const streamerMode = this.inputs.get('streamerMode')?.checked ?? false;

        if (theme) this.personalSettings.setTheme(theme);
        if (rollAnimation) this.personalSettings.setRollAnimation(rollAnimation);
        if (showTips !== undefined) this.personalSettings.setShowTips(showTips);
        if (autoRoll !== undefined) this.personalSettings.setAutoRoll(autoRoll);
        if (!Number.isNaN(soundVolume)) this.personalSettings.setSoundVolume(soundVolume);
        this.personalSettings.setStreamerMode(Boolean(streamerMode));

        // Close after applying, matching close button behavior
        this.close();
    }

    getRollAnimations() {
        const animationFactory = this.factoryManager?.getFactory?.('AnimationFactory');
        if (!animationFactory) {
            return [{ value: 'dice-roll', label: 'Dice Roll' }];
        }
        return animationFactory.getSelectableAnimations('roll')?.map(anim => ({
            value: anim.value,
            label: anim.label
        })) || [{ value: 'dice-roll', label: 'Dice Roll' }];
    }

    populateMapList(container) {
        container.innerHTML = '';
        const maps = MapStorageManager.getAllMaps();
        if (!maps || maps.length === 0) {
            container.textContent = 'No maps found.';
            return;
        }

        maps.forEach(map => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '6px 0';
            row.style.borderBottom = '1px solid var(--border-color)';

            const info = document.createElement('div');
            info.style.display = 'flex';
            info.style.flexDirection = 'column';
            info.innerHTML = `<strong>${map.name}</strong><span style="font-size: 0.85em; color: var(--text-secondary, #666);">By ${map.author || 'Unknown'}</span>`;
            if (map.description) {
                const desc = document.createElement('div');
                desc.style.fontSize = '0.8em';
                desc.style.color = 'var(--text-secondary, #999)';
                desc.textContent = map.description;
                info.appendChild(desc);
            }
            row.appendChild(info);

            if (!map.isBuiltIn) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'button button-danger button-small';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', () => {
                    if (confirm(`Delete map "${map.name}"?`)) {
                        if (MapStorageManager.deleteCustomMap(map.id)) {
                            this.populateMapList(container);
                        }
                    }
                });
                row.appendChild(deleteBtn);
            }

            container.appendChild(row);
        });
    }

    async handleMapUpload(file) {
        if (!file) return;
        try {
            const text = await file.text();
            const mapData = JSON.parse(text);
            const mapObject = MapStorageManager.addCustomMap(mapData);
            alert(`Map "${mapObject.name}" uploaded successfully!`);
            const list = this.modal.querySelector('.settings-modal-content .plugin-list');
            if (list) {
                this.populateMapList(list);
            }
        } catch (error) {
            console.error('Failed to upload map:', error);
            alert(`Failed to upload map: ${error.message}`);
        }
    }
}
