/**
 * UIComponentRegistry - Manages UI component registration and instantiation
 *
 * Central registry for all UI components. Handles:
 * - Component class registration
 * - Component instantiation from specs
 * - Component lifecycle management
 * - Component discovery
 */
export default class UIComponentRegistry {
    constructor() {
        // Map of component ID -> component definition
        this.components = new Map();

        // Map of instance ID -> component instance
        this.instances = new Map();

        // Counter for generating unique instance IDs
        this.instanceCounter = 0;
    }

    /**
     * Register a component class
     * @param {string} id - Component identifier
     * @param {class} ComponentClass - Component class constructor
     * @param {Object} metadata - Component metadata
     * @param {string} metadata.displayName - Human-readable name
     * @param {string} metadata.description - Component description
     * @param {string} metadata.category - Component category
     * @param {string[]} metadata.tags - Component tags
     * @param {boolean} metadata.isDefault - Whether this is a default component
     */
    registerComponentClass(id, ComponentClass, metadata = {}) {
        if (this.components.has(id)) {
            console.warn(`[UIComponentRegistry] Component '${id}' already registered, overwriting`);
        }

        this.components.set(id, {
            id,
            class: ComponentClass,
            metadata: {
                displayName: metadata.displayName || id,
                description: metadata.description || '',
                category: metadata.category || 'general',
                tags: metadata.tags || [],
                isDefault: metadata.isDefault || false,
                ...metadata
            },
            instances: []
        });

        console.log(`[UIComponentRegistry] Registered component: ${id}`);
    }

    /**
     * Unregister a component class
     * @param {string} id - Component identifier
     */
    unregisterComponentClass(id) {
        if (!this.components.has(id)) {
            console.warn(`[UIComponentRegistry] Cannot unregister unknown component: ${id}`);
            return;
        }

        // Destroy all instances of this component
        const entry = this.components.get(id);
        entry.instances.forEach(instanceId => {
            this.destroyInstance(instanceId);
        });

        this.components.delete(id);
        console.log(`[UIComponentRegistry] Unregistered component: ${id}`);
    }

    /**
     * Check if a component is registered
     * @param {string} id - Component identifier
     * @returns {boolean} True if component is registered
     */
    hasComponent(id) {
        return this.components.has(id);
    }

    /**
     * Get component metadata
     * @param {string} id - Component identifier
     * @returns {Object|null} Component metadata or null if not found
     */
    getComponentMetadata(id) {
        const entry = this.components.get(id);
        return entry ? entry.metadata : null;
    }

    /**
     * Create a component instance from a specification
     * @param {UIComponentSpec} spec - Component specification
     * @param {Object} context - Creation context
     * @param {EventBus} context.eventBus - Event bus
     * @param {GameState} context.gameState - Game state
     * @param {Object} context.additionalProps - Additional properties to pass
     * @returns {Object|null} Component instance or null if creation failed
     */
    createComponent(spec, context) {
        if (!this.components.has(spec.id)) {
            console.error(`[UIComponentRegistry] Cannot create unknown component: ${spec.id}`);
            return null;
        }

        const entry = this.components.get(spec.id);
        const ComponentClass = entry.class;

        try {
            // Merge spec config with context
            const componentConfig = {
                ...spec.config,
                eventBus: context.eventBus,
                gameState: context.gameState,
                ...(context.additionalProps || {})
            };

            // Create instance
            const instance = new ComponentClass(componentConfig);

            // Initialize if the component has an init method
            if (typeof instance.init === 'function') {
                instance.init();
            }

            // Generate unique instance ID
            const instanceId = `${spec.id}-${this.instanceCounter++}`;

            // Store instance
            this.instances.set(instanceId, {
                id: instanceId,
                componentId: spec.id,
                spec,
                instance,
                context,
                createdAt: Date.now()
            });

            // Add to component's instance list
            entry.instances.push(instanceId);

            console.log(`[UIComponentRegistry] Created component instance: ${instanceId}`);

            return instance;
        } catch (error) {
            console.error(`[UIComponentRegistry] Failed to create component '${spec.id}':`, error);
            return null;
        }
    }

    /**
     * Get or create a component instance
     * If an instance already exists for the given spec ID, return it
     * Otherwise, create a new instance
     * @param {string} componentId - Component identifier
     * @param {Object} context - Creation context (only used if creating new instance)
     * @returns {Object|null} Component instance or null
     */
    getOrCreateComponent(componentId, context) {
        // Check if instance already exists
        const existingInstance = this.findInstanceByComponentId(componentId);
        if (existingInstance) {
            return existingInstance.instance;
        }

        // Create new instance with minimal spec
        const spec = {
            id: componentId,
            config: {}
        };

        return this.createComponent(spec, context);
    }

    /**
     * Find an instance by component ID
     * @param {string} componentId - Component identifier
     * @returns {Object|null} Instance entry or null
     */
    findInstanceByComponentId(componentId) {
        for (const [_, entry] of this.instances) {
            if (entry.componentId === componentId) {
                return entry;
            }
        }
        return null;
    }

    /**
     * Get a component instance by instance ID
     * @param {string} instanceId - Instance identifier
     * @returns {Object|null} Component instance or null
     */
    getInstance(instanceId) {
        const entry = this.instances.get(instanceId);
        return entry ? entry.instance : null;
    }

    /**
     * Get all instances of a specific component type
     * @param {string} componentId - Component identifier
     * @returns {Object[]} Array of component instances
     */
    getInstancesByType(componentId) {
        const instances = [];
        for (const [_, entry] of this.instances) {
            if (entry.componentId === componentId) {
                instances.push(entry.instance);
            }
        }
        return instances;
    }

    /**
     * Destroy a component instance
     * @param {string} instanceId - Instance identifier
     */
    destroyInstance(instanceId) {
        const entry = this.instances.get(instanceId);
        if (!entry) {
            console.warn(`[UIComponentRegistry] Cannot destroy unknown instance: ${instanceId}`);
            return;
        }

        // Call cleanup method if available
        if (entry.instance && typeof entry.instance.cleanup === 'function') {
            try {
                entry.instance.cleanup();
            } catch (error) {
                console.error(`[UIComponentRegistry] Error cleaning up instance ${instanceId}:`, error);
            }
        }

        // Remove from component's instance list
        const componentEntry = this.components.get(entry.componentId);
        if (componentEntry) {
            const index = componentEntry.instances.indexOf(instanceId);
            if (index !== -1) {
                componentEntry.instances.splice(index, 1);
            }
        }

        // Remove from instances map
        this.instances.delete(instanceId);

        console.log(`[UIComponentRegistry] Destroyed component instance: ${instanceId}`);
    }

    /**
     * Destroy all instances
     */
    destroyAllInstances() {
        const instanceIds = Array.from(this.instances.keys());
        instanceIds.forEach(id => this.destroyInstance(id));
    }

    /**
     * Get all registered component IDs
     * @returns {string[]} Array of component IDs
     */
    getAllComponentIds() {
        return Array.from(this.components.keys());
    }

    /**
     * Get all registered components with metadata
     * @returns {Object[]} Array of component info objects
     */
    getAllComponents() {
        const components = [];
        for (const [id, entry] of this.components) {
            components.push({
                id,
                metadata: entry.metadata,
                instanceCount: entry.instances.length
            });
        }
        return components;
    }

    /**
     * Search for components by criteria
     * @param {Object} criteria - Search criteria
     * @param {string} criteria.category - Filter by category
     * @param {string[]} criteria.tags - Filter by tags (component must have all tags)
     * @param {string} criteria.query - Text search in name/description
     * @returns {Object[]} Array of matching component info objects
     */
    searchComponents(criteria = {}) {
        let results = this.getAllComponents();

        // Filter by category
        if (criteria.category) {
            results = results.filter(c => c.metadata.category === criteria.category);
        }

        // Filter by tags
        if (criteria.tags && criteria.tags.length > 0) {
            results = results.filter(c => {
                return criteria.tags.every(tag => c.metadata.tags.includes(tag));
            });
        }

        // Text search
        if (criteria.query) {
            const query = criteria.query.toLowerCase();
            results = results.filter(c => {
                const name = c.metadata.displayName.toLowerCase();
                const desc = c.metadata.description.toLowerCase();
                return name.includes(query) || desc.includes(query);
            });
        }

        return results;
    }

    /**
     * Get statistics about the registry
     * @returns {Object} Registry statistics
     */
    getStats() {
        return {
            totalComponents: this.components.size,
            totalInstances: this.instances.size,
            componentsByCategory: this.getComponentsByCategory()
        };
    }

    /**
     * Get components grouped by category
     * @returns {Object} Object mapping category -> component count
     */
    getComponentsByCategory() {
        const categories = {};
        for (const [_, entry] of this.components) {
            const category = entry.metadata.category || 'general';
            categories[category] = (categories[category] || 0) + 1;
        }
        return categories;
    }
}
