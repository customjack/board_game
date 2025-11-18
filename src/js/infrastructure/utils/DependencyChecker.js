/**
 * DependencyChecker - Validates plugin and map dependencies
 *
 * Checks if required plugins/effects/actions are available before loading
 */

export default class DependencyChecker {
    /**
     * Check if all dependencies are met for a plugin or map
     * @param {Object} item - Plugin metadata or map data
     * @param {PluginManager} pluginManager - Plugin manager instance
     * @param {FactoryManager} factoryManager - Factory manager instance
     * @returns {Object} { valid: boolean, missing: {plugins: [], effects: [], actions: [], triggers: []} }
     */
    static checkDependencies(item, pluginManager, factoryManager) {
        const dependencies = item.dependencies || {};
        const missing = {
            plugins: [],
            effects: [],
            actions: [],
            triggers: []
        };

        // Check plugin dependencies
        if (dependencies.plugins && Array.isArray(dependencies.plugins)) {
            dependencies.plugins.forEach(pluginId => {
                if (!pluginManager.isPluginRegistered(pluginId)) {
                    missing.plugins.push(pluginId);
                }
            });
        }

        // Check effect dependencies
        if (dependencies.effects && Array.isArray(dependencies.effects)) {
            const effectFactory = factoryManager.getFactory('EffectFactory');
            if (effectFactory) {
                dependencies.effects.forEach(effectType => {
                    if (!effectFactory.isRegistered(effectType)) {
                        missing.effects.push(effectType);
                    }
                });
            }
        }

        // Check action dependencies
        if (dependencies.actions && Array.isArray(dependencies.actions)) {
            const actionFactory = factoryManager.getFactory('ActionFactory');
            if (actionFactory) {
                dependencies.actions.forEach(actionType => {
                    if (!actionFactory.isRegistered(actionType)) {
                        missing.actions.push(actionType);
                    }
                });
            }
        }

        // Check trigger dependencies
        if (dependencies.triggers && Array.isArray(dependencies.triggers)) {
            const triggerFactory = factoryManager.getFactory('TriggerFactory');
            if (triggerFactory) {
                dependencies.triggers.forEach(triggerType => {
                    if (!triggerFactory.isRegistered(triggerType)) {
                        missing.triggers.push(triggerType);
                    }
                });
            }
        }

        const totalMissing = missing.plugins.length + missing.effects.length +
                            missing.actions.length + missing.triggers.length;

        return {
            valid: totalMissing === 0,
            missing
        };
    }

    /**
     * Format missing dependencies as a human-readable message
     * @param {Object} missing - Missing dependencies object from checkDependencies
     * @returns {string} Formatted message
     */
    static formatMissingDependencies(missing) {
        const messages = [];

        if (missing.plugins.length > 0) {
            messages.push(`Plugins: ${missing.plugins.join(', ')}`);
        }
        if (missing.effects.length > 0) {
            messages.push(`Effects: ${missing.effects.join(', ')}`);
        }
        if (missing.actions.length > 0) {
            messages.push(`Actions: ${missing.actions.join(', ')}`);
        }
        if (missing.triggers.length > 0) {
            messages.push(`Triggers: ${missing.triggers.join(', ')}`);
        }

        if (messages.length === 0) {
            return 'No missing dependencies';
        }

        return 'Missing dependencies:\n' + messages.join('\n');
    }

    /**
     * Check map dependencies by scanning spaces for used effects/actions
     * @param {Object} mapData - Board JSON data
     * @param {FactoryManager} factoryManager - Factory manager instance
     * @returns {Object} { valid: boolean, missing: {effects: [], actions: [], triggers: []} }
     */
    static checkMapDependencies(mapData, factoryManager) {
        const missing = {
            effects: new Set(),
            actions: new Set(),
            triggers: new Set()
        };

        const actionFactory = factoryManager.getFactory('ActionFactory');
        const effectFactory = factoryManager.getFactory('EffectFactory');
        const triggerFactory = factoryManager.getFactory('TriggerFactory');

        const spaces = Array.isArray(mapData?.board?.topology?.spaces)
            ? mapData.board.topology.spaces
            : Array.isArray(mapData?.spaces)
                ? mapData.spaces
                : [];

        // Scan all spaces for triggers
        spaces.forEach(space => {
            if (space.triggers && Array.isArray(space.triggers)) {
                space.triggers.forEach(trigger => {
                        // Check trigger type
                        if (trigger.when && trigger.when.type) {
                            if (triggerFactory && !triggerFactory.isRegistered(trigger.when.type)) {
                                missing.triggers.add(trigger.when.type);
                            }
                        }

                        // Check action type
                        if (trigger.action && trigger.action.type) {
                            if (actionFactory && !actionFactory.isRegistered(trigger.action.type)) {
                                missing.actions.add(trigger.action.type);
                            }

                            // Check for APPLY_EFFECT action's effect types
                            if (trigger.action.type === 'APPLY_EFFECT' && trigger.action.payload) {
                                const effectType = trigger.action.payload.effect?.type;
                                if (effectType && effectFactory && !effectFactory.isRegistered(effectType)) {
                                    missing.effects.add(effectType);
                                }
                            }
                        }
                    });
            }
        });

        // Convert Sets to Arrays
        const result = {
            effects: Array.from(missing.effects),
            actions: Array.from(missing.actions),
            triggers: Array.from(missing.triggers)
        };

        const totalMissing = result.effects.length + result.actions.length + result.triggers.length;

        return {
            valid: totalMissing === 0,
            missing: result
        };
    }
}
