/**
 * MapStorageManager - Manages custom map storage in localStorage
 *
 * Handles CRUD operations for user-uploaded board JSON files,
 * including built-in maps and custom uploads.
 */

import BoardSchemaValidator from '../../infrastructure/utils/BoardSchemaValidator.js';
import BoardBundleLoader from './BoardBundleLoader.js';
import JSZip from 'jszip';

export default class MapStorageManager {
    static STORAGE_KEY = 'customMaps';
    static SELECTED_MAP_KEY = 'selectedMapId';

    /**
     * Get all stored maps (built-in + custom)
     * Recreates preview thumbnails for bundle maps (both custom and built-in)
     * @returns {Promise<Array>} Array of map objects with metadata
     */
    static async getAllMaps() {
        const customMaps = await this.getCustomMapsWithThumbnails();
        const builtInMaps = await this.getBuiltInMapsWithThumbnails();

        return [...builtInMaps, ...customMaps];
    }
    
    /**
     * Get built-in maps and recreate preview thumbnails for bundle maps
     * @returns {Promise<Array>} Array of built-in map objects
     */
    static async getBuiltInMapsWithThumbnails() {
        const builtInMaps = this.getBuiltInMaps();
        
        // Recreate preview thumbnails for built-in bundle maps
        const mapsWithThumbnails = await Promise.all(builtInMaps.map(async (map) => {
            // If it's a built-in bundle map (ZIP file), load preview
            if (map.isBuiltIn && map.path && map.path.toLowerCase().endsWith('.zip')) {
                try {
                    const response = await fetch(map.path);
                    if (response.ok) {
                        const blob = await response.blob();
                        const preview = await BoardBundleLoader.extractPreview(blob);
                        if (preview) {
                            map.thumbnail = preview;
                        }
                    }
                } catch (error) {
                    console.warn(`[MapStorageManager] Failed to load preview for built-in map ${map.id}:`, error);
                }
            }
            return map;
        }));
        
        return mapsWithThumbnails;
    }
    
    /**
     * Get custom maps and recreate preview thumbnails for bundle maps
     * @returns {Promise<Array>} Array of custom map objects
     */
    static async getCustomMapsWithThumbnails() {
        const customMaps = this.getCustomMaps();
        
        // Recreate preview thumbnails for bundle maps
        const mapsWithThumbnails = await Promise.all(customMaps.map(async (map) => {
            if (map.bundleData && map.bundleFormat === 'zip') {
                try {
                    const zipArrayBuffer = this.base64ToArrayBuffer(map.bundleData);
                    const zipBlob = new Blob([zipArrayBuffer], { type: 'application/zip' });
                    const preview = await BoardBundleLoader.extractPreview(zipBlob);
                    if (preview) {
                        map.thumbnail = preview;
                    }
                } catch (error) {
                    console.warn(`[MapStorageManager] Failed to recreate preview for map ${map.id}:`, error);
                }
            }
            return map;
        }));
        
        return mapsWithThumbnails;
    }

    /**
     * Get built-in maps metadata
     * @returns {Array} Array of built-in map metadata
     */
    // Plugin-registered maps (dynamically added by plugins)
    static pluginMaps = [];

    static getBuiltInMaps() {
        return [
            {
                id: 'default',
                name: 'Default Board',
                author: 'Jack Carlton',
                description: 'Standard drinking board game',
                isBuiltIn: true,
                path: 'assets/maps/default-board.zip',
                thumbnail: null,
                createdDate: '2024-10-28T12:00:00Z',
                engineType: 'turn-based'
            },
            ...this.pluginMaps
        ];
    }

    /**
     * Register a map from a plugin
     * @param {Object} mapData - The board JSON data
     * @param {Object} metadata - Optional metadata override
     * @returns {Object} The registered map object
     */
    static registerPluginMap(mapData, metadata = {}) {
        // Validate the map data
        const validation = BoardSchemaValidator.validate(mapData);
        if (!validation.valid) {
            throw new Error(`Invalid map data: ${validation.errors.join(', ')}`);
        }

        // Extract metadata from the map data (v2.0 format) or use provided metadata
        const sourceMetadata = mapData.metadata || {};
        const mergedMetadata = { ...sourceMetadata, ...metadata };
        const engineType = this.getEngineType(mapData, mergedMetadata);

        const mapObject = {
            id: mergedMetadata.id || `plugin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: mergedMetadata.name || mapData.name || 'Untitled Map',
            author: mergedMetadata.author || mapData.author || 'Unknown',
            description: mergedMetadata.description || mapData.description || '',
            isBuiltIn: true, // Plugin maps are treated as built-in
            boardData: mapData, // Store the entire board JSON
            thumbnail: mergedMetadata.thumbnail || null,
            createdDate: mergedMetadata.created || mapData.created || new Date().toISOString(),
            metadata: mergedMetadata,
            engineType: engineType || 'turn-based',
            pluginId: mergedMetadata.pluginId || null, // Track which plugin provided this map
            source: mergedMetadata.source || 'plugin-bundled' // Track source type
        };

        // Check if already registered
        const existingIndex = this.pluginMaps.findIndex(m => m.id === mapObject.id);
        if (existingIndex >= 0) {
            this.pluginMaps[existingIndex] = mapObject;
        } else {
            this.pluginMaps.push(mapObject);
        }

        return mapObject;
    }

    /**
     * Unregister a plugin map (called when plugin is removed or map is deleted)
     * @param {string} mapId - The ID of the map to unregister
     * @returns {boolean} True if map was found and removed, false otherwise
     */
    static unregisterPluginMap(mapId) {
        const index = this.pluginMaps.findIndex(m => m.id === mapId);
        if (index >= 0) {
            this.pluginMaps.splice(index, 1);
            console.log(`[MapStorageManager] Unregistered plugin map "${mapId}"`);
            return true;
        }
        return false;
    }

    /**
     * Get all maps provided by a specific plugin
     * @param {string} pluginId - The plugin ID
     * @returns {Array} Array of map objects
     */
    static getMapsByPluginId(pluginId) {
        return this.pluginMaps.filter(m => m.pluginId === pluginId);
    }

    /**
     * Unregister all maps provided by a specific plugin
     * Called when a plugin is removed or refreshed
     * @param {string} pluginId - The plugin ID
     * @returns {number} Number of maps unregistered
     */
    static unregisterMapsByPluginId(pluginId) {
        const mapsToRemove = this.getMapsByPluginId(pluginId);
        const count = mapsToRemove.length;
        
        for (const map of mapsToRemove) {
            this.unregisterPluginMap(map.id);
        }
        
        console.log(`[MapStorageManager] Unregistered ${count} map(s) for plugin "${pluginId}"`);
        return count;
    }

    /**
     * Get custom maps from localStorage (synchronous, for listing)
     * Blob URLs are recreated when map data is loaded
     * @returns {Array} Array of custom map objects
     */
    static getCustomMaps() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (!stored) return [];

        try {
            const maps = JSON.parse(stored);
            if (!Array.isArray(maps)) return [];
            return maps.map(map => ({
                ...map,
                engineType: map.engineType ||
                    this.getEngineType(map.boardData, map.metadata) ||
                    'turn-based'
            }));
        } catch (error) {
            console.error('Error parsing custom maps from localStorage:', error);
            return [];
        }
    }
    
    /**
     * Recreate blob URLs from ZIP assets
     * @param {JSZip} zip - The loaded ZIP archive
     * @param {Object} existingAssets - Existing asset mapping (for reference)
     * @returns {Promise<Object>} Map of asset paths to Blob URLs
     */
    static async recreateAssetBlobUrls(zip, existingAssets) {
        const assets = {};
        const assetsRoot = 'assets/';
        
        // Find all asset files
        const assetFiles = Object.keys(zip.files).filter(path => 
            path.startsWith(assetsRoot) && 
            !path.endsWith('/') &&
            /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(path)
        );
        
        // Recreate blob URLs
        for (const assetPath of assetFiles) {
            const file = zip.file(assetPath);
            if (file) {
                const blob = await file.async('blob');
                const blobUrl = URL.createObjectURL(blob);
                
                const relativePath = assetPath.replace(assetsRoot, '');
                assets[assetPath] = blobUrl;
                assets[relativePath] = blobUrl;
                assets[`assets/${relativePath}`] = blobUrl;
            }
        }
        
        return assets;
    }
    
    /**
     * Sanitize board data for storage by removing blob URLs and restoring original paths
     * @param {Object} boardData - Board data with blob URLs
     * @returns {Object} Board data with original asset paths
     */
    static sanitizeBoardDataForStorage(boardData) {
        const sanitize = (obj) => {
            if (obj === null || obj === undefined) {
                return obj;
            }
            
            if (typeof obj === 'string') {
                // If it's a blob URL, try to extract the original path from _assets
                if (obj.startsWith('blob:')) {
                    // We can't recover the original path from blob URL, so we'll need to
                    // store a mapping or reconstruct from bundle on load
                    // For now, return as-is and we'll fix it on load
                    return obj;
                }
                return obj;
            }
            
            if (Array.isArray(obj)) {
                return obj.map(item => sanitize(item));
            }
            
            if (typeof obj === 'object') {
                const result = {};
                for (const [key, value] of Object.entries(obj)) {
                    // Skip _assets as we'll recreate it from bundle
                    if (key === '_assets') {
                        continue;
                    }
                    result[key] = sanitize(value);
                }
                return result;
            }
            
            return obj;
        };
        
        return sanitize(JSON.parse(JSON.stringify(boardData)));
    }
    
    /**
     * Update blob URLs in board data recursively
     * @param {Object} boardData - Board data to update
     * @param {Object} assets - Map of asset paths to blob URLs
     */
    static updateBlobUrlsInBoardData(boardData, assets) {
        const update = (obj) => {
            if (obj === null || obj === undefined) {
                return obj;
            }
            
            if (typeof obj === 'string') {
                // Check if this is an asset path that needs updating
                if (obj.startsWith('assets/') || obj.includes('space-sprite') || obj.includes('.png') || obj.includes('.jpg')) {
                    // Try to find matching asset by path
                    // Check exact match first
                    if (assets[obj]) {
                        return assets[obj];
                    }
                    // Check relative path
                    const relativePath = obj.replace(/^assets\//, '');
                    if (assets[relativePath]) {
                        return assets[relativePath];
                    }
                    // Check if any asset path contains this path
                    const matchingPath = Object.keys(assets).find(key => 
                        key.includes(obj) || obj.includes(key.replace(/^assets\//, ''))
                    );
                    if (matchingPath) {
                        return assets[matchingPath];
                    }
                }
                return obj;
            }
            
            if (Array.isArray(obj)) {
                return obj.map(item => update(item));
            }
            
            if (typeof obj === 'object') {
                const result = {};
                for (const [key, value] of Object.entries(obj)) {
                    result[key] = update(value);
                }
                return result;
            }
            
            return obj;
        };
        
        // Update topology (spaces with images)
        if (boardData.board?.topology) {
            boardData.board.topology = update(boardData.board.topology);
        }
    }

    /**
     * Save custom maps to localStorage
     * @param {Array} maps - Array of map objects to save
     */
    static saveCustomMaps(maps) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(maps));
        } catch (error) {
            console.error('Error saving custom maps to localStorage:', error);
            throw new Error('Failed to save maps. Storage may be full.');
        }
    }

    /**
     * Add a new custom map from a ZIP bundle
     * @param {File|Blob} zipFile - The ZIP file containing the board bundle
     * @returns {Promise<Object>} The saved map object with generated ID
     */
    static async addCustomMapFromBundle(zipFile) {
        // Clone the file for multiple uses
        const zipFileClone = zipFile instanceof File 
            ? new File([zipFile], zipFile.name, { type: zipFile.type })
            : new Blob([zipFile], { type: zipFile.type || 'application/zip' });
        
        // Convert ZIP to base64 for storage
        const zipArrayBuffer = await zipFileClone.arrayBuffer();
        const zipBase64 = this.arrayBufferToBase64(zipArrayBuffer);
        
        // Load the bundle to get normalized data and preview
        const mapData = await BoardBundleLoader.loadBundle(zipFile);
        const preview = await BoardBundleLoader.extractPreview(zipFileClone);
        
        // Store bundle data - we'll recreate blob URLs when loading from stored bundle
        const customMaps = this.getCustomMaps();
        const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const sourceMetadata = mapData.metadata || {};
        const mergedMetadata = { ...sourceMetadata, thumbnail: preview };
        const engineType = this.getEngineType(mapData, mergedMetadata);
        
        // Remove _assets from stored data (we'll recreate from bundle on load)
        const storedBoardData = { ...mapData };
        delete storedBoardData._assets;
        
        const mapObject = {
            id,
            name: mergedMetadata.name || mapData.name || 'Untitled Map',
            author: mergedMetadata.author || mapData.author || 'Unknown',
            description: mergedMetadata.description || mapData.description || '',
            isBuiltIn: false,
            boardData: storedBoardData, // Store board data (blob URLs will be recreated on load)
            bundleData: zipBase64, // Store entire ZIP as base64 for persistence
            bundleFormat: 'zip', // Track that this is a bundle
            thumbnail: preview,
            createdDate: mergedMetadata.created || mapData.created || new Date().toISOString(),
            uploadedDate: new Date().toISOString(),
            metadata: mergedMetadata,
            engineType
        };
        
        customMaps.push(mapObject);
        this.saveCustomMaps(customMaps);
        
        return mapObject;
    }
    
    /**
     * Convert ArrayBuffer to base64 string
     * @param {ArrayBuffer} buffer - ArrayBuffer to convert
     * @returns {string} Base64 string
     */
    static arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    /**
     * Convert base64 string to ArrayBuffer
     * @param {string} base64 - Base64 string to convert
     * @returns {ArrayBuffer} ArrayBuffer
     */
    static base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Add a new custom map
     * @param {Object} mapData - The board JSON data
     * @param {Object} metadata - Optional metadata override
     * @returns {Object} The saved map object with generated ID
     */
    static addCustomMap(mapData, metadata = {}) {
        // Validate the map data
        const validation = BoardSchemaValidator.validate(mapData);
        if (!validation.valid) {
            throw new Error(`Invalid map data: ${validation.errors.join(', ')}`);
        }

        const customMaps = this.getCustomMaps();

        // Generate unique ID
        const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Extract metadata from the map data (v2.0 format) or use provided metadata
        const sourceMetadata = mapData.metadata || {};
        const mergedMetadata = { ...sourceMetadata, ...metadata };
        const engineType = this.getEngineType(mapData, mergedMetadata);

        const mapObject = {
            id,
            name: mergedMetadata.name || mapData.name || 'Untitled Map',
            author: mergedMetadata.author || mapData.author || 'Unknown',
            description: mergedMetadata.description || mapData.description || '',
            isBuiltIn: false,
            boardData: mapData, // Store the entire board JSON
            thumbnail: mergedMetadata.thumbnail || null,
            createdDate: mergedMetadata.created || mapData.created || new Date().toISOString(),
            uploadedDate: new Date().toISOString(),
            metadata: mergedMetadata,
            engineType
        };

        customMaps.push(mapObject);
        this.saveCustomMaps(customMaps);

        return mapObject;
    }

    static getEngineType(mapData = {}, metadata = {}) {
        return metadata?.gameEngine?.type ||
            mapData?.metadata?.gameEngine?.type ||
            mapData?.engine?.type ||
            mapData?.board?.metadata?.gameEngine?.type ||
            mapData?.board?.engine?.type ||
            null;
    }

    /**
     * Delete a custom map by ID
     * @param {string} mapId - The ID of the map to delete
     * @returns {boolean} True if deleted, false if not found
     */
    static deleteCustomMap(mapId) {
        const customMaps = this.getCustomMaps();
        const initialLength = customMaps.length;
        const filtered = customMaps.filter(map => map.id !== mapId);

        if (filtered.length < initialLength) {
            this.saveCustomMaps(filtered);
            return true;
        }

        return false;
    }

    /**
     * Get a map by ID (built-in or custom)
     * @param {string} mapId - The map ID
     * @returns {Object|null} The map object or null if not found
     */
    static async getMapById(mapId) {
        const allMaps = await this.getAllMaps();
        return allMaps.find(map => map.id === mapId) || null;
    }

    /**
     * Update a map's thumbnail (useful for built-in maps that load previews from bundles)
     * @param {string} mapId - The map ID
     * @param {string} thumbnailUrl - The thumbnail Blob URL
     */
    static async updateMapThumbnail(mapId, thumbnailUrl) {
        const map = await this.getMapById(mapId);
        if (map) {
            map.thumbnail = thumbnailUrl;
        }
    }

    /**
     * Load board JSON for a map
     * Recreates blob URLs from stored bundle data if needed
     * @param {string} mapId - The map ID
     * @returns {Promise<Object>} The board JSON data
     */
    static async loadMapData(mapId) {
        const map = await this.getMapById(mapId);

        if (!map) {
            throw new Error(`Map not found: ${mapId}`);
        }

        // If it's a custom bundle map, reload from stored bundle to get fresh blob URLs
        if (!map.isBuiltIn && map.bundleData && map.bundleFormat === 'zip') {
            try {
                const zipArrayBuffer = this.base64ToArrayBuffer(map.bundleData);
                const zipBlob = new Blob([zipArrayBuffer], { type: 'application/zip' });
                
                // Reload bundle completely - this creates fresh blob URLs
                const mapData = await BoardBundleLoader.loadBundle(zipBlob);
                
                // Verify blob URLs were created (debug)
                if (mapData.board?.topology?.spaces) {
                    const spacesWithImages = mapData.board.topology.spaces.filter(s => 
                        s.visual?.image || s.visual?.sprite?.image
                    );
                    if (spacesWithImages.length > 0) {
                        const firstImage = spacesWithImages[0].visual?.image || spacesWithImages[0].visual?.sprite?.image;
                        if (firstImage && !firstImage.startsWith('blob:')) {
                            console.warn(`[MapStorageManager] Space image path not converted to blob URL: ${firstImage}`);
                        }
                    }
                }
                
                // Recreate preview thumbnail
                const preview = await BoardBundleLoader.extractPreview(zipBlob);
                if (preview) {
                    map.thumbnail = preview;
                    await this.updateMapThumbnail(mapId, preview);
                }
                
                // Update stored boardData with fresh blob URLs (for caching)
                map.boardData = mapData;
                
                return mapData;
            } catch (error) {
                console.error(`[MapStorageManager] Failed to reload bundle for map ${mapId}:`, error);
                // If we have stored boardData, try to use it (but blob URLs may be invalid)
                if (map.boardData) {
                    console.warn(`[MapStorageManager] Using stored boardData (blob URLs may be invalid)`);
                    return map.boardData;
                }
                throw error;
            }
        }

        // If map has boardData and it's NOT a bundle (plugin-registered map), return it directly
        // For bundle maps, we always reload from bundle to get fresh blob URLs
        if (map.boardData && (!map.bundleData || map.bundleFormat !== 'zip')) {
            return map.boardData;
        }

        // If it's a built-in map, fetch it from the path
        if (map.isBuiltIn && map.path) {
            try {
                const response = await fetch(map.path);
                if (!response.ok) {
                    throw new Error(`Failed to fetch map: ${response.statusText}`);
                }
                
                // Check if it's a ZIP file
                const isZip = map.path.toLowerCase().endsWith('.zip') || 
                             response.headers.get('content-type')?.includes('zip') ||
                             response.headers.get('content-type')?.includes('application/zip');
                
                if (isZip) {
                    // Load as bundle
                    const blob = await response.blob();
                    const mapData = await BoardBundleLoader.loadBundle(blob);
                    
                    // Extract preview if available and update map thumbnail
                    const preview = await BoardBundleLoader.extractPreview(blob);
                    if (preview) {
                        // Update the map object's thumbnail for display in map manager
                        this.updateMapThumbnail(mapId, preview);
                    }
                    
                    return mapData;
                } else {
                    // Load as JSON
                    return await response.json();
                }
            } catch (error) {
                console.error(`Error loading built-in map ${mapId}:`, error);
                throw error;
            }
        }

        throw new Error(`Cannot load map data for ${mapId}`);
    }

    /**
     * Get the currently selected map ID
     * Validates that the map exists, falls back to 'default' if not
     * @returns {string} The selected map ID (always returns a valid map ID)
     */
    static async getSelectedMapId() {
        const storedId = localStorage.getItem(this.SELECTED_MAP_KEY);
        const mapId = storedId || 'default';
        
        // Validate that the map exists
        const allMaps = await this.getAllMaps();
        const mapExists = allMaps.some(map => map.id === mapId);
        
        if (!mapExists) {
            console.warn(`[MapStorageManager] Selected map "${mapId}" not found, falling back to "default"`);
            // Clear the invalid selection and return default
            localStorage.setItem(this.SELECTED_MAP_KEY, 'default');
            return 'default';
        }
        
        return mapId;
    }

    /**
     * Set the currently selected map ID
     * @param {string} mapId - The map ID to select
     */
    static setSelectedMapId(mapId) {
        localStorage.setItem(this.SELECTED_MAP_KEY, mapId);
    }

    /**
     * Search maps by name or description
     * @param {string} query - Search query
     * @returns {Array} Filtered array of maps
     */
    static async searchMaps(query) {
        if (!query || query.trim() === '') {
            return await this.getAllMaps();
        }

        const lowerQuery = query.toLowerCase();
        const allMaps = await this.getAllMaps();
        return allMaps.filter(map => {
            return (
                map.name.toLowerCase().includes(lowerQuery) ||
                (map.description && map.description.toLowerCase().includes(lowerQuery)) ||
                (map.author && map.author.toLowerCase().includes(lowerQuery))
            );
        });
    }

    /**
     * Generate a simple thumbnail data for a map (for future use)
     * @param {Object} boardData - The board JSON data
     * @returns {Object} Thumbnail metadata
     */
    static generateThumbnail(boardData) {
        // For now, just return basic stats
        // In the future, this could generate an actual image preview
        return {
            spaceCount: boardData.spaces?.length || 0,
            eventCount: boardData.spaces?.reduce((sum, space) =>
                sum + (space.events?.length || 0), 0) || 0,
            connectionCount: boardData.spaces?.reduce((sum, space) =>
                sum + (space.connections?.length || 0), 0) || 0
        };
    }

    /**
     * Clear all custom maps (useful for testing/reset)
     */
    static clearAllCustomMaps() {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    /**
     * Export a map as a ZIP bundle (if bundle) or JSON file (if legacy)
     * @param {string} mapId - The map ID to export
     */
    static async exportMap(mapId) {
        const map = await this.getMapById(mapId);
        if (!map) {
            throw new Error(`Map not found: ${mapId}`);
        }

        // If this is a bundle map, export as ZIP
        if (map.bundleData && map.bundleFormat === 'zip') {
            const zipArrayBuffer = this.base64ToArrayBuffer(map.bundleData);
            const blob = new Blob([zipArrayBuffer], { type: 'application/zip' });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${map.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            // Legacy JSON export
            const mapData = await this.loadMapData(mapId);
            const blob = new Blob([JSON.stringify(mapData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${map.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
}
