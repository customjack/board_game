import BaseAction from './BaseAction.js';
import ActionTypes from '../../infrastructure/utils/ActionTypes.js';
import { sanitizePromptMessage } from '../../infrastructure/utils/PromptMessage.js';

/**
 * PromptAllPlayersAction - Shows a modal prompt to all players
 *
 * Displays a message modal to all players in the game. Supports placeholder
 * replacement for dynamic content like player names.
 */
export default class PromptAllPlayersAction extends BaseAction {
    constructor(type, payload) {
        super(type, payload);
    }

    /**
     * Execute the prompt action
     * @param {Object} gameEngine - The game engine instance
     * @param {Function} postExecutionCallback - Callback after modal is closed
     */
    execute(gameEngine, postExecutionCallback) {
        const { eventBus } = gameEngine;

        this.emitEvent(eventBus, 'beforeActionExecution', gameEngine);

        const { payload } = this;

        if (payload?.message && gameEngine.peerId) {
            // Get the PlaceholderRegistry from the game engine
            const placeholderRegistry = gameEngine.registryManager.getRegistry('placeholderRegistry');

            if (placeholderRegistry) {
                // Temporarily add the CURRENT_PLAYER_NAME placeholder if needed
                placeholderRegistry.register('CURRENT_PLAYER_NAME', (gameEngine) => {
                    const currentPlayer = gameEngine.gameState.getCurrentPlayer();
                    return currentPlayer ? currentPlayer.nickname : 'Unknown Player';
                });

                // Create a copy of payload.message for processing
                let processed_message = payload.message;

                // Replace placeholders in the message and pass gameEngine as context
                processed_message = placeholderRegistry.replacePlaceholders(processed_message, gameEngine);

                // After message editing, unregister CURRENT_PLAYER_NAME to prevent future use
                placeholderRegistry.unregister('CURRENT_PLAYER_NAME');

                processed_message = sanitizePromptMessage(processed_message, { trustedHtml: true });

                console.log(`Prompting all players: ${processed_message}`);
                gameEngine.showPromptModal(processed_message, postExecutionCallback);
            }
        } else {
            console.warn('Missing required parameters: payload.message or peerId');
        }

        this.emitEvent(eventBus, 'afterActionExecution', gameEngine);
    }

    /**
     * Validate the action's payload
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        const errors = [];

        if (!this.payload) {
            errors.push('Payload is required');
        } else {
            if (!this.payload.message || typeof this.payload.message !== 'string') {
                errors.push('payload.message must be a non-empty string');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get metadata about this action type
     * @static
     * @returns {Object} Metadata including displayName, description, and payload schema
     */
    static getMetadata() {
        return {
            type: ActionTypes.PROMPT_ALL_PLAYERS,
            displayName: 'Prompt All Players',
            description: 'Display a message modal to all players in the game',
            category: 'prompts',
            payloadSchema: {
                message: {
                    type: 'string',
                    required: true,
                    description: 'The message to display. Supports placeholders like {CURRENT_PLAYER_NAME}',
                    example: '{CURRENT_PLAYER_NAME} landed on a special space!'
                }
            }
        };
    }
}
