/**
 * AnimationFactory - Factory for creating and managing animations
 *
 * Allows plugins to register custom animation implementations for:
 * - Dice rolls
 * - Player movement
 * - Special effects
 * - Transitions
 * - Custom game events
 */

// Import default animations
import ParticleAnimation from '../../animations/ParticleAnimation.js';
import TimerAnimation from '../../animations/TimerAnimation.js';
import DiceRollAnimation from '../../animations/DiceRollAnimation.js';
import SlotMachineAnimation from '../../animations/SlotMachineAnimation.js';

export default class AnimationFactory {
    constructor() {
        this.registry = new Map();
        this.metadata = new Map(); // Store animation metadata
        // Note: Default animations registered by DefaultCorePlugin
    }

    /**
     * Register an animation type
     * @param {string} type - Animation type identifier (e.g., 'dice-roll')
     * @param {class} AnimationClass - Animation class constructor
     * @param {Object} metadata - Animation metadata for display/selection
     */
    register(type, AnimationClass, metadata = {}) {
        if (!type || typeof type !== 'string') {
            throw new Error('Animation type must be a non-empty string');
        }

        if (typeof AnimationClass !== 'function') {
            throw new Error('AnimationClass must be a constructor function');
        }

        this.registry.set(type, AnimationClass);
        this.metadata.set(type, {
            type,
            displayName: metadata.displayName || type,
            description: metadata.description || '',
            category: metadata.category || 'misc',
            duration: metadata.duration || 'unknown',
            preview: metadata.preview || '',
            isDefault: metadata.isDefault || false,
            ...metadata
        });
    }

    /**
     * Unregister an animation type
     * @param {string} type - Animation type to remove
     * @returns {boolean} True if unregistered
     */
    unregister(type) {
        this.metadata.delete(type);
        return this.registry.delete(type);
    }

    /**
     * Create an animation instance
     * @param {string} type - Type of animation to create
     * @param {Object} options - Animation-specific options
     * @returns {Animation} Created animation instance
     */
    create(type, options = {}) {
        const AnimationClass = this.registry.get(type);

        if (!AnimationClass) {
            console.warn(`Animation type '${type}' not found, using default`);
            const defaultType = this.getDefaultAnimation('roll');
            return new (this.registry.get(defaultType))(options);
        }

        return new AnimationClass(options);
    }

    /**
     * Check if an animation type is registered
     * @param {string} type - Animation type to check
     * @returns {boolean} True if registered
     */
    isRegistered(type) {
        return this.registry.has(type);
    }

    /**
     * Get all registered animation types
     * @returns {string[]} Array of registered animation types
     */
    getRegisteredTypes() {
        return Array.from(this.registry.keys());
    }

    /**
     * Get animations by category
     * @param {string} category - Category to filter by (e.g., 'roll', 'timer')
     * @returns {Array} Array of animation metadata objects
     */
    getAnimationsByCategory(category) {
        const animations = [];
        for (const [type, metadata] of this.metadata.entries()) {
            if (metadata.category === category) {
                animations.push(metadata);
            }
        }
        return animations;
    }

    /**
     * Get animation metadata
     * @param {string} type - Animation type
     * @returns {Object|null} Animation metadata or null
     */
    getMetadata(type) {
        return this.metadata.get(type) || null;
    }

    /**
     * Get default animation for a category
     * @param {string} category - Category (e.g., 'roll')
     * @returns {string} Default animation type for category
     */
    getDefaultAnimation(category) {
        // Find default animation in category
        for (const [type, metadata] of this.metadata.entries()) {
            if (metadata.category === category && metadata.isDefault) {
                return type;
            }
        }

        // Fallback: return first animation in category
        const animations = this.getAnimationsByCategory(category);
        return animations.length > 0 ? animations[0].type : null;
    }

    /**
     * Get all animations suitable for user selection
     * @param {string} category - Optional category filter
     * @returns {Array} Array of selectable animations with metadata
     */
    getSelectableAnimations(category = null) {
        const animations = [];

        for (const metadata of this.metadata.values()) {
            if (category && metadata.category !== category) {
                continue;
            }

            // Only include animations that are user-selectable
            // (exclude internal animations like timers)
            if (metadata.category === 'roll') {
                animations.push({
                    value: metadata.type,
                    label: metadata.displayName,
                    description: metadata.description,
                    preview: metadata.preview,
                    isDefault: metadata.isDefault
                });
            }
        }

        return animations.sort((a, b) => {
            // Sort: default first, then alphabetically
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return a.label.localeCompare(b.label);
        });
    }
}
