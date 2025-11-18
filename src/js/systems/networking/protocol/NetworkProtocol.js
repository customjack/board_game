/**
 * NetworkProtocol - Message routing and validation system
 *
 * Responsibilities:
 * - Register message handlers
 * - Validate messages against schemas
 * - Route messages to appropriate handlers
 * - Provide hooks for logging, monitoring, etc.
 */

import { MessageSchemas, isValidMessageType } from './MessageTypes.js';

export default class NetworkProtocol {
    constructor(config = {}) {
        this.handlers = new Map();
        this.middlewares = [];
        this.validateMessages = config.validateMessages !== false;
        this.logMessages = config.logMessages || false;
    }

    /**
     * Register a message handler
     * @param {string} messageType - Type of message to handle
     * @param {Function} handler - Handler function (message, context) => void
     * @param {Object} options - Optional configuration
     */
    registerHandler(messageType, handler, options = {}) {
        if (!isValidMessageType(messageType)) {
            console.warn(`NetworkProtocol: Attempting to register unknown message type: ${messageType}`);
        }

        this.handlers.set(messageType, {
            handler,
            priority: options.priority || 0,
            description: options.description || ''
        });
    }

    /**
     * Unregister a message handler
     * @param {string} messageType - Type of message to unregister
     */
    unregisterHandler(messageType) {
        this.handlers.delete(messageType);
    }

    /**
     * Add middleware for message processing
     * Middleware signature: (message, context, next) => void
     * @param {Function} middleware - Middleware function
     */
    use(middleware) {
        this.middlewares.push(middleware);
    }

    /**
     * Handle an incoming message
     * @param {Object} message - Message object with 'type' field
     * @param {Object} context - Context object (peer, connection, etc.)
     * @returns {boolean} True if handled, false otherwise
     */
    async handleMessage(message, context = {}) {
        if (!message || typeof message !== 'object') {
            console.error('NetworkProtocol: Invalid message format', message);
            return false;
        }

        if (!message.type) {
            console.error('NetworkProtocol: Message missing type field', message);
            return false;
        }

        // Log if enabled
        if (this.logMessages) {
            console.log(`[NetworkProtocol] Received: ${message.type}`, message);
        }

        // Validate message
        if (this.validateMessages && !this.validateMessage(message)) {
            console.error(`NetworkProtocol: Message validation failed for type: ${message.type}`, message);
            return false;
        }

        // Get handler
        const handlerInfo = this.handlers.get(message.type);
        if (!handlerInfo) {
            console.warn(`NetworkProtocol: No handler registered for message type: ${message.type}`);
            return false;
        }

        // Execute middlewares
        try {
            await this.executeMiddlewares(message, context);
        } catch (error) {
            console.error(`NetworkProtocol: Middleware error for ${message.type}:`, error);
            return false;
        }

        // Execute handler
        try {
            await handlerInfo.handler(message, context);
            return true;
        } catch (error) {
            console.error(`NetworkProtocol: Handler error for ${message.type}:`, error);
            return false;
        }
    }

    /**
     * Execute middleware chain
     * @private
     */
    async executeMiddlewares(message, context) {
        for (const middleware of this.middlewares) {
            await new Promise((resolve, reject) => {
                try {
                    middleware(message, context, resolve);
                } catch (error) {
                    reject(error);
                }
            });
        }
    }

    /**
     * Validate a message against its schema
     * @param {Object} message - Message to validate
     * @returns {boolean} True if valid
     */
    validateMessage(message) {
        const schema = MessageSchemas[message.type];
        if (!schema) {
            // No schema defined, allow message
            return true;
        }

        // Check required fields
        for (const [field, fieldSchema] of Object.entries(schema)) {
            const fieldValue = message[field];
            const required = fieldSchema.required !== false;
            const expectedType = typeof fieldSchema === 'string' ? fieldSchema : fieldSchema.type;

            // Check if required field is missing
            if (required && (fieldValue === undefined || fieldValue === null)) {
                console.error(`Validation error: Required field '${field}' missing from ${message.type}`);
                return false;
            }

            // Check type if field exists
            if (fieldValue !== undefined && fieldValue !== null) {
                if (!this.checkType(fieldValue, expectedType)) {
                    console.error(`Validation error: Field '${field}' has wrong type in ${message.type}. Expected ${expectedType}, got ${typeof fieldValue}`);
                    return false;
                }
            }

            // Run custom validator if provided
            if (fieldSchema.validator && fieldValue !== undefined) {
                if (!fieldSchema.validator(fieldValue)) {
                    console.error(`Validation error: Field '${field}' failed custom validation in ${message.type}`);
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Check if a value matches a type
     * @private
     */
    checkType(value, expectedType) {
        if (expectedType === 'array') {
            return Array.isArray(value);
        }
        return typeof value === expectedType;
    }

    /**
     * Get all registered handlers
     * @returns {Array} Array of {type, description}
     */
    getRegisteredHandlers() {
        return Array.from(this.handlers.entries()).map(([type, info]) => ({
            type,
            description: info.description,
            priority: info.priority
        }));
    }

    /**
     * Clear all handlers
     */
    clear() {
        this.handlers.clear();
        this.middlewares = [];
    }
}
