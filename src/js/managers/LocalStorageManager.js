/**
 * LocalStorageManager - Manages local storage for plugins
 *
 * Stores:
 * - Custom plugins (with their source code)
 * - Plugin metadata cache
 *
 * NOTE: Map storage is now handled by MapStorageManager
 */
export default class LocalStorageManager {
    constructor() {
        this.STORAGE_KEYS = {
            PLUGINS: 'custom_plugins',
            PLUGIN_METADATA: 'plugin_metadata_cache'
        };
    }

    // ============= Plugin Management =============

    /**
     * Save a custom plugin to local storage
     * @param {string} pluginId - Unique plugin ID
     * @param {Object} pluginData - Plugin data including source code and metadata
     * @returns {boolean} Success status
     */
    savePlugin(pluginId, pluginData) {
        try {
            const plugins = this.getAllPlugins();

            // Check for duplicate ID
            if (plugins[pluginId]) {
                console.error(`Plugin with ID "${pluginId}" already exists`);
                return false;
            }

            plugins[pluginId] = {
                id: pluginId,
                source: pluginData.source,
                metadata: pluginData.metadata,
                savedAt: new Date().toISOString()
            };

            localStorage.setItem(this.STORAGE_KEYS.PLUGINS, JSON.stringify(plugins));

            console.log(`[LocalStorage] Saved plugin: ${pluginId}`);
            return true;
        } catch (error) {
            console.error('Failed to save plugin:', error);
            return false;
        }
    }

    /**
     * Get a specific plugin from local storage
     * @param {string} pluginId - Plugin ID
     * @returns {Object|null} Plugin data or null
     */
    getPlugin(pluginId) {
        const plugins = this.getAllPlugins();
        return plugins[pluginId] || null;
    }

    /**
     * Get all custom plugins from local storage
     * @returns {Object} Map of plugin ID -> plugin data
     */
    getAllPlugins() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.PLUGINS);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Failed to load plugins:', error);
            return {};
        }
    }

    /**
     * Remove a plugin from local storage
     * @param {string} pluginId - Plugin ID to remove
     * @returns {boolean} Success status
     */
    removePlugin(pluginId) {
        try {
            const plugins = this.getAllPlugins();

            if (!plugins[pluginId]) {
                console.error(`Plugin "${pluginId}" not found`);
                return false;
            }

            delete plugins[pluginId];
            localStorage.setItem(this.STORAGE_KEYS.PLUGINS, JSON.stringify(plugins));

            console.log(`[LocalStorage] Removed plugin: ${pluginId}`);
            return true;
        } catch (error) {
            console.error('Failed to remove plugin:', error);
            return false;
        }
    }

    // ============= Validation =============

    /**
     * Check if a plugin ID already exists
     * @param {string} pluginId - Plugin ID to check
     * @returns {boolean} True if exists
     */
    pluginExists(pluginId) {
        const plugins = this.getAllPlugins();
        return !!plugins[pluginId];
    }

    // ============= Metadata Cache =============

    /**
     * Cache plugin metadata for quick access
     * @param {string} pluginId - Plugin ID
     * @param {Object} metadata - Plugin metadata
     */
    cachePluginMetadata(pluginId, metadata) {
        try {
            const cache = this.getPluginMetadataCache();
            cache[pluginId] = {
                ...metadata,
                cachedAt: new Date().toISOString()
            };
            localStorage.setItem(this.STORAGE_KEYS.PLUGIN_METADATA, JSON.stringify(cache));
        } catch (error) {
            console.error('Failed to cache plugin metadata:', error);
        }
    }

    /**
     * Get cached plugin metadata
     * @returns {Object} Map of plugin ID -> metadata
     */
    getPluginMetadataCache() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.PLUGIN_METADATA);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Failed to load plugin metadata cache:', error);
            return {};
        }
    }

    // ============= Private Helper Methods =============

    /**
     * Clear all custom data (for debugging/reset)
     * WARNING: This removes all custom plugins!
     */
    clearAll() {
        if (confirm('Are you sure you want to remove all custom plugins? This cannot be undone.')) {
            localStorage.removeItem(this.STORAGE_KEYS.PLUGINS);
            localStorage.removeItem(this.STORAGE_KEYS.PLUGIN_METADATA);
            console.log('[LocalStorage] Cleared all custom plugin data');
            return true;
        }
        return false;
    }

    /**
     * Get storage usage information
     * @returns {Object} Storage usage stats
     */
    getStorageInfo() {
        const plugins = this.getAllPlugins();

        return {
            pluginCount: Object.keys(plugins).length,
            estimatedSize: this._estimateSize(plugins)
        };
    }

    /**
     * Estimate size of data in bytes
     * @private
     */
    _estimateSize(obj) {
        return new Blob([JSON.stringify(obj)]).size;
    }
}
