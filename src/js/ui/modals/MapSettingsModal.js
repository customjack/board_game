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
    EXPORT: 'export',
    REMOVE: 'remove'
};

export default class MapSettingsModal extends SettingsBaseModal {
    constructor(id, map, onCloseCallback, eventHandler = null) {
        super({
            id: id || `mapSettingsModal-${map.id}`,
            title: `Map Settings: ${map.name || map.id}`,
            initialTab: SECTIONS.EXPORT
        });

        this.map = map;
        this.onCloseCallback = onCloseCallback || null;
        this.eventHandler = eventHandler; // HostEventHandler or ClientEventHandler
        this.selectedTab = SECTIONS.EXPORT;
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
        
        // Export tab for all maps
        tabs.push({ id: SECTIONS.EXPORT, label: 'Export' });
        
        // Check if this map can be removed
        // - Custom maps (uploaded by user)
        // - Plugin-provided maps (bundled with plugins)
        const allBuiltInMaps = MapStorageManager.getBuiltInMaps();
        const isBuiltIn = allBuiltInMaps.some(m => m.id === this.map.id);
        const isCustomMap = !isBuiltIn && this.map.source !== 'builtin';
        const isPluginMap = this.map.pluginId != null; // Plugin-provided maps can be removed

        if (isCustomMap || isPluginMap) {
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
            case SECTIONS.EXPORT:
                this.renderExportSection(contentContainer);
                break;
            case SECTIONS.REMOVE:
                this.renderRemoveSection(contentContainer);
                break;
            default:
                this.renderExportSection(contentContainer);
                break;
        }
    }

    renderExportSection(container) {
        const section = document.createElement('div');
        section.style.display = 'flex';
        section.style.flexDirection = 'column';
        section.style.gap = '16px';

        const title = document.createElement('h3');
        title.textContent = 'Export Map';
        title.style.margin = '0 0 12px 0';
        title.style.color = 'var(--text-color, #fff)';
        title.style.fontSize = '1.2em';

        const description = document.createElement('p');
        description.textContent = 'Download this map as a JSON file. You can share this file with others or use it as a backup.';
        description.style.color = 'var(--text-color-secondary, #aaa)';
        description.style.fontSize = '0.9em';
        description.style.lineHeight = '1.5';
        description.style.margin = '0 0 16px 0';

        const exportButton = document.createElement('button');
        exportButton.className = 'button button-primary';
        exportButton.textContent = 'Export Map';
        exportButton.style.width = '100%';
        exportButton.addEventListener('click', () => this.handleExport());

        section.appendChild(title);
        section.appendChild(description);
        section.appendChild(exportButton);
        container.appendChild(section);
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

    async handleExport() {
        try {
            await MapStorageManager.exportMap(this.map.id);
            await ModalUtil.alert(
                `Map "${this.map.name || this.map.id}" has been exported successfully.`,
                'Map Exported'
            );
        } catch (error) {
            console.error('Error exporting map:', error);
            await ModalUtil.alert(
                `Failed to export map: ${error.message || String(error)}`,
                'Export Failed'
            );
        }
    }

    async handleRemove() {
        const allBuiltInMaps = MapStorageManager.getBuiltInMaps();
        const isBuiltIn = allBuiltInMaps.some(m => m.id === this.map.id);
        const isPluginMap = this.map.pluginId != null;
        
        // Only built-in maps (without pluginId) cannot be removed
        if (isBuiltIn && !isPluginMap && this.map.source === 'builtin') {
            await ModalUtil.alert('Only custom and plugin-provided maps can be removed.', 'Cannot Remove');
            return;
        }

        const mapType = isPluginMap ? 'plugin-provided' : 'custom';
        const confirmed = await ModalUtil.confirm(
            `Are you sure you want to remove ${mapType} map "${this.map.name || this.map.id}"? This action cannot be undone.${isPluginMap ? ' The plugin will remain installed.' : ''}`,
            'Remove Map'
        );

        if (confirmed) {
            try {
                // Check if this map is currently selected
                const currentSelectedMapId = MapStorageManager.getSelectedMapId();
                const isCurrentlySelected = currentSelectedMapId === this.map.id;
                
                let deleted = false;
                
                // Handle plugin-provided maps differently from custom maps
                if (isPluginMap) {
                    // Unregister plugin map
                    deleted = MapStorageManager.unregisterPluginMap(this.map.id);
                } else {
                    // Delete custom map
                    deleted = MapStorageManager.deleteCustomMap(this.map.id);
                }
                
                if (deleted) {
                    // If the removed map was selected, switch to default
                    if (isCurrentlySelected) {
                        MapStorageManager.setSelectedMapId('default');
                        
                        // If we're in a game (host), load the default map and broadcast
                        if (this.eventHandler && this.eventHandler.isHost && this.eventHandler.loadMapById) {
                            try {
                                await this.eventHandler.loadMapById('default');
                            } catch (error) {
                                console.error('Error loading default map after removal:', error);
                            }
                        }
                    }
                    
                    await ModalUtil.alert(
                        `Map "${this.map.name || this.map.id}" has been removed successfully.${isCurrentlySelected ? ' The default map has been selected.' : ''}`,
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
