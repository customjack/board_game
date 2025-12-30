/**
 * PhaseStateMachine - Manages game phase and turn phase transitions
 *
 * Handles state validation, transitions, and callbacks for game phases.
 * Decouples state management from game logic.
 */
export default class PhaseStateMachine {
    /**
     * Create a phase state machine
     * @param {Object} config - State machine configuration
     * @param {Array} config.gamePhases - Available game phases
     * @param {Array} config.turnPhases - Available turn phases (optional)
     * @param {EventBus} eventBus - Event bus for emitting transitions
     */
    constructor(config, eventBus) {
        this.config = config;
        this.eventBus = eventBus;

        // Current states
        this.currentGamePhase = null;
        this.currentTurnPhase = null;

        // Bind handlers
        this.gamePhaseHandlers = new Map();
        this.turnPhaseHandlers = new Map();

        // Transition history for debugging
        this.transitionHistory = [];
        this.maxHistoryLength = 50;
    }

    /**
     * Initialize the state machine with initial states
     * @param {string} initialGamePhase - Initial game phase
     * @param {string} initialTurnPhase - Initial turn phase (optional)
     */
    init(initialGamePhase, initialTurnPhase = null) {
        this.currentGamePhase = initialGamePhase;
        this.currentTurnPhase = initialTurnPhase;

        this.recordTransition('INIT', null, {
            gamePhase: initialGamePhase,
            turnPhase: initialTurnPhase
        });
    }

    /**
     * Register a handler for a game phase
     * @param {string} phase - Phase name
     * @param {Function} handler - Handler function
     */
    registerGamePhaseHandler(phase, handler) {
        this.gamePhaseHandlers.set(phase, handler);
    }

    /**
     * Register a handler for a turn phase
     * @param {string} phase - Phase name
     * @param {Function} handler - Handler function
     */
    registerTurnPhaseHandler(phase, handler) {
        this.turnPhaseHandlers.set(phase, handler);
    }

    /**
     * Register multiple game phase handlers at once
     * @param {Object} handlers - Map of phase -> handler
     */
    registerGamePhaseHandlers(handlers) {
        Object.entries(handlers).forEach(([phase, handler]) => {
            this.registerGamePhaseHandler(phase, handler);
        });
    }

    /**
     * Register multiple turn phase handlers at once
     * @param {Object} handlers - Map of phase -> handler
     */
    registerTurnPhaseHandlers(handlers) {
        Object.entries(handlers).forEach(([phase, handler]) => {
            this.registerTurnPhaseHandler(phase, handler);
        });
    }

    /**
     * Transition to a new game phase
     * @param {string} newPhase - New game phase
     * @param {Object} context - Additional context for the transition
     * @returns {boolean} True if transition succeeded
     */
    transitionGamePhase(newPhase, context = {}) {
        const oldPhase = this.currentGamePhase;

        // Validate transition
        if (!this.validateGamePhaseTransition(oldPhase, newPhase)) {
            console.warn(`Invalid game phase transition: ${oldPhase} -> ${newPhase}`);
            return false;
        }

        // Update state
        this.currentGamePhase = newPhase;

        // Record transition
        this.recordTransition('GAME_PHASE', oldPhase, newPhase, context);

        // Emit event
        this.emitTransition('gamePhaseChanged', {
            from: oldPhase,
            to: newPhase,
            ...context
        });

        // Call handler
        this.handleGamePhase(newPhase, context);

        return true;
    }

    /**
     * Transition to a new turn phase
     * @param {string} newPhase - New turn phase
     * @param {Object} context - Additional context for the transition
     * @returns {boolean} True if transition succeeded
     */
    transitionTurnPhase(newPhase, context = {}) {
        const oldPhase = this.currentTurnPhase;

        // Validate transition
        if (!this.validateTurnPhaseTransition(oldPhase, newPhase)) {
            console.warn(`Invalid turn phase transition: ${oldPhase} -> ${newPhase}`);
            return false;
        }

        // Update state
        this.currentTurnPhase = newPhase;

        // Record transition
        this.recordTransition('TURN_PHASE', oldPhase, newPhase, context);

        // Emit event
        this.emitTransition('turnPhaseChanged', {
            from: oldPhase,
            to: newPhase,
            ...context
        });

        // Call handler
        this.handleTurnPhase(newPhase, context);

        return true;
    }

    /**
     * Validate a game phase transition
     * @param {string} from - Current phase
     * @param {string} to - Target phase
     * @returns {boolean} True if valid
     */
    validateGamePhaseTransition(from, to) {
        // Allow any transition for now - can be made more strict with config
        const validPhases = this.config.gamePhases || [];
        return validPhases.includes(to);
    }

    /**
     * Validate a turn phase transition
     * @param {string} from - Current phase
     * @param {string} to - Target phase
     * @returns {boolean} True if valid
     */
    validateTurnPhaseTransition(from, to) {
        // Allow any transition for now - can be made more strict with config
        const validPhases = this.config.turnPhases || [];
        return validPhases.length === 0 || validPhases.includes(to);
    }

    /**
     * Handle a game phase by calling its registered handler
     * @param {string} phase - Phase to handle
     * @param {Object} context - Context data
     */
    handleGamePhase(phase, context) {
        const handler = this.gamePhaseHandlers.get(phase);
        if (handler) {
            try {
                handler(context);
            } catch (error) {
                console.error(`Error in game phase handler for ${phase}:`, error);
            }
        } else {
            console.warn(`No handler registered for game phase: ${phase}`);
        }
    }

    /**
     * Handle a turn phase by calling its registered handler
     * @param {string} phase - Phase to handle
     * @param {Object} context - Context data
     */
    handleTurnPhase(phase, context) {
        const handler = this.turnPhaseHandlers.get(phase);
        if (handler) {
            try {
                handler(context);
            } catch (error) {
                console.error(`Error in turn phase handler for ${phase}:`, error);
            }
        } else {
            console.warn(`No handler registered for turn phase: ${phase}`);
        }
    }

    /**
     * Get current game phase
     * @returns {string} Current game phase
     */
    getGamePhase() {
        return this.currentGamePhase;
    }

    /**
     * Get current turn phase
     * @returns {string} Current turn phase
     */
    getTurnPhase() {
        return this.currentTurnPhase;
    }

    /**
     * Check if currently in a specific game phase
     * @param {string} phase - Phase to check
     * @returns {boolean} True if in that phase
     */
    isInGamePhase(phase) {
        return this.currentGamePhase === phase;
    }

    /**
     * Check if currently in a specific turn phase
     * @param {string} phase - Phase to check
     * @returns {boolean} True if in that phase
     */
    isInTurnPhase(phase) {
        return this.currentTurnPhase === phase;
    }

    /**
     * Record a transition for history/debugging
     * @private
     */
    recordTransition(type, from, to, context = {}) {
        this.transitionHistory.push({
            type,
            from,
            to,
            context,
            timestamp: Date.now()
        });

        // Keep history bounded
        if (this.transitionHistory.length > this.maxHistoryLength) {
            this.transitionHistory.shift();
        }
    }

    /**
     * Emit a transition event
     * @private
     */
    emitTransition(eventName, data) {
        if (this.eventBus) {
            this.eventBus.emit(eventName, data);
        }
    }

    /**
     * Get transition history
     * @returns {Array} History of transitions
     */
    getHistory() {
        return [...this.transitionHistory];
    }

    /**
     * Reset the state machine
     */
    reset() {
        this.currentGamePhase = null;
        this.currentTurnPhase = null;
        this.transitionHistory = [];
    }

    /**
     * Serialize state machine for debugging
     * @returns {Object} Serialized state
     */
    toJSON() {
        return {
            currentGamePhase: this.currentGamePhase,
            currentTurnPhase: this.currentTurnPhase,
            history: this.transitionHistory.slice(-10) // Last 10 transitions
        };
    }
}
