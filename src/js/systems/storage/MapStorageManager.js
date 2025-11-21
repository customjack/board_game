/**
 * MapStorageManager - Manages custom map storage in localStorage
 *
 * Handles CRUD operations for user-uploaded board JSON files,
 * including built-in maps and custom uploads.
 */

import BoardSchemaValidator from '../../infrastructure/utils/BoardSchemaValidator.js';

export default class MapStorageManager {
    static STORAGE_KEY = 'customMaps';
    static SELECTED_MAP_KEY = 'selectedMapId';

    /**
     * Get all stored maps (built-in + custom)
     * @returns {Array} Array of map objects with metadata
     */
    static getAllMaps() {
        const customMaps = this.getCustomMaps();
        const builtInMaps = this.getBuiltInMaps();

        return [...builtInMaps, ...customMaps];
    }

    /**
     * Get built-in maps metadata
     * @returns {Array} Array of built-in map metadata
     */
    static getBuiltInMaps() {
        return [
            {
                id: 'default',
                name: 'Demo Drinking Board',
                author: 'Jack Carlton',
                description: 'Standard drinking board game (GitHub Pages default)',
                isBuiltIn: true,
                path: 'assets/maps/demo_drinking_board.json',
                thumbnail: null,
                createdDate: '2024-10-28T12:00:00Z',
                engineType: 'turn-based'
            }
        ];
    }

    /**
     * Get custom maps from localStorage
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
    static getMapById(mapId) {
        const allMaps = this.getAllMaps();
        return allMaps.find(map => map.id === mapId) || null;
    }

    /**
     * Load board JSON for a map
     * @param {string} mapId - The map ID
     * @returns {Promise<Object>} The board JSON data
     */
    static async loadMapData(mapId) {
        const map = this.getMapById(mapId);

        if (!map) {
            throw new Error(`Map not found: ${mapId}`);
        }

        // If it's a custom map, return the stored board data
        if (!map.isBuiltIn && map.boardData) {
            return map.boardData;
        }

        // If it's a built-in map, fetch it from the path
        if (map.isBuiltIn && map.path) {
            try {
                const response = await fetch(map.path);
                if (!response.ok) {
            throw new Error(`Failed to fetch map: ${response.statusText}`);
        }
                return await response.json();
            } catch (error) {
                console.error(`Error loading built-in map ${mapId}:`, error);
                throw error;
            }
        }

        throw new Error(`Cannot load map data for ${mapId}`);
    }

    /**
     * Get the currently selected map ID
     * @returns {string|null} The selected map ID or null
     */
    static getSelectedMapId() {
        return localStorage.getItem(this.SELECTED_MAP_KEY) || 'default';
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
    static searchMaps(query) {
        if (!query || query.trim() === '') {
            return this.getAllMaps();
        }

        const lowerQuery = query.toLowerCase();
        return this.getAllMaps().filter(map => {
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
     * Export a map as a downloadable JSON file
     * @param {string} mapId - The map ID to export
     */
    static async exportMap(mapId) {
        const mapData = await this.loadMapData(mapId);
        const map = this.getMapById(mapId);

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
