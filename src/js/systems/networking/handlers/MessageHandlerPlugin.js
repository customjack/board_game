/**
 * MessageHandlerPlugin - Base class for pluggable message handlers
 *
 * Benefits:
 * - Each handler is self-contained and testable
 * - Easy to enable/disable handlers
 * - Clear separation of concerns
 * - Handlers can maintain their own state
 */

export default class MessageHandlerPlugin {
    /**
     * @param {NetworkProtocol} protocol - Protocol instance to register with
     * @param {Object} context - Shared context (peer, eventBus, gameState, etc.)
     */
    constructor(protocol, context) {
        this.protocol = protocol;
        this.context = context;
        this.enabled = true;
    }

    /**
     * Register message handlers with the protocol
     * Override in subclasses to register specific message types
     */
    register() {
        throw new Error('MessageHandlerPlugin.register() must be implemented by subclass');
    }

    /**
     * Unregister message handlers from the protocol
     * Override if custom cleanup is needed
     */
    unregister() {
        // Default: no-op, subclasses can override
    }

    /**
     * Enable this handler
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable this handler
     */
    disable() {
        this.enabled = false;
    }

    /**
     * Check if handler is enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Helper: Register a handler with the protocol
     * @param {string} messageType - Message type to handle
     * @param {Function} handler - Handler function
     * @param {Object} options - Optional configuration
     */
    registerHandler(messageType, handler, options = {}) {
        // Wrap handler to check if enabled
        const wrappedHandler = async (message, context) => {
            if (!this.isEnabled()) {
                console.warn(`Handler for ${messageType} is disabled`);
                return;
            }
            return handler.call(this, message, context);
        };

        this.protocol.registerHandler(messageType, wrappedHandler, options);
    }

    /**
     * Get peer from context
     */
    getPeer() {
        return this.context.peer;
    }

    /**
     * Get event bus from context
     */
    getEventBus() {
        return this.context.eventBus;
    }

    /**
     * Get game state from context
     */
    getGameState() {
        return this.context.gameState || this.getPeer()?.gameState;
    }

    /**
     * Get factory manager from context
     */
    getFactoryManager() {
        return this.context.factoryManager;
    }
}
