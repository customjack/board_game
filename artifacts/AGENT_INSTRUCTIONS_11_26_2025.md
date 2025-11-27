# Agent Instructions

## General instructions
1. Make frequent git commits along the way so we can checkpoint the work.
2. To avoid spending many tokens, avoid sending back large amounts of text to me. I.e. be concise. Your tokens should mostly be spent on coding.

## Goal
Currently we have a plugin framework setup for our board game website. However, it is not capable of loading remote plugins currently. We need to fix that. Our goal is to make plugins loadable remotely and test the implimentation by ceasing to load our trouble nad example plugins locally and instead set up a way to load them remotely. The plugins should probably be packaged into ES modules for efficient transfer and loading.

## Inputs
The whole project. Please read through everything in the project /src and /tests to get an idea of how the project works. The project is a raw javascript project built with webpack. We don't use any frameworks.

In particular we want to make plugins out of the example plugin and trouble plugin that we can load from a remote source (eventually github, for now we can set up a dev CDN we can pull it from).

Make sure to read the plugin management modals that already exist and adapt into that, keeping in line with the framework.

## Outputs
A project that allows us to load remote plugins into our game.

## Constraints
Make sure you follow the patterns we've already setup. When able, try to use abstraction and use our already made abstract classes for things we've done before.

Things that the edits must be capable of:
1. Adding new remote plugins in the plugin manager. These will be cached in local storage so the user doesn't have to load them every time.
2. The ability to remove added remote plugins from the cache so they're not longer loaded.
3. The map files should list what plugins they depend on. They should also list a CDN source in which to get each plugin. 
4. If the host loads a map in which they don't have the plugin, it should automaticaly go to a modal where it says it's loading the plugin(s). Similarly, if the host loads a map that the client doesn't have the plugin for, the client will get a modal that says they're loading these plugins.
5. Every user should have a personal setting for whether they automatically load plugins or not (by default, this setting will be set to true). If this setting is false, they still get the modal that they need plugins, they just must confirm.
6. The host should not be able to start the game unless all clients have verified they have the plugin. The host should somehow be made aware of which players do not have the required plugins. This allows them to make the choice to kick them or not.


## Process
0. Read through the repository to get an idea of how everything works. Particuarly /src and /tests are most important.
1. Make sure all boards have a plugin depdency list where we list each plugin, the CDN to get them, and any other relevant plugin information.
2. Start by making the plugin manager. It may already exist in some form. We want to link it's callbacks into the add plugin modal.
3. Add the caching of plugins to local storage.
4. Add the ability to remove cached plugins into the plugin manager. One should not be able to remove the core plugin. The plugin manager should display information about each plugin; it's description, source, etc.
5. Impliment this logic into the personal settings:
"Every user should have a personal setting for whether they automatically load plugins or not (by default, this setting will be set to true). If this setting is false, they still get the modal that they need plugins, they just must confirm."
6. Impliment this logic into the lobby state stuff, in additional to the personal settings choice in step 5.
"If the host loads a map in which they don't have the plugin, it should automaticaly go to a modal where it says it's loading the plugin(s). Similarly, if the host loads a map that the client doesn't have the plugin for, the client will get a modal that says they're loading these plugins."
7. Once the plugin manager is made, set up a local CDN that we can use with a npm run command. This will host the plugins and provide a link that we can enter into the add plugin modal.
 

## Examples

Here is an example plugin load from a different project. We do not want to simply copy this, but this will give an idea of the type of framework I'm imagining

```js
export default class PluginLoader {
  constructor({ registryManager, baseClasses }) {
    this.registryManager = registryManager;
    this.baseClasses = baseClasses;
  }

  /**
   * Load a plugin using PluginInfo configuration
   * @param {PluginInfo} pluginInfo - Plugin configuration object
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<Object>} Load result with newNames and method
   */
  async loadPlugin(pluginInfo, timeoutMs = 15000) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      // Fetch the plugin source as text
      const response = await fetch(pluginInfo.url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const codeStr = await response.text();

      let result;
      // Choose loading method based on pluginInfo.loadMethod
      switch (pluginInfo.loadMethod) {
        case 'eval':
          result = await this._loadViaEval(codeStr, pluginInfo);
          break;
        case 'ES':
        case 'module':
          result = await this._loadViaModule(codeStr, pluginInfo);
          break;
        case 'script':
          result = await this._loadViaScript(codeStr, pluginInfo);
          break;
        default:
          throw new Error(`Unknown loading method: ${pluginInfo.loadMethod}`);
      }

      // Return successful result
      return {
        pluginInfo,
        success: true,
        error: null,
        newNames: result.newNames,
        method: result.method,
      };
    } catch (err) {
      console.error(`Failed to load plugin ${pluginInfo.name} (${pluginInfo.id}) from ${pluginInfo.url}:`, err);
      // Return failure info instead of throwing
      return {
        pluginInfo,
        success: false,
        error: err.message || String(err),
        newNames: [],
        method: pluginInfo.loadMethod || null,
      };
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use loadPlugin(pluginInfo) instead
   */
  async loadPluginFromUrl(url, timeoutMs = 15000, method = 'eval') {
    const pluginInfo = {
      id: `legacy-${Date.now()}`,
      name: 'Legacy Plugin',
      url,
      loaded: false,
      loadOnStartup: false,
      loadMethod: method
    };
    return this.loadPlugin(pluginInfo, timeoutMs);
  }

  async _loadViaEval(codeStr, pluginInfo) {
    // Evaluate the bundle code globally
    // eslint-disable-next-line no-eval
    (0, eval)(codeStr); // indirect eval to run in global scope

    // Expect the plugin bundle to expose the registration function globally
    if (typeof window.PluginRegister !== 'function') {
      throw new Error('Plugin bundle did not expose a global registration function "PluginRegister"');
    }

    const figureRegistry = this.registryManager.get('figures');
    const beforeNames = figureRegistry.getNames();

    // Call the registration function with your registry and baseClasses
    await window.PluginRegister({
      registry: figureRegistry,
      baseClasses: this.baseClasses,
    });

    const afterNames = figureRegistry.getNames();
    const newNames = afterNames.filter(name => !beforeNames.includes(name));

    console.log(`Figures Registered From Plugin ${pluginInfo.name}:`, newNames);
    console.debug(`Successfully loaded plugin ${pluginInfo.name} (${pluginInfo.id}) from ${pluginInfo.url} via eval`);

    // Clean up global pollution
    delete window.PluginRegister;

    return { newNames, method: 'eval', pluginInfo };
  }

  async _loadViaModule(codeStr, pluginInfo) {
    // Create a blob URL for the module
    const blob = new Blob([codeStr], { type: 'application/javascript' });
    const moduleUrl = URL.createObjectURL(blob);

    try {
      // Import as ES module
      const module = await import(/* webpackIgnore: true */ moduleUrl);
      
      // Expect the module to have a default export function
      if (typeof module.default !== 'function') {
        throw new Error('Plugin module must have a default export function');
      }

      const figureRegistry = this.registryManager.get('figures');
      const beforeNames = figureRegistry.getNames();

      // Call the registration function
      await module.default({
        registry: figureRegistry,
        baseClasses: this.baseClasses,
      });

      const afterNames = figureRegistry.getNames();
      const newNames = afterNames.filter(name => !beforeNames.includes(name));

      console.log(`Figures Registered From Plugin ${pluginInfo.name}:`, newNames);
      console.debug(`Successfully loaded plugin ${pluginInfo.name} (${pluginInfo.id}) from ${pluginInfo.url} via ES module`);

      return { newNames, method: 'ES', pluginInfo };
    } finally {
      // Clean up the blob URL
      URL.revokeObjectURL(moduleUrl);
    }
  }

  async _loadViaScript(codeStr, pluginInfo) {
    return new Promise((resolve, reject) => {
      // Create a unique callback name to avoid conflicts
      const callbackName = `PluginRegister_${pluginInfo.id.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
      
      // Wrap the plugin code to expose registration via callback
      const wrappedCode = `
        (function() {
          ${codeStr}
          
          // Expose the registration function via our callback
          if (typeof PluginRegister === 'function') {
            window.${callbackName} = PluginRegister;
          } else if (typeof window.PluginRegister === 'function') {
            window.${callbackName} = window.PluginRegister;
          } else {
            throw new Error('Plugin did not expose a PluginRegister function');
          }
        })();
      `;

      // Create and inject script element
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.textContent = wrappedCode;

      script.onload = async () => {
        try {
          // Check if our callback was set
          if (typeof window[callbackName] !== 'function') {
            throw new Error('Plugin script did not expose registration function');
          }

          const figureRegistry = this.registryManager.get('figures');
          const beforeNames = figureRegistry.getNames();

          // Call the registration function
          await window[callbackName]({
            registry: figureRegistry,
            baseClasses: this.baseClasses,
          });

          const afterNames = figureRegistry.getNames();
          const newNames = afterNames.filter(name => !beforeNames.includes(name));

          console.log(`Figures Registered From Plugin ${pluginInfo.name}:`, newNames);
          console.debug(`Successfully loaded plugin ${pluginInfo.name} (${pluginInfo.id}) from ${pluginInfo.url} via script injection`);

          // Clean up
          delete window[callbackName];
          delete window.PluginRegister; // Clean up if it was set globally
          document.head.removeChild(script);

          resolve({ newNames, method: 'script', pluginInfo });
        } catch (error) {
          // Clean up on error
          delete window[callbackName];
          delete window.PluginRegister;
          if (script.parentNode) {
            document.head.removeChild(script);
          }
          reject(error);
        }
      };

      script.onerror = (error) => {
        // Clean up on error
        delete window[callbackName];
        delete window.PluginRegister;
        if (script.parentNode) {
          document.head.removeChild(script);
        }
        reject(new Error(`Script injection failed for plugin ${pluginInfo.name}: ${error.message || 'Unknown error'}`));
      };

      // Append to head to execute
      document.head.appendChild(script);
    });
  }

  /**
   * Load multiple plugins from PluginInfo objects, reporting detailed results
   * @param {PluginInfo[]} pluginInfos
   * @param {number} timeoutMs
   * @returns {Promise<Array>} Array of load results (success, errors, newNames, etc)
   */
  async loadPlugins(pluginInfos = [], timeoutMs = 15000) {
    const results = [];
    for (const pluginInfo of pluginInfos) {
      const result = await this.loadPlugin(pluginInfo, timeoutMs);
      results.push(result);
    }
    return results;
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use loadPlugins(pluginInfos) instead
   */
  async loadPluginsFromUrls(urls = [], timeoutMs = 15000, method = 'eval') {
    const pluginInfos = urls.map((url, index) => ({
      id: `legacy-${Date.now()}-${index}`,
      name: `Legacy Plugin ${index + 1}`,
      url,
      loaded: false,
      loadOnStartup: false,
      loadMethod: method
    }));
    return this.loadPlugins(pluginInfos, timeoutMs);
  }

  /**
   * Load a plugin with fallback methods
   * @param {PluginInfo} pluginInfo - Plugin configuration
   * @param {number} timeoutMs - Timeout in milliseconds  
   * @param {string[]} fallbackMethods - Methods to try in order
   * @returns {Promise<Object>} Load result
   */
  async loadPluginWithFallback(pluginInfo, timeoutMs = 15000, fallbackMethods = ['ES', 'eval', 'script']) {
    let lastError = null;
    const originalMethod = pluginInfo.loadMethod || 'ES';

    const methodsToTry = [originalMethod, ...fallbackMethods.filter(m => m !== originalMethod)];

    for (const method of methodsToTry) {
      const modPluginInfo = { ...pluginInfo, loadMethod: method };
      const result = await this.loadPlugin(modPluginInfo, timeoutMs);

      if (result.success) {
        return result; // success, stop trying
      } else {
        lastError = result.error;
        console.warn(`Failed to load plugin ${pluginInfo.name} via ${method}:`, lastError);
      }
    }

    return {
      pluginInfo,
      success: false,
      error: `All methods failed. Last error: ${lastError}`,
      newNames: [],
      method: null,
    };
  }

  /**
   * Legacy method - now returns PluginInfo objects instead of simple URLs
   * @deprecated Consider using a proper plugin management system
   */
  addPluginUrl(url, currentPluginUrls = []) {
    const urlsSet = new Set(currentPluginUrls);
    urlsSet.add(url);
    return [...urlsSet];
  }
}
```

```js
export default class PluginManagementService {
  constructor(pluginLoader, storageManager) {
    this.pluginLoader = pluginLoader;
    this.storageManager = storageManager;
    this.plugins = [];
    this.loading = false;
    this.listeners = new Set();

    this.loadingTimeoutMs = 0;
    this.loadingStartTime = 0;
    this.loadingTimeoutId = null;
  }

  addListener(listener) {
    this.listeners.add(listener);
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener =>
      listener({
        plugins: this.getPlugins(),
        loading: this.isLoading(),
        loadingRemainingMs: this.getLoadingRemainingMs(),
      })
    );
  }

  getPlugins() {
    return [...this.plugins];
  }

  isLoading() {
    return this.loading;
  }

  setLoading(loading, timeoutMs = 0) {
    this.loading = loading;
    if (loading) {
      this.loadingTimeoutMs = timeoutMs;
      this.loadingStartTime = Date.now();

      if (this.loadingTimeoutId) clearTimeout(this.loadingTimeoutId);
      if (timeoutMs > 0) {
        this.loadingTimeoutId = setTimeout(() => {
          this.loadingTimeoutId = null;
          this.setLoading(false);
        }, timeoutMs);
      }
    } else {
      this.loadingTimeoutMs = 0;
      this.loadingStartTime = 0;
      if (this.loadingTimeoutId) {
        clearTimeout(this.loadingTimeoutId);
        this.loadingTimeoutId = null;
      }
    }
    this.notifyListeners();
  }

  getLoadingRemainingMs() {
    if (!this.loading || !this.loadingTimeoutMs) return 0;
    const elapsed = Date.now() - this.loadingStartTime;
    const remaining = this.loadingTimeoutMs - elapsed;
    return remaining > 0 ? remaining : 0;
  }

  async initialize(defaultPlugins = []) {
    this.setLoading(true, 15000);
    try {
      const savedPlugins = this.storageManager.loadPlugins(defaultPlugins);
      const pluginsForStartup = savedPlugins.filter(p => p.loadOnStartup);
      this.plugins = [...savedPlugins];
      if (pluginsForStartup.length > 0) {
        await this.loadPluginsBatch(pluginsForStartup);
      }
    } catch (e) {
      console.error('Error initializing plugins:', e);
    }
    this.setLoading(false);
  }

  async loadPluginsBatch(pluginsToLoad) {
    if (!pluginsToLoad || pluginsToLoad.length === 0) return [];

    this.setLoading(true, 15000);
    try {
      const results = await this.pluginLoader.loadPlugins(pluginsToLoad);

      this.plugins = this.plugins.map(plugin => {
        const result = results.find(r => r.pluginInfo.id === plugin.id);
        if (result) {
          return {
            ...plugin,
            loaded: result.success,
            loadMethod: result.success ? result.method : plugin.loadMethod,
            newFigures: result.success ? result.newNames : [],
            lastError: result.success ? null : result.error,
          };
        }
        return plugin;
      });

      results.forEach(result => {
        if (result.success) {
          console.log(`Loaded plugin: ${result.pluginInfo.name} (${result.newNames.length} figures)`);
        } else {
          console.warn(`Failed to load plugin: ${result.pluginInfo.name} - ${result.error}`);
        }
      });

      this.notifyListeners();
      return results;
    } catch (e) {
      console.error('Error loading plugins batch:', e);
      this.plugins = this.plugins.map(plugin => ({
        ...plugin,
        loaded: pluginsToLoad.some(p => p.id === plugin.id) ? false : plugin.loaded,
        newFigures: [],
        lastError: pluginsToLoad.some(p => p.id === plugin.id) ? e.message : plugin.lastError,
      }));
      this.notifyListeners();
      throw e;
    } finally {
      this.setLoading(false);
    }
  }

  async addPlugin(pluginInfo, loadImmediately = true) {
    if (!pluginInfo || !pluginInfo.url) {
      throw new Error('Plugin info must include a URL');
    }

    const fullPluginInfo = {
      id: pluginInfo.id || `plugin-${Date.now()}`,
      name: pluginInfo.name || 'Unnamed Plugin',
      url: pluginInfo.url,
      description: pluginInfo.description || '',
      loaded: false,
      loadOnStartup: pluginInfo.loadOnStartup ?? true,
      loadMethod: pluginInfo.loadMethod || 'ES',
      metadata: pluginInfo.metadata || {},
      newFigures: [],
      lastError: null,
      ...pluginInfo,
    };

    if (this.plugins.find(p => p.url === fullPluginInfo.url)) {
      throw new Error('Plugin URL already exists');
    }

    if (loadImmediately) {
      this.setLoading(true, 15000);
      try {
        const result = await this.pluginLoader.loadPluginWithFallback(
          fullPluginInfo,
          15000,
          ['ES', 'eval', 'script']
        );

        this.setLoading(false);

        if (result.success) {
          // Only add plugin if loading succeeded
          const newPlugin = {
            ...fullPluginInfo,
            loaded: true,
            loadMethod: result.method,
            newFigures: result.newNames,
            lastError: null,
          };

          console.log(`Loaded plugin: ${newPlugin.name} via ${result.method} (${result.newNames.length} figures)`);

          this.plugins.push(newPlugin);
          this.storageManager.savePlugins(this.plugins);
          return result;
        } else {
          // Loading failed, do not add plugin, just return failure info
          console.warn(`Plugin loading failed for ${fullPluginInfo.name}: ${result.error}`);
          return result;
        }
      } catch (e) {
        this.setLoading(false);
        console.error(`Failed to load plugin ${fullPluginInfo.name}:`, e);
        return {
          success: false,
          error: e.message || String(e),
          newNames: [],
          method: null,
          pluginInfo: fullPluginInfo,
        };
      }
    } else {
      // If not loading immediately, just add plugin info as-is
      this.plugins.push(fullPluginInfo);
      this.storageManager.savePlugins(this.plugins);
      this.notifyListeners();
      return { success: true };
    }
  }


  removePlugin(pluginId) {
    if (!pluginId) return false;
    const initialLength = this.plugins.length;
    this.plugins = this.plugins.filter(p => p.id !== pluginId);
    if (this.plugins.length < initialLength) {
      this.storageManager.savePlugins(this.plugins);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  async loadPlugin(pluginId) {
    const plugin = this.plugins.find(p => p.id === pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} not found`);
    }

    this.setLoading(true, 15000);
    try {
      const result = await this.pluginLoader.loadPluginWithFallback(
        plugin,
        15000,
        ['ES', 'eval', 'script']
      );

      console.log(`Manually loaded plugin: ${plugin.name} via ${result.method} (${result.newNames.length} figures)`);

      this.plugins = this.plugins.map(p =>
        p.id === pluginId
          ? {
              ...p,
              loaded: true,
              loadMethod: result.method,
              newFigures: result.newNames,
              lastError: null,
            }
          : p
      );

      this.storageManager.savePlugins(this.plugins);
      this.setLoading(false);
      return result;
    } catch (e) {
      console.error(`Failed to load plugin ${plugin.name}:`, e);

      this.plugins = this.plugins.map(p =>
        p.id === pluginId
          ? {
              ...p,
              loaded: false,
              newFigures: [],
              lastError: e.message || String(e),
            }
          : p
      );

      this.setLoading(false);
      throw e;
    }
  }

  async reloadStartupPlugins() {
    const pluginsForReload = this.plugins.filter(p => p.loadOnStartup);
    if (pluginsForReload.length === 0) return [];

    this.setLoading(true, 15000);
    try {
      const results = await this.loadPluginsBatch(pluginsForReload);
      this.storageManager.savePlugins(this.plugins);
      return results;
    } finally {
      this.setLoading(false);
    }
  }

  updatePlugin(pluginId, updates) {
    const pluginIndex = this.plugins.findIndex(p => p.id === pluginId);
    if (pluginIndex === -1) return false;

    this.plugins[pluginIndex] = {
      ...this.plugins[pluginIndex],
      ...updates,
    };

    this.storageManager.savePlugins(this.plugins);
    this.notifyListeners();
    return true;
  }

  getPlugin(pluginId) {
    return this.plugins.find(p => p.id === pluginId) || null;
  }

  getLoadedPlugins() {
    return this.plugins.filter(p => p.loaded);
  }

  getFailedPlugins() {
    return this.plugins.filter(p => p.loadOnStartup && !p.loaded);
  }

  clearPlugins() {
    this.plugins = [];
    this.storageManager.clearPlugins();
    this.notifyListeners();
    return true;
  }

  async resetToDefault(defaultPlugins = []) {
    this.setLoading(true, 15000);
    try {
      this.plugins = [...defaultPlugins];
      const pluginsForStartup = defaultPlugins.filter(p => p.loadOnStartup);
      if (pluginsForStartup.length > 0) {
        await this.loadPluginsBatch(pluginsForStartup);
      }
      this.storageManager.savePlugins(this.plugins);
    } finally {
      this.setLoading(false);
    }
  }

  async importPlugins(pluginsArray) {
    if (!Array.isArray(pluginsArray)) {
      throw new Error('Invalid plugins array');
    }

    this.setLoading(true, 15000);
    try {
      this.plugins = [...pluginsArray];
      const pluginsForStartup = pluginsArray.filter(p => p.loadOnStartup);
      if (pluginsForStartup.length > 0) {
        await this.loadPluginsBatch(pluginsForStartup);
      }
      this.storageManager.savePlugins(this.plugins);
    } finally {
      this.setLoading(false);
    }
  }

  exportPlugins() {
    return this.plugins.map(plugin => ({
      ...plugin,
      loaded: false,
    }));
  }

  getStatistics() {
    const total = this.plugins.length;
    const loaded = this.plugins.filter(p => p.loaded).length;
    const failed = this.plugins.filter(p => p.loadOnStartup && !p.loaded).length;
    const startup = this.plugins.filter(p => p.loadOnStartup).length;

    return {
      total,
      loaded,
      failed,
      startup,
      loadedPercentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
    };
  }
}
```
