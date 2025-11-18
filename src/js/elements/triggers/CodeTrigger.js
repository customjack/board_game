import BaseTrigger from './BaseTrigger.js';
import TriggerTypes from '../../enums/TriggerTypes.js';

/**
 * CodeTrigger - Triggered by custom JavaScript code evaluation
 *
 * This trigger evaluates arbitrary JavaScript code to determine if it should fire.
 * The code has access to the trigger context (gameState, space, etc.).
 *
 * Security Warning:
 * - Uses eval() which can execute arbitrary code
 * - Should be sanitized/validated in production environments
 * - Only use with trusted board configurations
 *
 * Use Cases:
 * - "Trigger when player score > 10"
 * - "Trigger on odd turn numbers"
 * - Complex custom conditions not covered by other triggers
 */
export default class CodeTrigger extends BaseTrigger {
    constructor(type, payload = null) {
        super(type, payload);
    }

    /**
     * Evaluate custom JavaScript code to determine trigger state
     * @param {Object} context - Trigger evaluation context
     * @returns {boolean} Result of code evaluation
     */
    isTriggered(context) {
        const { gameState, space, eventBus, peerId } = context;

        // Emit pre-check event
        this.emitEvent(eventBus, 'triggerCheckStarted', { gameState, space });

        let isTriggered = false;

        try {
            if (this.payload) {
                // Make context available to eval'd code
                const player = gameState.getCurrentPlayer();
                const turnNumber = gameState.getTurnNumber();
                const movesLeft = gameState.getRemainingMoves();

                // Evaluate the code
                // eslint-disable-next-line no-eval
                isTriggered = eval(this.payload);
            }
        } catch (error) {
            console.error(`CodeTrigger evaluation error for space ID ${space.id}:`, error);
            isTriggered = false;
        }

        // Emit post-check event
        this.emitEvent(eventBus, 'triggerCheckEnded', {
            result: isTriggered,
            gameState,
            space
        });

        // Debug logging
        if (isTriggered) {
            console.log(`CodeTrigger activated for space ID ${space.id} with code: ${this.payload}`);
        }

        return isTriggered;
    }

    /**
     * Validate the trigger configuration
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        const baseValidation = super.validate();
        const errors = [...baseValidation.errors];

        // CodeTrigger requires a payload
        if (!this.payload || typeof this.payload !== 'string') {
            errors.push('CodeTrigger requires a payload containing JavaScript code (string)');
        }

        // Check for potentially dangerous code (basic security check)
        if (this.payload) {
            const dangerousPatterns = [
                /import\s+/i,
                /require\s*\(/i,
                /fetch\s*\(/i,
                /XMLHttpRequest/i,
                /localStorage/i,
                /sessionStorage/i,
                /document\./i,
                /window\./i
            ];

            for (const pattern of dangerousPatterns) {
                if (pattern.test(this.payload)) {
                    errors.push(`CodeTrigger payload contains potentially dangerous code pattern: ${pattern}`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get metadata about this trigger type
     * @static
     * @returns {Object} Metadata schema
     */
    static getMetadata() {
        return {
            type: TriggerTypes.CODE,
            displayName: 'Custom Code',
            description: 'Triggered by evaluating custom JavaScript code. Allows complex conditional logic beyond standard triggers. WARNING: Uses eval() - only use with trusted boards.',
            category: 'advanced',
            timing: 'conditional',
            security: 'WARNING: Executes arbitrary JavaScript code',
            payloadSchema: {
                type: 'string',
                required: true,
                description: 'JavaScript code to evaluate. Must return boolean.',
                example: 'player.score > 10 && turnNumber % 2 === 0',
                validation: 'Should not contain imports, fetch, or DOM access'
            },
            examples: [
                {
                    description: 'Trigger when player score exceeds threshold',
                    json: {
                        type: 'CODE',
                        payload: 'player.score > 10'
                    }
                },
                {
                    description: 'Trigger on even turn numbers',
                    json: {
                        type: 'CODE',
                        payload: 'turnNumber % 2 === 0'
                    }
                },
                {
                    description: 'Trigger when multiple conditions met',
                    json: {
                        type: 'CODE',
                        payload: 'player.currentSpaceId > 5 && movesLeft === 0'
                    }
                }
            ],
            useCases: [
                'Complex conditional triggers',
                'Score-based triggers',
                'Turn-based triggers',
                'Custom game logic'
            ],
            availableVariables: [
                'gameState - Full game state object',
                'space - Current space being evaluated',
                'player - Current player object',
                'turnNumber - Current turn number',
                'movesLeft - Remaining moves for current player',
                'peerId - Network peer ID'
            ]
        };
    }
}
