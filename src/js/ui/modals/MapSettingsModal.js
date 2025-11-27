/**
 * MapSettingsModal - Settings modal for individual maps
 * 
 * Uses sidebar navigation like PersonalSettingsModal
 * Allows users to:
 * - Remove the map (for custom maps)
 * 
 * Scalable for future settings like:
 * - Map preferences
 * - Custom rules
 * - Visual settings
 */
import SettingsBaseModal from './SettingsBaseModal.js';
import ModalUtil from '../../infrastructure/utils/ModalUtil.js';
import MapStorageManager from '../../systems/storage/MapStorageManager.js';

const SECTIONS = {
    REMOVE: 'remove'
};

export default class MapSettingsModal extends SettingsBaseModal {
    constructor(id, map, onCloseCallback) {
        super({
            id: id || `mapSettingsModal-${map.id}`,
            title: `Map Settings: ${map.name || map.id}`,
            initialTab: SECTIONS.REMOVE
        });

        this.map = map;
        this.onCloseCallback = onCloseCallback || null;
        this.selectedTab = SECTIONS.REMOVE;
    }

    init() {
        super.init();
        this.renderTabs(this.getTabs());
        this.renderContent();
    }

    onOpen() {
        this.renderTabs(this.getTabs());
        this.renderContent();
    }

    getTabs() {
        const tabs = [];
        
        // Check if this is a custom map (can be removed)
        const allBuiltInMaps = MapStorageManager.getBuiltInMaps();
        const isBuiltIn = allBuiltInMaps.some(m => m.id === this.map.id);
        const isCustomMap = !isBuiltIn && this.map.source !== 'builtin';

        if (isCustomMap) {
            tabs.push({ id: SECTIONS.REMOVE, label: 'Remove' });
        }

        return tabs;
    }

    renderContent() {
        const contentContainer = this.modal.querySelector(`#${this.id}Content`);
        if (!contentContainer) return;

        contentContainer.innerHTML = '';
        contentContainer.style.padding = '20px';
        contentContainer.style.display = 'flex';
        contentContainer.style.flexDirection = 'column';
        contentContainer.style.gap = '20px';

        switch (this.selectedTab) {
            case SECTIONS.REMOVE:
                this.renderRemoveSection(contentContainer);
                break;
            default:
                // If no tabs available (built-in map), show message
                this.renderNoActionsSection(contentContainer);
                break;
        }
    }

    renderRemoveSection(container) {
        const section = document.createElement('div');
        section.style.display = 'flex';
        section.style.flexDirection = 'column';
        section.style.gap = '16px';

        const title = document.createElement('h3');
        title.textContent = 'Remove Map';
        title.style.margin = '0 0 12px 0';
        title.style.color = 'var(--text-color, #fff)';
        title.style.fontSize = '1.2em';

        const description = document.createElement('p');
        description.textContent = 'Remove this custom map from your saved maps. This action cannot be undone. The map can be uploaded again later if needed.';
        description.style.color = 'var(--text-color-secondary, #aaa)';
        description.style.fontSize = '0.9em';
        description.style.lineHeight = '1.5';
        description.style.margin = '0 0 16px 0';

        const warningBox = document.createElement('div');
        warningBox.style.padding = '12px';
        warningBox.style.backgroundColor = 'var(--color-danger-bg, rgba(244, 67, 54, 0.1))';
        warningBox.style.borderRadius = '6px';
        warningBox.style.border = '1px solid var(--color-danger, #f44336)';

        const warningText = document.createElement('div');
        warningText.textContent = 'Warning: This action cannot be undone. The map will need to be uploaded again manually.';
        warningText.style.color = 'var(--color-danger, #f44336)';
        warningText.style.fontSize = '0.85em';
        warningText.style.lineHeight = '1.4';

        warningBox.appendChild(warningText);

        const removeButton = document.createElement('button');
        removeButton.className = 'button button-danger';
        removeButton.textContent = 'Remove Map';
        removeButton.style.width = '100%';
        removeButton.style.marginTop = '8px';
        removeButton.addEventListener('click', () => this.handleRemove());

        section.appendChild(title);
        section.appendChild(description);
        section.appendChild(warningBox);
        section.appendChild(removeButton);
        container.appendChild(section);
    }

    renderNoActionsSection(container) {
        const section = document.createElement('div');
        section.style.display = 'flex';
        section.style.flexDirection = 'column';
        section.style.gap = '16px';

        const title = document.createElement('h3');
        title.textContent = 'No Actions Available';
        title.style.margin = '0 0 12px 0';
        title.style.color = 'var(--text-color, #fff)';
        title.style.fontSize = '1.2em';

        const description = document.createElement('p');
        description.textContent = 'This is a built-in map and cannot be removed.';
        description.style.color = 'var(--text-color-secondary, #aaa)';
        description.style.fontSize = '0.9em';
        description.style.lineHeight = '1.5';
        description.style.margin = '0';

        section.appendChild(title);
        section.appendChild(description);
        container.appendChild(section);
    }

    switchTab(tabId) {
        this.selectedTab = tabId;
        super.switchTab(tabId);
    }

    async handleRemove() {
        const allBuiltInMaps = MapStorageManager.getBuiltInMaps();
        const isBuiltIn = allBuiltInMaps.some(m => m.id === this.map.id);
        
        if (isBuiltIn || this.map.source === 'builtin') {
            await ModalUtil.alert('Only custom maps can be removed.', 'Cannot Remove');
            return;
        }

        const confirmed = await ModalUtil.confirm(
            `Are you sure you want to remove map "${this.map.name || this.map.id}"? This action cannot be undone.`,
            'Remove Map'
        );

        if (confirmed) {
            try {
                const deleted = MapStorageManager.deleteCustomMap(this.map.id);
                if (deleted) {
                    await ModalUtil.alert(
                        `Map "${this.map.name || this.map.id}" has been removed successfully.`,
                        'Map Removed'
                    );
                    this.close();
                    if (this.onCloseCallback) {
                        this.onCloseCallback();
                    }
                } else {
                    await ModalUtil.alert(
                        'Map not found or could not be removed.',
                        'Remove Failed'
                    );
                }
            } catch (error) {
                await ModalUtil.alert(
                    `Failed to remove map: ${error.message || String(error)}`,
                    'Remove Failed'
                );
            }
        }
    }
}
