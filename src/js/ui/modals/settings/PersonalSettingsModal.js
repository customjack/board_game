import SettingsBaseModal from './SettingsBaseModal.js';
import MapStorageManager from '../../../systems/storage/MapStorageManager.js';

const CATEGORIES = {
    GRAPHICS: 'graphics',
    GAMEPLAY: 'gameplay',
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

        // Callbacks for external managers
        this.openPluginManager = null;
        this.openMapManager = null;
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
            { id: CATEGORIES.MISC, label: 'Misc' }
        ];
    }

    createApplyButton() {
        const headerButtons = this.modal.querySelector('.settings-modal-header-buttons');
        if (!headerButtons) return;

        // Helper to create button if not exists
        const createOrGetButton = (id, text, className, onClick) => {
            let btn = headerButtons.querySelector(`#${id}`);
            if (!btn) {
                btn = document.createElement('button');
                btn.id = id;
                btn.className = className;
                btn.textContent = text;
                btn.addEventListener('click', onClick);
            }
            return btn;
        };

        // 1. Apply Button
        const applyButton = createOrGetButton(
            'personalSettingsApplyButton',
            'Apply',
            'button settings-modal-apply',
            () => this.applySettings()
        );

        // 2. Plugins Button
        let pluginsBtn = null;
        if (this.openPluginManager) {
            pluginsBtn = createOrGetButton(
                'personalSettingsPluginsButton',
                'Plugins',
                'button button-secondary settings-modal-action',
                () => {
                    this.close();
                    this.openPluginManager();
                }
            );
        }

        // 3. Maps Button
        let mapsBtn = null;
        if (this.openMapManager) {
            mapsBtn = createOrGetButton(
                'personalSettingsMapsButton',
                'Maps',
                'button button-secondary settings-modal-action',
                () => {
                    this.close();
                    this.openMapManager();
                }
            );
        }

        // Clear existing buttons to re-order them correctly
        // We want: [Maps] [Plugins] [Apply] [Close]
        // Note: Close button is usually already there or added by BaseModal. 
        // BaseModal adds close button to header-buttons.

        const closeButton = headerButtons.querySelector('.settings-modal-close');

        // Remove our managed buttons if they are already attached to re-append in order
        if (mapsBtn) mapsBtn.remove();
        if (pluginsBtn) pluginsBtn.remove();
        applyButton.remove();

        // Append in order
        if (mapsBtn) headerButtons.insertBefore(mapsBtn, closeButton);
        if (pluginsBtn) headerButtons.insertBefore(pluginsBtn, closeButton);
        headerButtons.insertBefore(applyButton, closeButton);

        this.applyButton = applyButton;
    }

    setOpenPluginManager(callback) {
        this.openPluginManager = callback;
        // Re-render buttons if modal is already initialized
        if (this.modal) {
            this.createApplyButton();
        }
    }

    setOpenMapManager(callback) {
        this.openMapManager = callback;
        // Re-render buttons if modal is already initialized
        if (this.modal) {
            this.createApplyButton();
        }
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



    renderMiscSettings(container) {
        const title = this.createTitle('Miscellaneous');
        container.appendChild(title);

        container.appendChild(this.createCheckboxRow('Streamer Mode (Blur Invite Code)', 'streamerMode'));
        container.appendChild(this.createCheckboxRow('Auto-load Plugins', 'autoLoadPlugins'));
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

        const autoLoadPlugins = this.inputs.get('autoLoadPlugins');
        if (autoLoadPlugins) autoLoadPlugins.checked = this.personalSettings.getAutoLoadPlugins();
    }

    applySettings() {
        if (!this.personalSettings) return;

        const theme = this.inputs.get('theme')?.value;
        const rollAnimation = this.inputs.get('rollAnimation')?.value;
        const showTips = this.inputs.get('showTips')?.checked;
        const autoRoll = this.inputs.get('autoRoll')?.checked;
        const soundVolume = parseFloat(this.inputs.get('soundVolume')?.value);
        const streamerMode = this.inputs.get('streamerMode')?.checked ?? false;
        const autoLoadPlugins = this.inputs.get('autoLoadPlugins')?.checked ?? true;

        if (theme) {
            this.personalSettings.setTheme(theme);
        }
        if (rollAnimation) this.personalSettings.setRollAnimation(rollAnimation);
        if (showTips !== undefined) this.personalSettings.setShowTips(showTips);
        if (autoRoll !== undefined) this.personalSettings.setAutoRoll(autoRoll);
        if (!Number.isNaN(soundVolume)) this.personalSettings.setSoundVolume(soundVolume);
        this.personalSettings.setStreamerMode(Boolean(streamerMode));
        this.personalSettings.setAutoLoadPlugins(Boolean(autoLoadPlugins));

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


}
