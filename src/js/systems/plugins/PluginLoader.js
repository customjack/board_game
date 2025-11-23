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
