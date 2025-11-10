/**
 * LocalStorageManager - Manages local storage for plugins and maps
 *
 * Stores:
 * - Custom plugins (with their source code)
 * - Custom/uploaded maps
 * - Plugin metadata cache
 * - Map metadata cache
 */
export default class LocalStorageManager {
    constructor() {
        this.STORAGE_KEYS = {
            PLUGINS: 'custom_plugins',
            MAPS: 'custom_maps',
            PLUGIN_METADATA: 'plugin_metadata_cache',
            MAP_METADATA: 'map_metadata_cache'
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
                savedAt: new Date().toISOString(),
                // Plugin can optionally bundle maps
                bundledMaps: pluginData.bundledMaps || []
            };

            localStorage.setItem(this.STORAGE_KEYS.PLUGINS, JSON.stringify(plugins));

            // Save bundled maps if any
            if (pluginData.bundledMaps && pluginData.bundledMaps.length > 0) {
                this._saveBundledMaps(pluginId, pluginData.bundledMaps);
            }

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

            // Remove bundled maps
            const plugin = plugins[pluginId];
            if (plugin.bundledMaps && plugin.bundledMaps.length > 0) {
                plugin.bundledMaps.forEach(mapId => {
                    this.removeMap(mapId);
                });
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

    // ============= Map Management =============

    /**
     * Save a map to local storage
     * @param {string} mapId - Unique map ID
     * @param {Object} mapData - Map data (board JSON)
     * @param {Object} options - Additional options (source plugin, etc.)
     * @returns {boolean} Success status
     */
    saveMap(mapId, mapData, options = {}) {
        try {
            const maps = this.getAllMaps();

            maps[mapId] = {
                id: mapId,
                data: mapData,
                metadata: {
                    name: mapData.name || 'Unnamed Map',
                    author: mapData.author,
                    description: mapData.description,
                    requiredPlugins: mapData.requiredPlugins || [],
                    tags: mapData.tags || [],
                    version: mapData.version || '1.0.0',
                    createdDate: mapData.created || new Date().toISOString(),
                    modifiedDate: new Date().toISOString()
                },
                source: options.sourcePlugin || 'user-upload',
                savedAt: new Date().toISOString()
            };

            localStorage.setItem(this.STORAGE_KEYS.MAPS, JSON.stringify(maps));

            console.log(`[LocalStorage] Saved map: ${mapId}`);
            return true;
        } catch (error) {
            console.error('Failed to save map:', error);
            return false;
        }
    }

    /**
     * Get a specific map from local storage
     * @param {string} mapId - Map ID
     * @returns {Object|null} Map data or null
     */
    getMap(mapId) {
        const maps = this.getAllMaps();
        return maps[mapId] || null;
    }

    /**
     * Get all maps from local storage
     * @returns {Object} Map of map ID -> map data
     */
    getAllMaps() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.MAPS);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Failed to load maps:', error);
            return {};
        }
    }

    /**
     * Remove a map from local storage
     * @param {string} mapId - Map ID to remove
     * @returns {boolean} Success status
     */
    removeMap(mapId) {
        try {
            const maps = this.getAllMaps();

            if (!maps[mapId]) {
                console.error(`Map "${mapId}" not found`);
                return false;
            }

            delete maps[mapId];
            localStorage.setItem(this.STORAGE_KEYS.MAPS, JSON.stringify(maps));

            console.log(`[LocalStorage] Removed map: ${mapId}`);
            return true;
        } catch (error) {
            console.error('Failed to remove map:', error);
            return false;
        }
    }

    /**
     * Get maps that require specific plugins
     * @param {Array<string>} pluginIds - Plugin IDs to check
     * @returns {Array} Array of maps that require these plugins
     */
    getMapsByRequiredPlugins(pluginIds) {
        const maps = this.getAllMaps();
        const result = [];

        for (const [mapId, mapData] of Object.entries(maps)) {
            const requiredPlugins = mapData.metadata.requiredPlugins || [];

            // Check if any of the required plugins match
            if (requiredPlugins.some(reqPlugin => pluginIds.includes(reqPlugin))) {
                result.push(mapData);
            }
        }

        return result;
    }

    // ============= Validation =============

    /**
     * Validate that all required plugins for a map are available
     * @param {string} mapId - Map ID to validate
     * @param {Array<string>} availablePluginIds - IDs of available plugins
     * @returns {Object} { valid: boolean, missing: string[] }
     */
    validateMapPlugins(mapId, availablePluginIds) {
        const map = this.getMap(mapId);

        if (!map) {
            return { valid: false, missing: [], error: 'Map not found' };
        }

        const requiredPlugins = map.metadata.requiredPlugins || [];
        const missing = requiredPlugins.filter(pluginId => !availablePluginIds.includes(pluginId));

        return {
            valid: missing.length === 0,
            missing
        };
    }

    /**
     * Check if a plugin ID already exists
     * @param {string} pluginId - Plugin ID to check
     * @returns {boolean} True if exists
     */
    pluginExists(pluginId) {
        const plugins = this.getAllPlugins();
        return !!plugins[pluginId];
    }

    /**
     * Check if a map ID already exists
     * @param {string} mapId - Map ID to check
     * @returns {boolean} True if exists
     */
    mapExists(mapId) {
        const maps = this.getAllMaps();
        return !!maps[mapId];
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
     * Save maps bundled with a plugin
     * @private
     */
    _saveBundledMaps(pluginId, bundledMaps) {
        bundledMaps.forEach(mapData => {
            const mapId = `${pluginId}_${mapData.id || mapData.name.replace(/\s+/g, '_')}`;
            this.saveMap(mapId, mapData, { sourcePlugin: pluginId });
        });
    }

    /**
     * Clear all custom data (for debugging/reset)
     * WARNING: This removes all custom plugins and maps!
     */
    clearAll() {
        if (confirm('Are you sure you want to remove all custom plugins and maps? This cannot be undone.')) {
            localStorage.removeItem(this.STORAGE_KEYS.PLUGINS);
            localStorage.removeItem(this.STORAGE_KEYS.MAPS);
            localStorage.removeItem(this.STORAGE_KEYS.PLUGIN_METADATA);
            localStorage.removeItem(this.STORAGE_KEYS.MAP_METADATA);
            console.log('[LocalStorage] Cleared all custom data');
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
        const maps = this.getAllMaps();

        return {
            pluginCount: Object.keys(plugins).length,
            mapCount: Object.keys(maps).length,
            estimatedSize: this._estimateSize(plugins) + this._estimateSize(maps)
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
