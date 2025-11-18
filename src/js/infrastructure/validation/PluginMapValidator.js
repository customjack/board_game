/**
 * PluginMapValidator - Validates plugin and map compatibility between host and clients
 *
 * Ensures all players have:
 * - Required plugins for the selected map
 * - Compatible plugin versions
 * - Same map data
 */
export default class PluginMapValidator {
    constructor(pluginManager, localStorageManager) {
        this.pluginManager = pluginManager;
        this.localStorageManager = localStorageManager;
    }

    /**
     * Generate a manifest of current plugins and map for host to send to clients
     * @param {string} selectedMapId - ID of the selected map
     * @returns {Object} Manifest object
     */
    generateManifest(selectedMapId) {
        // Get all enabled plugins
        const plugins = this.pluginManager.getAllPlugins()
            .filter(p => p.enabled)
            .map(p => ({
                id: p.id,
                name: p.name,
                version: p.version,
                isDefault: p.isDefault,
                tags: p.tags
            }));

        // Get selected map data
        const map = this.localStorageManager.getMap(selectedMapId);

        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            plugins,
            map: map ? {
                id: selectedMapId,
                name: map.metadata.name,
                version: map.metadata.version,
                requiredPlugins: map.metadata.requiredPlugins || [],
                checksum: this._calculateChecksum(map.data)
            } : null
        };
    }

    /**
     * Validate client's plugins/map against host's manifest
     * @param {Object} hostManifest - Manifest from host
     * @returns {Object} Validation result
     */
    validateAgainstManifest(hostManifest) {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            missingPlugins: [],
            versionMismatches: [],
            mapStatus: null
        };

        // Validate plugins
        const pluginValidation = this._validatePlugins(hostManifest.plugins);
        result.missingPlugins = pluginValidation.missing;
        result.versionMismatches = pluginValidation.versionMismatches;

        if (pluginValidation.missing.length > 0) {
            result.valid = false;
            result.errors.push(`Missing required plugins: ${pluginValidation.missing.map(p => p.name).join(', ')}`);
        }

        if (pluginValidation.versionMismatches.length > 0) {
            result.warnings.push(`Version mismatches detected for: ${pluginValidation.versionMismatches.map(p => `${p.name} (you have ${p.yourVersion}, host has ${p.hostVersion})`).join(', ')}`);
        }

        // Validate map
        if (hostManifest.map) {
            const mapValidation = this._validateMap(hostManifest.map);
            result.mapStatus = mapValidation;

            if (!mapValidation.hasMap) {
                result.valid = false;
                result.errors.push(`Missing required map: ${hostManifest.map.name}`);
            } else if (!mapValidation.checksumMatch) {
                result.warnings.push(`Map checksum mismatch - you may have a different version of "${hostManifest.map.name}"`);
            }
        }

        return result;
    }

    /**
     * Validate that current plugins satisfy map requirements
     * @param {Object} mapData - Map data with metadata
     * @returns {Object} Validation result
     */
    validateMapRequirements(mapData) {
        const requiredPlugins = mapData.metadata?.requiredPlugins || mapData.requiredPlugins || [];

        if (requiredPlugins.length === 0) {
            return { valid: true, missing: [] };
        }

        const enabledPlugins = this.pluginManager.getAllPlugins()
            .filter(p => p.enabled)
            .map(p => p.id);

        const missing = requiredPlugins.filter(reqPlugin => !enabledPlugins.includes(reqPlugin));

        return {
            valid: missing.length === 0,
            missing,
            message: missing.length > 0
                ? `This map requires the following plugins: ${missing.join(', ')}`
                : 'All required plugins are available'
        };
    }

    /**
     * Check if a plugin can be safely added (no ID conflicts)
     * @param {string} pluginId - Plugin ID to check
     * @returns {Object} { canAdd: boolean, reason?: string }
     */
    canAddPlugin(pluginId) {
        // Check if already registered in plugin manager
        const existingPlugin = this.pluginManager.getPluginMetadata(pluginId);

        if (existingPlugin) {
            return {
                canAdd: false,
                reason: `A plugin with ID "${pluginId}" is already registered (${existingPlugin.name})`
            };
        }

        // Check local storage
        if (this.localStorageManager.pluginExists(pluginId)) {
            return {
                canAdd: false,
                reason: `A plugin with ID "${pluginId}" already exists in local storage`
            };
        }

        return { canAdd: true };
    }

    /**
     * Get list of plugins that clients need to install
     * @param {Object} validationResult - Result from validateAgainstManifest
     * @returns {Array} List of plugin instructions
     */
    getRequiredPluginInstructions(validationResult) {
        return validationResult.missingPlugins.map(plugin => ({
            id: plugin.id,
            name: plugin.name,
            version: plugin.version,
            instruction: plugin.isDefault
                ? `Core plugin "${plugin.name}" is required but not found. Please ensure you have the latest version of the game.`
                : `Custom plugin "${plugin.name}" (v${plugin.version}) is required. Ask the host to share this plugin file.`
        }));
    }

    // ============= Private Helper Methods =============

    /**
     * Validate plugins against host manifest
     * @private
     */
    _validatePlugins(hostPlugins) {
        const missing = [];
        const versionMismatches = [];

        const ourPlugins = this.pluginManager.getAllPlugins()
            .filter(p => p.enabled)
            .reduce((acc, p) => {
                acc[p.id] = p;
                return acc;
            }, {});

        hostPlugins.forEach(hostPlugin => {
            const ourPlugin = ourPlugins[hostPlugin.id];

            if (!ourPlugin) {
                missing.push(hostPlugin);
            } else if (ourPlugin.version !== hostPlugin.version) {
                versionMismatches.push({
                    id: hostPlugin.id,
                    name: hostPlugin.name,
                    yourVersion: ourPlugin.version,
                    hostVersion: hostPlugin.version
                });
            }
        });

        return { missing, versionMismatches };
    }

    /**
     * Validate map against host manifest
     * @private
     */
    _validateMap(hostMap) {
        const ourMap = this.localStorageManager.getMap(hostMap.id);

        if (!ourMap) {
            return {
                hasMap: false,
                checksumMatch: false,
                message: `Map "${hostMap.name}" not found`
            };
        }

        const ourChecksum = this._calculateChecksum(ourMap.data);
        const checksumMatch = ourChecksum === hostMap.checksum;

        return {
            hasMap: true,
            checksumMatch,
            message: checksumMatch
                ? 'Map matches host version'
                : 'Map version differs from host'
        };
    }

    /**
     * Calculate a simple checksum for map data
     * @private
     */
    _calculateChecksum(data) {
        // Simple hash function for map data
        const str = JSON.stringify(data);
        let hash = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        return hash.toString(36);
    }
}
