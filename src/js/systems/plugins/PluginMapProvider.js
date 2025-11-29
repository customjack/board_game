/**
 * PluginMapProvider - Manages maps bundled with plugins
 * 
 * Provides a clean API for plugins to register maps that are bundled
 * directly with the plugin code, rather than loaded from external URLs.
 * 
 * This allows plugin creators to include maps as part of their plugin
 * distribution, making it easier to package and share plugins with maps.
 */
import MapStorageManager from '../storage/MapStorageManager.js';

export default class PluginMapProvider {
    /**
     * Create a new PluginMapProvider for a specific plugin
     * @param {string} pluginId - The ID of the plugin that owns these maps
     * @param {Object} mapStorageManager - MapStorageManager instance (from bundle)
     */
    constructor(pluginId, mapStorageManager) {
        this.pluginId = pluginId;
        this.mapStorageManager = mapStorageManager;
        this.registeredMapIds = []; // Track which maps this plugin registered
    }

    /**
     * Register a map that is bundled with this plugin
     * @param {Object} mapData - The complete board JSON data
     * @param {Object} options - Optional configuration
     * @param {string} options.id - Map ID (defaults to extracting from mapData)
     * @param {string} options.name - Map name (defaults to extracting from mapData)
     * @param {string} options.author - Map author (defaults to plugin author)
     * @param {string} options.description - Map description (defaults to extracting from mapData)
     * @param {string} options.thumbnail - Thumbnail URL or data
     * @returns {Object} The registered map object
     */
    registerMap(mapData, options = {}) {
        if (!mapData) {
            throw new Error('Map data is required');
        }

        // Extract metadata from mapData if available
        const mapMetadata = mapData.metadata || {};
        
        // Merge provided options with map metadata
        const metadata = {
            id: options.id || mapMetadata.id || this._generateMapId(mapData),
            name: options.name || mapMetadata.name || mapData.name || 'Untitled Map',
            author: options.author || mapMetadata.author || 'Unknown',
            description: options.description || mapMetadata.description || mapData.description || '',
            thumbnail: options.thumbnail || mapMetadata.thumbnail || null,
            ...options
        };

        // Add plugin ownership information
        metadata.pluginId = this.pluginId;
        metadata.source = 'plugin-bundled';

        try {
            // Register the map using MapStorageManager
            const registeredMap = this.mapStorageManager.registerPluginMap(mapData, metadata);
            
            // Track this map as registered by this plugin
            if (!this.registeredMapIds.includes(registeredMap.id)) {
                this.registeredMapIds.push(registeredMap.id);
            }

            // console.log(`[PluginMapProvider] Registered map "${registeredMap.name}" (${registeredMap.id}) for plugin "${this.pluginId}"`);
            
            return registeredMap;
        } catch (error) {
            console.error(`[PluginMapProvider] Failed to register map for plugin "${this.pluginId}":`, error);
            throw error;
        }
    }

    /**
     * Register multiple maps at once
     * @param {Array<Object>} maps - Array of map objects, each with {data, options}
     * @returns {Array<Object>} Array of registered map objects
     */
    registerMaps(maps) {
        if (!Array.isArray(maps)) {
            throw new Error('Maps must be an array');
        }

        const registered = [];
        for (const map of maps) {
            try {
                const mapData = map.data || map;
                const options = map.options || {};
                const registeredMap = this.registerMap(mapData, options);
                registered.push(registeredMap);
            } catch (error) {
                console.error(`[PluginMapProvider] Failed to register map:`, error);
                // Continue with other maps even if one fails
            }
        }

        return registered;
    }

    /**
     * Unregister all maps registered by this plugin
     * Called when the plugin is removed/uninstalled
     * @returns {number} Number of maps unregistered
     */
    unregisterAllMaps() {
        const count = this.registeredMapIds.length;
        
        // Remove maps from MapStorageManager
        for (const mapId of this.registeredMapIds) {
            try {
                this.mapStorageManager.unregisterPluginMap(mapId);
            } catch (error) {
                console.error(`[PluginMapProvider] Failed to unregister map "${mapId}":`, error);
            }
        }

        this.registeredMapIds = [];
        // console.log(`[PluginMapProvider] Unregistered ${count} map(s) for plugin "${this.pluginId}"`);
        
        return count;
    }

    /**
     * Get all map IDs registered by this plugin
     * @returns {Array<string>} Array of map IDs
     */
    getRegisteredMapIds() {
        return [...this.registeredMapIds];
    }

    /**
     * Generate a unique map ID based on plugin ID and map data
     * @private
     * @param {Object} mapData - The map data
     * @returns {string} Generated map ID
     */
    _generateMapId(mapData) {
        const mapName = mapData.metadata?.name || mapData.name || 'map';
        const sanitized = mapName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return `${this.pluginId}-${sanitized}`;
    }
}
