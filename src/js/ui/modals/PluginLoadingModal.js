import BaseModal from './BaseModal.js';
import ModalUtil from '../../infrastructure/utils/ModalUtil.js';

/**
 * PluginLoadingModal - Modal for loading required plugins
 * 
 * Shows when a map requires plugins that aren't loaded yet.
 * Can auto-load if user setting allows, or prompt for confirmation.
 */
export default class PluginLoadingModal extends BaseModal {
    constructor(id, pluginManager, personalSettings, config = {}) {
        super({
            id: id || 'pluginLoadingModal',
            title: 'Loading Required Plugins'
        });

        this.pluginManager = pluginManager;
        this.personalSettings = personalSettings;
        this.requiredPlugins = [];
        this.onComplete = config.onComplete || null;
        this.onCancel = config.onCancel || null;
        this.isHost = config.isHost || false;
        
        this.loadingPlugins = new Set();
        this.loadedPlugins = [];
        this.failedPlugins = [];
    }

    init() {
        super.init();
    }

    /**
     * Set the required plugins to load
     * @param {Array} plugins - Array of plugin requirement objects
     */
    setRequiredPlugins(plugins) {
        this.requiredPlugins = plugins;
    }

    async onOpen() {
        this.renderContent();
        await this.startLoading();
    }

    renderContent() {
        const contentContainer = this.content;
        if (!contentContainer) return;

        contentContainer.innerHTML = '';
        contentContainer.style.padding = '20px';
        contentContainer.style.display = 'flex';
        contentContainer.style.flexDirection = 'column';
        contentContainer.style.gap = '16px';

        // Reset loading state
        this.loadedPlugins = [];
        this.failedPlugins = [];
        this.loadingPlugins.clear();

        // Message
        const message = document.createElement('p');
        message.textContent = this.isHost
            ? 'This map requires the following plugins. They will be loaded automatically if enabled in your settings.'
            : 'The host has selected a map that requires the following plugins. They will be loaded automatically if enabled in your settings.';
        message.style.color = 'var(--text-color, #fff)';
        message.style.margin = '0';
        contentContainer.appendChild(message);

        // Plugin list
        const pluginList = document.createElement('div');
        pluginList.className = 'plugin-loading-list';
        pluginList.style.display = 'flex';
        pluginList.style.flexDirection = 'column';
        pluginList.style.gap = '8px';
        pluginList.style.maxHeight = '300px';
        pluginList.style.overflowY = 'auto';
        pluginList.style.border = '1px solid var(--border-color, #333)';
        pluginList.style.borderRadius = '8px';
        pluginList.style.padding = '12px';
        pluginList.style.backgroundColor = 'var(--background-box, #151515)';

        // Filter out core/builtin plugins from display
        const pluginsToShow = this.requiredPlugins.filter(plugin => {
            return plugin.id !== 'core' && plugin.source !== 'builtin';
        });

        if (pluginsToShow.length === 0) {
            const noPlugins = document.createElement('div');
            noPlugins.textContent = 'No additional plugins required';
            noPlugins.style.padding = '20px';
            noPlugins.style.textAlign = 'center';
            noPlugins.style.color = 'var(--text-color-secondary, #aaa)';
            pluginList.appendChild(noPlugins);
        } else {
            pluginsToShow.forEach(plugin => {
                const item = this.createPluginItem(plugin);
                pluginList.appendChild(item);
            });
        }

        contentContainer.appendChild(pluginList);

        // Status message
        const statusDiv = document.createElement('div');
        statusDiv.id = 'pluginLoadingStatus';
        statusDiv.style.color = 'var(--text-color-secondary, #aaa)';
        statusDiv.style.fontSize = '0.9em';
        statusDiv.style.minHeight = '20px';
        statusDiv.textContent = 'Preparing to load plugins...';
        contentContainer.appendChild(statusDiv);

        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'pluginLoadingButtons';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.marginTop = '8px';

        const cancelButton = document.createElement('button');
        cancelButton.className = 'button button-secondary';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => this.handleCancel());
        buttonContainer.appendChild(cancelButton);

        // Retry button (initially hidden/disabled)
        const retryButton = document.createElement('button');
        retryButton.id = 'pluginRetryButton';
        retryButton.className = 'button button-primary';
        retryButton.textContent = 'Retry';
        retryButton.disabled = true;
        retryButton.style.opacity = '0.5';
        retryButton.style.cursor = 'not-allowed';
        retryButton.addEventListener('click', () => {
            // Retry failed plugins
            const failed = [...this.failedPlugins];
            this.failedPlugins = [];
            this.loadedPlugins = [];
            this.requiredPlugins = failed;
            this.renderContent();
            this.startLoading();
        });
        buttonContainer.appendChild(retryButton);

        const autoLoad = this.personalSettings?.getAutoLoadPlugins() ?? true;
        if (autoLoad) {
            // Auto-load is enabled, show loading state
            const loadingButton = document.createElement('button');
            loadingButton.className = 'button button-primary';
            loadingButton.id = 'pluginLoadingButton';
            loadingButton.textContent = 'Loading...';
            loadingButton.disabled = true;
            buttonContainer.appendChild(loadingButton);
        } else {
            // Auto-load is disabled, show confirm button
            const confirmButton = document.createElement('button');
            confirmButton.className = 'button button-primary';
            confirmButton.textContent = 'Load Plugins';
            confirmButton.addEventListener('click', () => this.startLoading());
            buttonContainer.appendChild(confirmButton);
        }

        contentContainer.appendChild(buttonContainer);
    }

    createPluginItem(plugin) {
        const item = document.createElement('div');
        item.className = 'plugin-loading-item';
        item.dataset.pluginId = plugin.id;
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '8px';
        item.style.borderRadius = '4px';
        item.style.backgroundColor = 'var(--background-secondary, #202020)';

        const info = document.createElement('div');
        info.style.display = 'flex';
        info.style.flexDirection = 'column';
        info.style.gap = '4px';

        const name = document.createElement('span');
        name.textContent = plugin.name || plugin.id;
        name.style.fontWeight = '600';
        name.style.color = 'var(--text-color, #fff)';

        const desc = document.createElement('span');
        desc.textContent = plugin.description || 'No description';
        desc.style.fontSize = '0.85em';
        desc.style.color = 'var(--text-color-secondary, #aaa)';

        info.appendChild(name);
        info.appendChild(desc);
        item.appendChild(info);

        const status = document.createElement('span');
        status.className = 'plugin-loading-status';
        status.dataset.pluginId = plugin.id;
        status.textContent = 'Pending';
        status.style.fontSize = '0.85em';
        status.style.color = 'var(--text-color-secondary, #888)';
        item.appendChild(status);

        return item;
    }

    updatePluginStatus(pluginId, status, error = null) {
        const statusEl = this.modal.querySelector(`[data-plugin-id="${pluginId}"].plugin-loading-status`);
        if (!statusEl) return;

        statusEl.textContent = status;
        
        if (status === 'Loading') {
            statusEl.style.color = 'var(--color-info, #8aa2ff)';
        } else if (status === 'Loaded') {
            statusEl.style.color = 'var(--color-success, #4caf50)';
        } else if (status === 'Failed') {
            statusEl.style.color = 'var(--color-error, #f44336)';
            if (error) {
                statusEl.title = error;
            }
        } else {
            statusEl.style.color = 'var(--text-color-secondary, #888)';
        }
    }

    updateStatusMessage(message) {
        const statusDiv = this.modal.querySelector('#pluginLoadingStatus');
        if (statusDiv) {
            statusDiv.textContent = message;
        }
    }

    async startLoading() {
        const autoLoad = this.personalSettings?.getAutoLoadPlugins() ?? true;
        
        if (!autoLoad && this.loadedPlugins.length === 0 && this.failedPlugins.length === 0) {
            // User needs to confirm
            return;
        }

        // Disable cancel button
        const cancelButton = this.modal.querySelector('.button-secondary');
        if (cancelButton) cancelButton.disabled = true;

        const loadingButton = this.modal.querySelector('#pluginLoadingButton');
        if (loadingButton) loadingButton.disabled = true;

        this.updateStatusMessage('Loading plugins...');

        // Filter out core/builtin plugins from loading (they're always available)
        const pluginsToLoad = this.requiredPlugins.filter(plugin => {
            return plugin.id !== 'core' && plugin.source !== 'builtin';
        });

        // Load each plugin
        for (const plugin of pluginsToLoad) {
            // Skip if already loaded
            if (this.pluginManager.pluginClasses.has(plugin.id)) {
                this.updatePluginStatus(plugin.id, 'Already Loaded');
                this.loadedPlugins.push(plugin);
                continue;
            }

            // Skip if no CDN source
            if (!plugin.cdn && plugin.source !== 'remote') {
                this.updatePluginStatus(plugin.id, 'No CDN Source', 'Plugin has no CDN URL specified');
                this.failedPlugins.push({ ...plugin, error: 'No CDN source' });
                continue;
            }

            this.updatePluginStatus(plugin.id, 'Loading');
            this.loadingPlugins.add(plugin.id);

            try {
                const result = await this.pluginManager.loadPluginFromUrl({
                    id: plugin.id,
                    name: plugin.name,
                    url: plugin.cdn,
                    description: plugin.description,
                    version: plugin.version
                });

                if (result.success) {
                    this.updatePluginStatus(plugin.id, 'Loaded');
                    this.loadedPlugins.push({ ...plugin, pluginId: result.pluginId });
                } else {
                    this.updatePluginStatus(plugin.id, 'Failed', result.error);
                    this.failedPlugins.push({ ...plugin, error: result.error });
                }
            } catch (error) {
                this.updatePluginStatus(plugin.id, 'Failed', error.message);
                this.failedPlugins.push({ ...plugin, error: error.message });
            } finally {
                this.loadingPlugins.delete(plugin.id);
            }
        }

        // Update final status
        if (this.failedPlugins.length === 0) {
            this.updateStatusMessage('All plugins loaded successfully!');
            setTimeout(() => {
                if (this.onComplete) {
                    this.onComplete({ loaded: this.loadedPlugins, failed: [] });
                }
                this.close();
            }, 1000);
        } else {
            const totalAttempted = pluginsToLoad.length;
            this.updateStatusMessage(`Loaded ${this.loadedPlugins.length} of ${totalAttempted} plugin(s). ${this.failedPlugins.length} failed.`);
            
            // Enable retry button
            const retryButton = this.modal.querySelector('#pluginRetryButton');
            if (retryButton) {
                retryButton.disabled = false;
                retryButton.style.opacity = '1';
                retryButton.style.cursor = 'pointer';
            }
        }
    }

    handleCancel() {
        if (this.onCancel) {
            this.onCancel();
        }
        this.close();
    }
}

