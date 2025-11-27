/**
 * PluginSettingsModal - Settings modal for individual plugins
 * 
 * Uses sidebar navigation like PersonalSettingsModal
 * Allows users to:
 * - Refresh the plugin from CDN
 * - Remove the plugin
 */
import SettingsBaseModal from './SettingsBaseModal.js';
import ModalUtil from '../../infrastructure/utils/ModalUtil.js';

const SECTIONS = {
    REFRESH: 'refresh',
    REMOVE: 'remove'
};

export default class PluginSettingsModal extends SettingsBaseModal {
    constructor(id, plugin, pluginManager, onCloseCallback) {
        super({
            id: id || `pluginSettingsModal-${plugin.id}`,
            title: `Plugin Settings: ${plugin.name}`,
            initialTab: SECTIONS.REFRESH
        });

        this.plugin = plugin;
        this.pluginManager = pluginManager;
        this.onCloseCallback = onCloseCallback || null;
        this.selectedTab = SECTIONS.REFRESH;
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
        
        // Only show refresh if plugin has CDN
        if (this.plugin.cdn || (this.plugin.url && !this.plugin.isDefault)) {
            tabs.push({ id: SECTIONS.REFRESH, label: 'Refresh' });
        }
        
        // Only show remove if not default/core
        if (!this.plugin.isDefault && this.plugin.id !== 'core') {
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
            case SECTIONS.REFRESH:
                this.renderRefreshSection(contentContainer);
                break;
            case SECTIONS.REMOVE:
                this.renderRemoveSection(contentContainer);
                break;
            default:
                break;
        }
    }

    renderRefreshSection(container) {
        const section = document.createElement('div');
        section.style.display = 'flex';
        section.style.flexDirection = 'column';
        section.style.gap = '16px';

        const title = document.createElement('h3');
        title.textContent = 'Refresh Plugin';
        title.style.margin = '0 0 12px 0';
        title.style.color = 'var(--text-color, #fff)';
        title.style.fontSize = '1.2em';

        const description = document.createElement('p');
        description.textContent = 'Refresh this plugin from its CDN source. This will clear the cached version and download the latest version.';
        description.style.color = 'var(--text-color-secondary, #aaa)';
        description.style.fontSize = '0.9em';
        description.style.lineHeight = '1.5';
        description.style.margin = '0 0 16px 0';

        const infoBox = document.createElement('div');
        infoBox.style.padding = '12px';
        infoBox.style.backgroundColor = 'var(--background-secondary, #141414)';
        infoBox.style.borderRadius = '6px';
        infoBox.style.border = '1px solid var(--border-color, #242424)';

        const infoLabel = document.createElement('div');
        infoLabel.textContent = 'CDN URL:';
        infoLabel.style.color = 'var(--text-color-secondary, #aaa)';
        infoLabel.style.fontSize = '0.85em';
        infoLabel.style.marginBottom = '4px';

        const infoValue = document.createElement('div');
        infoValue.textContent = this.plugin.cdn || this.plugin.url || 'Unknown';
        infoValue.style.color = 'var(--text-color, #fff)';
        infoValue.style.fontFamily = 'monospace';
        infoValue.style.fontSize = '0.85em';
        infoValue.style.wordBreak = 'break-all';

        infoBox.appendChild(infoLabel);
        infoBox.appendChild(infoValue);

        const refreshButton = document.createElement('button');
        refreshButton.className = 'button button-primary';
        refreshButton.textContent = 'Refresh from CDN';
        refreshButton.style.width = '100%';
        refreshButton.style.marginTop = '8px';
        refreshButton.addEventListener('click', () => this.handleRefresh());

        section.appendChild(title);
        section.appendChild(description);
        section.appendChild(infoBox);
        section.appendChild(refreshButton);
        container.appendChild(section);
    }

    renderRemoveSection(container) {
        const section = document.createElement('div');
        section.style.display = 'flex';
        section.style.flexDirection = 'column';
        section.style.gap = '16px';

        const title = document.createElement('h3');
        title.textContent = 'Remove Plugin';
        title.style.margin = '0 0 12px 0';
        title.style.color = 'var(--text-color, #fff)';
        title.style.fontSize = '1.2em';

        const description = document.createElement('p');
        description.textContent = 'Remove this plugin from your saved plugins. This will also clear the cached version. The plugin can be added again later if needed.';
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
        warningText.textContent = 'Warning: This action cannot be undone. The plugin will need to be added again manually.';
        warningText.style.color = 'var(--color-danger, #f44336)';
        warningText.style.fontSize = '0.85em';
        warningText.style.lineHeight = '1.4';

        warningBox.appendChild(warningText);

        const removeButton = document.createElement('button');
        removeButton.className = 'button button-danger';
        removeButton.textContent = 'Remove Plugin';
        removeButton.style.width = '100%';
        removeButton.style.marginTop = '8px';
        removeButton.addEventListener('click', () => this.handleRemove());

        section.appendChild(title);
        section.appendChild(description);
        section.appendChild(warningBox);
        section.appendChild(removeButton);
        container.appendChild(section);
    }

    switchTab(tabId) {
        this.selectedTab = tabId;
        super.switchTab(tabId);
    }

    async handleRefresh() {
        const confirmed = await ModalUtil.confirm(
            `Refresh plugin "${this.plugin.name}" from CDN? This will clear the cached version and download the latest.`,
            'Refresh Plugin'
        );

        if (!confirmed) return;

        try {
            const result = await this.pluginManager.refreshPluginFromCDN(this.plugin.id);
            if (result.success) {
                await ModalUtil.alert(
                    `Plugin "${this.plugin.name}" has been refreshed successfully.`,
                    'Refresh Successful'
                );
                this.close();
                if (this.onCloseCallback) {
                    this.onCloseCallback();
                }
            } else {
                await ModalUtil.alert(
                    `Failed to refresh plugin: ${result.error || 'Unknown error'}`,
                    'Refresh Failed'
                );
            }
        } catch (error) {
            await ModalUtil.alert(
                `Error refreshing plugin: ${error.message || String(error)}`,
                'Refresh Error'
            );
        }
    }

    async handleRemove() {
        // Cannot remove default/core plugins
        if (this.plugin.isDefault || this.plugin.id === 'core') {
            await ModalUtil.alert('Cannot remove core/default plugins.', 'Cannot Remove');
            return;
        }

        const confirmed = await ModalUtil.confirm(
            `Are you sure you want to remove plugin "${this.plugin.name}"? This will also remove it from your saved plugins.`,
            'Remove Plugin'
        );

        if (confirmed) {
            if (this.pluginManager.unregisterPlugin(this.plugin.id)) {
                // Also remove from remote plugin cache
                this.pluginManager.removeSavedRemotePlugin(this.plugin.id);
                this.close();
                if (this.onCloseCallback) {
                    this.onCloseCallback();
                }
            } else {
                await ModalUtil.alert(
                    'Failed to remove plugin. It may be in use by the current map.',
                    'Remove Failed'
                );
            }
        }
    }
}
