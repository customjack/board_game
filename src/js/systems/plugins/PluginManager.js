import Plugin from './Plugin.js';
import PluginLoader from './PluginLoader.js';

/**
 * PluginManager - Centralized management for all game plugins
 *
 * Responsibilities:
 * - Register and track all plugins
 * - Enable/disable plugins (except default plugins)
 * - Query plugin metadata
 * - Validate plugin dependencies
 * - Generate plugin manifests for host-client sync
 * - Load plugins from files (dynamic loading)
 */
export default class PluginManager {
    constructor(eventBus, registryManager, factoryManager) {
        this.eventBus = eventBus;
        this.registryManager = registryManager;
        this.factoryManager = factoryManager;

        // Legacy: array of initialized plugin instances
        this.plugins = [];

        // Map of plugin ID -> plugin instance
        this.pluginInstances = new Map();

        // Map of plugin ID -> enabled state (default plugins always enabled)
        this.pluginStates = new Map();

        // Map of plugin ID -> plugin class (for lazy instantiation)
        this.pluginClasses = new Map();

        // Host/peer status
        this.isHost = false;
        this.peer = null;

        // Loaded plugin URLs
        this.loadedPluginUrls = new Set();

        // Map of plugin ID -> Source URL (for removal)
        this.pluginUrls = new Map();

        // Map of plugin ID -> Full plugin info (for remote plugins)
        this.remotePluginInfo = new Map();

        // Initialize PluginLoader
        this.pluginLoader = new PluginLoader({
            registryManager: this.registryManager,
            // Pass base classes if needed by plugins
            baseClasses: { Plugin }
        });

        this.loadSavedPlugins();
    }

    /**
     * Register a plugin class (doesn't initialize it yet)
     * @param {Class} pluginClass - Plugin class that extends Plugin
     * @returns {boolean} Success status
     */
    registerPluginClass(pluginClass) {
        try {
            // Get metadata from static method
            if (typeof pluginClass.getPluginMetadata !== 'function') {
                console.error('Plugin must implement static getPluginMetadata() method');
                return false;
            }

            const metadata = pluginClass.getPluginMetadata();

            // Validate metadata
            const validation = this._validateMetadata(metadata);
            if (!validation.valid) {
                console.error(`Invalid plugin metadata for ${pluginClass.name}:`, validation.errors);
                return false;
            }

            // Check for duplicate plugin ID
            if (this.pluginClasses.has(metadata.id)) {
                const existingPlugin = this.pluginClasses.get(metadata.id).getPluginMetadata();
                console.error(`Cannot register plugin: ID "${metadata.id}" is already in use by "${existingPlugin.name}"`);
                return false;
            }

            // Store plugin class
            this.pluginClasses.set(metadata.id, pluginClass);

            // Set initial state (default plugins always enabled, custom plugins enabled by default)
            this.pluginStates.set(metadata.id, true);

            return true;
        } catch (error) {
            console.error('Failed to register plugin class:', error);
            return false;
        }
    }

    /**
     * Register and initialize a plugin instance (legacy method)
     * @param {Plugin} plugin - Plugin instance
     */
    registerPlugin(plugin) {
        if (!(plugin instanceof Plugin)) {
            throw new Error('Plugin must extend the Plugin base class.');
        }
        this.plugins.push(plugin);
        plugin.initialize(this.eventBus, this.registryManager, this.factoryManager);

        // Try to register in new system if it has metadata
        if (typeof plugin.constructor.getPluginMetadata === 'function') {
            const metadata = plugin.constructor.getPluginMetadata();
            if (metadata && metadata.id) {
                this.pluginInstances.set(metadata.id, plugin);
                if (!this.pluginClasses.has(metadata.id)) {
                    this.pluginClasses.set(metadata.id, plugin.constructor);
                    this.pluginStates.set(metadata.id, true);
                }
            }
        }
    }

    /**
     * Initialize a plugin from its registered class
     * @param {string} pluginId - Plugin ID to initialize
     * @returns {boolean} Success status
     */
    initializePlugin(pluginId) {
        try {
            const pluginClass = this.pluginClasses.get(pluginId);
            if (!pluginClass) {
                console.error(`Plugin ${pluginId} not found in registry`);
                return false;
            }

            // Check if already initialized
            if (this.pluginInstances.has(pluginId)) {
                console.warn(`Plugin ${pluginId} already initialized`);
                return true;
            }

            // Create instance
            const pluginInstance = new pluginClass();

            // Call initialize method
            if (typeof pluginInstance.initialize === 'function') {
                pluginInstance.initialize(this.eventBus, this.registryManager, this.factoryManager);
            }

            // Store instance
            this.pluginInstances.set(pluginId, pluginInstance);
            this.plugins.push(pluginInstance); // Also add to legacy array

            const metadata = pluginClass.getPluginMetadata();
            console.log(`[PluginManager] Initialized: ${metadata.name}`);
            return true;
        } catch (error) {
            console.error(`Failed to initialize plugin ${pluginId}:`, error);
            return false;
        }
    }

    /**
     * Unregister a plugin completely
     * @param {string} pluginId - Plugin ID to unregister
     * @returns {boolean} Success status
     */
    unregisterPlugin(pluginId) {
        const metadata = this.getPluginMetadata(pluginId);

        // Cannot unregister default plugins
        if (metadata && metadata.isDefault) {
            console.error(`Cannot unregister default plugin: ${pluginId}`);
            return false;
        }

        // Call cleanup if plugin is initialized
        if (this.pluginInstances.has(pluginId)) {
            const plugin = this.pluginInstances.get(pluginId);
            if (typeof plugin.cleanup === 'function') {
                plugin.cleanup();
            }

            // Remove from legacy array
            const index = this.plugins.indexOf(plugin);
            if (index > -1) {
                this.plugins.splice(index, 1);
            }

            this.pluginInstances.delete(pluginId);
        }

        // Remove from registry
        this.pluginClasses.delete(pluginId);
        this.pluginStates.delete(pluginId);

        // Remove from persistence if it was loaded from a URL
        if (this.pluginUrls.has(pluginId)) {
            this.removeSavedRemotePlugin(pluginId);
        }

        console.log(`[PluginManager] Unregistered plugin: ${pluginId}`);
        return true;
    }

    /**
     * Initialize a plugin from a file
     * @param {File} file - JavaScript file to load
     */
    async initializePluginFromFile(file) {
        console.log(file, file.type);
        if (file && (file.type === 'application/javascript' || file.type === 'text/javascript')) {
            const text = await this.readFile(file);
            const plugin = this.createPluginFromSource(text);
            this.registerPlugin(plugin);
        } else {
            throw new Error('File must be a valid JavaScript file.');
        }
    }

    /**
     * Read the file as text
     * @param {File} file - File to read
     * @returns {Promise<string>} File contents
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (event) => reject(new Error('Failed to read file.'));
            reader.readAsText(file);
        });
    }

    /**
     * Create a plugin instance from JavaScript source code
     * @param {string} source - JavaScript source code
     * @returns {Plugin} Plugin instance
     */
    createPluginFromSource(source) {
        const pluginConstructor = new Function('Plugin', `
            const pluginClass = ${source};
            return new pluginClass();
        `)(Plugin);

        if (!(pluginConstructor instanceof Plugin)) {
            throw new Error('Uploaded file must export a valid Plugin class.');
        }

        return pluginConstructor;
    }

    /**
     * Load a plugin from a remote URL or plugin info object
     * @param {string|Object} urlOrInfo - URL string or plugin info object with {url, id, name, description, cdn, etc}
     * @returns {Promise<Object>} Result object with {success: boolean, pluginId?: string, error?: string}
     */
    async loadPluginFromUrl(urlOrInfo) {
        try {
            // Normalize input to plugin info object
            let pluginInfo;
            if (typeof urlOrInfo === 'string') {
                pluginInfo = {
                    id: `remote-${Date.now()}`,
                    name: 'Remote Plugin',
                    url: urlOrInfo,
                    loadMethod: 'ES',
                    description: '',
                    source: urlOrInfo
                };
            } else {
                pluginInfo = {
                    id: urlOrInfo.id || `remote-${Date.now()}`,
                    name: urlOrInfo.name || 'Remote Plugin',
                    url: urlOrInfo.url || urlOrInfo.cdn,
                    loadMethod: urlOrInfo.loadMethod || 'ES',
                    description: urlOrInfo.description || '',
                    source: urlOrInfo.cdn || urlOrInfo.url,
                    version: urlOrInfo.version || '1.0.0',
                    author: urlOrInfo.author || '',
                    tags: urlOrInfo.tags || []
                };
            }

            if (!pluginInfo.url) {
                throw new Error('Plugin URL is required');
            }

            // Check if already loaded
            if (this.loadedPluginUrls.has(pluginInfo.url)) {
                console.warn(`Plugin from ${pluginInfo.url} already loaded`);
                const existingPlugin = Array.from(this.remotePluginInfo.values()).find(p => p.url === pluginInfo.url);
                return {
                    success: true,
                    pluginId: existingPlugin?.id || pluginInfo.id
                };
            }

            console.log(`[PluginManager] Loading plugin from ${pluginInfo.url}...`);

            // Use PluginLoader to load the plugin
            const loaderInfo = {
                id: pluginInfo.id,
                name: pluginInfo.name,
                url: pluginInfo.url,
                loadMethod: pluginInfo.loadMethod
            };

            const result = await this.pluginLoader.loadPluginWithFallback(loaderInfo);

            if (!result.success) {
                throw new Error(result.error);
            }

            // Import the module to get the Plugin class
            const module = await import(/* webpackIgnore: true */ pluginInfo.url);
            const PluginClass = module.default;

            if (!PluginClass || !(PluginClass.prototype instanceof Plugin)) {
                throw new Error('Module must export a default class extending Plugin');
            }

            // Get metadata from the plugin class (may override our temporary info)
            const metadata = PluginClass.getPluginMetadata();
            
            // Merge metadata with our plugin info
            const fullPluginInfo = {
                ...pluginInfo,
                id: metadata.id,
                name: metadata.name || pluginInfo.name,
                description: metadata.description || pluginInfo.description,
                version: metadata.version || pluginInfo.version,
                author: metadata.author || pluginInfo.author,
                tags: metadata.tags || pluginInfo.tags,
                dependencies: metadata.dependencies || [],
                url: pluginInfo.url,
                source: pluginInfo.source || pluginInfo.url,
                loadMethod: result.method || pluginInfo.loadMethod,
                loaded: true,
                loadedAt: new Date().toISOString()
            };

            // Register the class
            if (this.registerPluginClass(PluginClass)) {
                // Initialize it
                if (this.initializePlugin(metadata.id)) {
                    this.loadedPluginUrls.add(pluginInfo.url);
                    this.pluginUrls.set(metadata.id, pluginInfo.url);
                    this.remotePluginInfo.set(metadata.id, fullPluginInfo);
                    this.saveRemotePlugin(fullPluginInfo);
                    return {
                        success: true,
                        pluginId: metadata.id
                    };
                }
            }
            return {
                success: false,
                error: 'Failed to register or initialize plugin'
            };
        } catch (error) {
            console.error(`Failed to load plugin:`, error);
            return {
                success: false,
                error: error.message || String(error)
            };
        }
    }

    /**
     * Save a remote plugin to local storage
     * @param {Object} pluginInfo - Full plugin info object
     */
    saveRemotePlugin(pluginInfo) {
        try {
            const plugins = this.getSavedRemotePlugins();
            const existingIndex = plugins.findIndex(p => p.id === pluginInfo.id || p.url === pluginInfo.url);
            
            if (existingIndex >= 0) {
                plugins[existingIndex] = pluginInfo;
            } else {
                plugins.push(pluginInfo);
            }
            
            localStorage.setItem('remote_plugins', JSON.stringify(plugins));
        } catch (e) {
            console.warn('Failed to save remote plugin to localStorage', e);
        }
    }

    /**
     * Get all saved remote plugins from local storage
     * @returns {Array} Array of plugin info objects
     */
    getSavedRemotePlugins() {
        try {
            const stored = localStorage.getItem('remote_plugins');
            if (!stored) return [];
            return JSON.parse(stored);
        } catch (e) {
            console.warn('Failed to load remote plugins from localStorage', e);
            return [];
        }
    }

    /**
     * Load saved plugins from local storage
     */
    async loadSavedPlugins() {
        try {
            const plugins = this.getSavedRemotePlugins();
            for (const pluginInfo of plugins) {
                // Only load if it has a valid URL
                if (pluginInfo.url) {
                    try {
                        await this.loadPluginFromUrl(pluginInfo);
                    } catch (error) {
                        console.warn(`Failed to load saved plugin ${pluginInfo.id}:`, error);
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to load saved plugins from localStorage', e);
        }
    }

    /**
     * Remove a saved remote plugin
     * @param {string} pluginId - Plugin ID to remove
     */
    removeSavedRemotePlugin(pluginId) {
        try {
            const plugins = this.getSavedRemotePlugins();
            const filtered = plugins.filter(p => p.id !== pluginId);
            localStorage.setItem('remote_plugins', JSON.stringify(filtered));
            
            // Also remove from in-memory maps
            const pluginInfo = this.remotePluginInfo.get(pluginId);
            if (pluginInfo && pluginInfo.url) {
                this.loadedPluginUrls.delete(pluginInfo.url);
            }
            this.pluginUrls.delete(pluginId);
            this.remotePluginInfo.delete(pluginId);
        } catch (e) {
            console.warn('Failed to remove remote plugin from localStorage', e);
        }
    }

    /**
     * Get remote plugin info by ID
     * @param {string} pluginId - Plugin ID
     * @returns {Object|null} Plugin info or null
     */
    getRemotePluginInfo(pluginId) {
        return this.remotePluginInfo.get(pluginId) || null;
    }

    /**
     * Get all remote plugins
     * @returns {Array} Array of remote plugin info objects
     */
    getAllRemotePlugins() {
        return Array.from(this.remotePluginInfo.values());
    }

    /**
     * Extract plugin requirements from map data
     * @param {Object} mapData - Map JSON data
     * @returns {Array} Array of plugin requirement objects
     */
    extractPluginRequirements(mapData) {
        const requirements = mapData?.requirements?.plugins || mapData?.metadata?.plugins || [];
        return requirements.map(req => {
            if (typeof req === 'string') {
                return { id: req, version: '^1.0.0', source: 'builtin' };
            }
            return {
                id: req.id,
                version: req.version || '^1.0.0',
                source: req.source || 'builtin',
                cdn: req.cdn || req.url || null,
                description: req.description || '',
                name: req.name || req.id
            };
        });
    }

    /**
     * Check if all required plugins are loaded
     * @param {Array} requiredPlugins - Array of plugin requirement objects
     * @returns {Object} { allLoaded: boolean, missing: Array }
     */
    checkPluginRequirements(requiredPlugins) {
        const missing = [];
        
        for (const req of requiredPlugins) {
            // Skip 'core' or 'builtin' plugins as they're always available
            if (req.id === 'core' || req.source === 'builtin') {
                continue;
            }
            
            // Check if plugin is registered
            if (!this.pluginClasses.has(req.id)) {
                missing.push(req);
            }
        }
        
        return {
            allLoaded: missing.length === 0,
            missing
        };
    }

    /**
     * Load required plugins from map data
     * @param {Object} mapData - Map JSON data
     * @param {boolean} autoLoad - Whether to auto-load if user setting allows
     * @returns {Promise<Object>} Result with loaded plugins and any missing ones
     */
    async loadRequiredPlugins(mapData, autoLoad = false) {
        const requirements = this.extractPluginRequirements(mapData);
        const check = this.checkPluginRequirements(requirements);
        
        if (check.allLoaded) {
            return { success: true, loaded: [], missing: [] };
        }
        
        const missing = check.missing;
        const loaded = [];
        const failed = [];
        
        // Only auto-load if enabled
        if (!autoLoad) {
            return { success: false, loaded: [], missing, failed: [] };
        }
        
        // Try to load missing plugins
        for (const req of missing) {
            if (req.cdn || req.source === 'remote') {
                try {
                    const result = await this.loadPluginFromUrl({
                        id: req.id,
                        name: req.name,
                        url: req.cdn,
                        description: req.description,
                        version: req.version
                    });
                    
                    if (result.success) {
                        loaded.push({ ...req, pluginId: result.pluginId });
                    } else {
                        failed.push({ ...req, error: result.error });
                    }
                } catch (error) {
                    failed.push({ ...req, error: error.message });
                }
            } else {
                // Plugin has no CDN source, can't auto-load
                failed.push({ ...req, error: 'No CDN source specified' });
            }
        }
        
        return {
            success: failed.length === 0,
            loaded,
            missing: failed,
            failed
        };
    }

    /**
     * Get all registered plugins with their metadata
     * @returns {Array} Array of plugin metadata objects
     */
    getAllPlugins() {
        const plugins = [];

        for (const [pluginId, pluginClass] of this.pluginClasses.entries()) {
            const metadata = pluginClass.getPluginMetadata();
            const enabled = this.pluginStates.get(pluginId);
            const initialized = this.pluginInstances.has(pluginId);
            const remoteInfo = this.remotePluginInfo.get(pluginId);

            plugins.push({
                ...metadata,
                enabled,
                initialized,
                // Add remote plugin info if available
                source: remoteInfo?.source || (metadata.isDefault ? 'builtin' : 'local'),
                url: remoteInfo?.url || null,
                loadedAt: remoteInfo?.loadedAt || null
            });
        }

        return plugins;
    }

    /**
     * Get all plugin states as a simple map
     * @returns {Object} Map of plugin IDs to enabled status
     */
    getAllPluginStates() {
        const states = {};
        for (const [pluginId, enabled] of this.pluginStates.entries()) {
            states[pluginId] = enabled;
        }
        return states;
    }

    /**
     * Get metadata for a specific plugin
     * @param {string} pluginId - Plugin ID
     * @returns {Object|null} Plugin metadata or null if not found
     */
    getPluginMetadata(pluginId) {
        const pluginClass = this.pluginClasses.get(pluginId);
        if (!pluginClass) {
            return null;
        }

        const metadata = pluginClass.getPluginMetadata();
        const enabled = this.pluginStates.get(pluginId);
        const initialized = this.pluginInstances.has(pluginId);

        return {
            ...metadata,
            enabled,
            initialized
        };
    }

    /**
     * Get all plugins with a specific tag
     * @param {string} tag - Tag to filter by
     * @returns {Array} Array of plugin metadata
     */
    getPluginsByTag(tag) {
        return this.getAllPlugins().filter(plugin =>
            plugin.tags && plugin.tags.includes(tag)
        );
    }

    /**
     * Get all default (non-toggleable) plugins
     * @returns {Array} Array of default plugin metadata
     */
    getDefaultPlugins() {
        return this.getAllPlugins().filter(plugin => plugin.isDefault);
    }

    /**
     * Get all custom (toggleable) plugins
     * @returns {Array} Array of custom plugin metadata
     */
    getCustomPlugins() {
        return this.getAllPlugins().filter(plugin => !plugin.isDefault);
    }

    /**
     * Enable a plugin (doesn't initialize it)
     * @param {string} pluginId - Plugin ID
     * @returns {boolean} Success status
     */
    enablePlugin(pluginId) {
        const metadata = this.getPluginMetadata(pluginId);

        if (!metadata) {
            console.error(`Plugin ${pluginId} not found`);
            return false;
        }

        // Check dependencies
        const depsValid = this.validateDependencies(pluginId);
        if (!depsValid.valid) {
            console.error(`Cannot enable ${pluginId}: Missing dependencies:`, depsValid.missing);
            return false;
        }

        this.pluginStates.set(pluginId, true);
        console.log(`[PluginManager] Enabled plugin: ${pluginId}`);

        // Emit event for plugin state change
        this.eventBus.emit('pluginStateChanged', {
            pluginId,
            enabled: true,
            pluginStates: this.getAllPluginStates()
        });

        return true;
    }

    /**
     * Disable a plugin
     * @param {string} pluginId - Plugin ID
     * @returns {boolean} Success status
     */
    disablePlugin(pluginId) {
        const metadata = this.getPluginMetadata(pluginId);

        if (!metadata) {
            console.error(`Plugin ${pluginId} not found`);
            return false;
        }

        // Cannot disable default plugins
        if (metadata.isDefault) {
            console.error(`Cannot disable default plugin: ${pluginId}`);
            return false;
        }

        // Check if other plugins depend on this one
        const canDisable = this.canDisablePlugin(pluginId);
        if (!canDisable.can) {
            console.error(`Cannot disable ${pluginId}: Required by:`, canDisable.dependents);
            return false;
        }

        this.pluginStates.set(pluginId, false);
        console.log(`[PluginManager] Disabled plugin: ${pluginId}`);

        // Emit event for plugin state change
        this.eventBus.emit('pluginStateChanged', {
            pluginId,
            enabled: false,
            pluginStates: this.getAllPluginStates()
        });

        return true;
    }

    /**
     * Check if a plugin is enabled
     * @param {string} pluginId - Plugin ID
     * @returns {boolean} Enabled status
     */
    isPluginEnabled(pluginId) {
        return this.pluginStates.get(pluginId) || false;
    }

    /**
     * Validate that all dependencies for a plugin are available and enabled
     * @param {string} pluginId - Plugin ID
     * @returns {Object} { valid: boolean, missing: string[] }
     */
    validateDependencies(pluginId) {
        const metadata = this.getPluginMetadata(pluginId);

        if (!metadata || !metadata.dependencies || metadata.dependencies.length === 0) {
            return { valid: true, missing: [] };
        }

        const missing = [];

        for (const depId of metadata.dependencies) {
            if (!this.pluginClasses.has(depId)) {
                missing.push(depId);
            } else if (!this.isPluginEnabled(depId)) {
                missing.push(`${depId} (disabled)`);
            }
        }

        return {
            valid: missing.length === 0,
            missing
        };
    }

    /**
     * Check if a plugin can be safely disabled
     * @param {string} pluginId - Plugin ID
     * @returns {Object} { can: boolean, dependents: string[] }
     */
    canDisablePlugin(pluginId) {
        const metadata = this.getPluginMetadata(pluginId);

        // Default plugins cannot be disabled
        if (metadata && metadata.isDefault) {
            return { can: false, dependents: ['System required'] };
        }

        // Check if other enabled plugins depend on this one
        const dependents = [];

        for (const [otherId, otherClass] of this.pluginClasses.entries()) {
            if (otherId === pluginId) continue;

            const otherMetadata = otherClass.getPluginMetadata();
            const isEnabled = this.isPluginEnabled(otherId);

            if (isEnabled && otherMetadata.dependencies && otherMetadata.dependencies.includes(pluginId)) {
                dependents.push(otherId);
            }
        }

        return {
            can: dependents.length === 0,
            dependents
        };
    }

    /**
     * Get a plugin manifest for host-client synchronization
     * @returns {Object} Plugin manifest with enabled plugins
     */
    getPluginManifest() {
        const enabledPlugins = this.getAllPlugins().filter(p => p.enabled);

        return {
            version: '1.0.0',
            plugins: enabledPlugins.map(p => ({
                id: p.id,
                name: p.name,
                version: p.version,
                type: p.type,
                isDefault: p.isDefault,
                dependencies: p.dependencies
            }))
        };
    }

    /**
     * Validate a plugin manifest from another client
     * @param {Object} manifest - Plugin manifest to validate
     * @returns {Object} { valid: boolean, missing: Array, extra: Array }
     */
    validatePluginManifest(manifest) {
        if (!manifest || !manifest.plugins) {
            return { valid: false, missing: [], extra: [], error: 'Invalid manifest' };
        }

        const ourPlugins = new Set(
            this.getAllPlugins()
                .filter(p => p.enabled)
                .map(p => `${p.id}@${p.version}`)
        );

        const theirPlugins = new Set(
            manifest.plugins.map(p => `${p.id}@${p.version}`)
        );

        const missing = [...theirPlugins].filter(p => !ourPlugins.has(p));
        const extra = [...ourPlugins].filter(p => !theirPlugins.has(p));

        return {
            valid: missing.length === 0 && extra.length === 0,
            missing,
            extra
        };
    }

    /**
     * Apply plugin states from host (for clients)
     * @param {Object} pluginStates - Map of plugin IDs to enabled status
     */
    applyPluginStates(pluginStates) {
        for (const [pluginId, enabled] of Object.entries(pluginStates)) {
            if (this.pluginClasses.has(pluginId)) {
                this.pluginStates.set(pluginId, enabled);
            }
        }
        console.log('[PluginManager] Applied plugin states from host:', pluginStates);
    }

    /**
     * Set the host status for all plugins
     * @param {boolean} isHost - Is this instance the host
     */
    setHost(isHost) {
        this.isHost = isHost;
        this.plugins.forEach(plugin => {
            if (typeof plugin.setHost === 'function') {
                plugin.setHost(isHost);
            }
        });
    }

    /**
     * Set the Peer instance for all plugins
     * @param {Object} peer - PeerJS instance
     */
    setPeer(peer) {
        this.peer = peer;
        this.plugins.forEach(plugin => {
            if (typeof plugin.setPeer === 'function') {
                plugin.setPeer(peer);
            }
        });
    }

    /**
     * Set the event handler for all plugins
     * Allows plugins to register custom event handlers
     * @param {BaseEventHandler} eventHandler - Host or Client event handler instance
     */
    setEventHandler(eventHandler) {
        this.eventHandler = eventHandler;
        this.plugins.forEach(plugin => {
            if (typeof plugin.setEventHandler === 'function') {
                plugin.setEventHandler(eventHandler);
            }
        });
    }

    /**
     * Validate plugin metadata schema
     * @private
     * @param {Object} metadata - Plugin metadata to validate
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    _validateMetadata(metadata) {
        const errors = [];

        if (!metadata.id || typeof metadata.id !== 'string') {
            errors.push('Missing or invalid plugin ID');
        }

        if (!metadata.name || typeof metadata.name !== 'string') {
            errors.push('Missing or invalid plugin name');
        }

        if (!metadata.version || typeof metadata.version !== 'string') {
            errors.push('Missing or invalid plugin version');
        }

        if (!Array.isArray(metadata.tags)) {
            errors.push('Missing or invalid tags array');
        }

        if (typeof metadata.isDefault !== 'boolean') {
            errors.push('Missing or invalid isDefault flag');
        }

        // Dependencies is optional, but if present should be an array of plugin IDs
        if (metadata.dependencies !== undefined && !Array.isArray(metadata.dependencies)) {
            errors.push('Dependencies must be an array of plugin IDs');
        }

        if (!metadata.provides || typeof metadata.provides !== 'object') {
            errors.push('Missing or invalid provides object');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
