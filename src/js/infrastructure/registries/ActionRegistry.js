/**
 * ActionRegistry - Configuration-driven action management system
 *
 * Benefits:
 * - Actions defined declaratively
 * - Easy to conditionally enable/disable actions
 * - Can export configuration to JSON
 * - Single place to see all available actions
 * - Testable in isolation
 */

export default class ActionRegistry {
    constructor() {
        this.actions = new Map();
    }

    /**
     * Register an action
     * @param {string} actionName - Unique name for the action
     * @param {Function} handler - Handler function to execute
     * @param {Object} config - Action configuration
     * @param {string} config.elementId - DOM element ID to bind to
     * @param {string} config.event - Event type (default: 'click')
     * @param {Function} config.condition - Condition function (must return true to enable)
     * @param {string} config.description - Human-readable description
     * @param {number} config.priority - Execution priority (higher = earlier)
     */
    register(actionName, handler, config = {}) {
        if (this.actions.has(actionName)) {
            console.warn(`ActionRegistry: Overwriting existing action: ${actionName}`);
        }

        this.actions.set(actionName, {
            handler,
            elementId: config.elementId,
            event: config.event || 'click',
            condition: config.condition || (() => true),
            description: config.description || '',
            priority: config.priority || 0,
            enabled: true
        });
    }

    /**
     * Unregister an action
     */
    unregister(actionName) {
        return this.actions.delete(actionName);
    }

    /**
     * Enable an action
     */
    enable(actionName) {
        const action = this.actions.get(actionName);
        if (action) {
            action.enabled = true;
        }
    }

    /**
     * Disable an action
     */
    disable(actionName) {
        const action = this.actions.get(actionName);
        if (action) {
            action.enabled = false;
        }
    }

    /**
     * Get an action
     */
    get(actionName) {
        return this.actions.get(actionName);
    }

    /**
     * Check if action is enabled
     */
    isEnabled(actionName) {
        const action = this.actions.get(actionName);
        return action && action.enabled && action.condition();
    }

    /**
     * Bind all registered actions using a listener registry
     * @param {ListenerRegistry} listenerRegistry - Listener registry to use
     * @param {UIBinder} uiBinder - Optional UI binder for element lookup
     */
    bindAll(listenerRegistry, uiBinder = null) {
        let boundCount = 0;

        // Sort actions by priority (higher priority first)
        const sortedActions = Array.from(this.actions.entries())
            .sort(([, a], [, b]) => b.priority - a.priority);

        sortedActions.forEach(([actionName, action]) => {
            // Check if action should be bound
            if (!action.enabled || !action.condition()) {
                console.log(`ActionRegistry: Skipping action ${actionName} (disabled or condition failed)`);
                return;
            }

            // Get element
            let element;
            if (uiBinder) {
                // Try to get from UIBinder first
                element = uiBinder.getButton(actionName) ||
                         uiBinder.getInput(actionName) ||
                         document.getElementById(action.elementId);
            } else {
                element = document.getElementById(action.elementId);
            }

            if (!element) {
                console.warn(`ActionRegistry: Element not found for action ${actionName}: ${action.elementId}`);
                return;
            }

            // Register listener
            listenerRegistry.registerListener(
                action.elementId,
                action.event,
                action.handler
            );

            boundCount++;
        });

        console.log(`ActionRegistry: Bound ${boundCount} of ${this.actions.size} actions`);
        return boundCount;
    }

    /**
     * Bind a specific action
     */
    bind(actionName, listenerRegistry, uiBinder = null) {
        const action = this.actions.get(actionName);
        if (!action) {
            console.warn(`ActionRegistry: Action not found: ${actionName}`);
            return false;
        }

        if (!action.enabled || !action.condition()) {
            console.log(`ActionRegistry: Action ${actionName} not bound (disabled or condition failed)`);
            return false;
        }

        // Get element
        let element;
        if (uiBinder) {
            element = uiBinder.getButton(actionName) ||
                     uiBinder.getInput(actionName) ||
                     document.getElementById(action.elementId);
        } else {
            element = document.getElementById(action.elementId);
        }

        if (!element) {
            console.warn(`ActionRegistry: Element not found for action ${actionName}: ${action.elementId}`);
            return false;
        }

        // Register listener
        listenerRegistry.registerListener(
            action.elementId,
            action.event,
            action.handler
        );

        return true;
    }

    /**
     * Get all registered action names
     */
    getActionNames() {
        return Array.from(this.actions.keys());
    }

    /**
     * Get all actions with their metadata
     */
    getAllActions() {
        return Array.from(this.actions.entries()).map(([name, action]) => ({
            name,
            elementId: action.elementId,
            event: action.event,
            description: action.description,
            priority: action.priority,
            enabled: action.enabled,
            conditionMet: action.condition()
        }));
    }

    /**
     * Clear all actions
     */
    clear() {
        this.actions.clear();
    }

    /**
     * Get count of registered actions
     */
    size() {
        return this.actions.size;
    }

    /**
     * Export configuration as JSON
     */
    toJSON() {
        return Array.from(this.actions.entries()).map(([name, action]) => ({
            name,
            elementId: action.elementId,
            event: action.event,
            description: action.description,
            priority: action.priority,
            enabled: action.enabled
        }));
    }
}
