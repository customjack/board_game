/**
 * EventProcessor - Manages game event processing and queueing
 *
 * This component handles:
 * - Determining triggered events based on game state
 * - Managing event queue with priority ordering
 * - Processing events sequentially
 * - Tracking event state transitions
 */
export default class EventProcessor {
    /**
     * Create a new event processor
     * @param {GameState} gameState - The game state reference
     * @param {EventBus} eventBus - Event bus for emitting events
     * @param {Object} config - Configuration options
     */
    constructor(gameState, eventBus, config = {}) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        this.config = {
            // Whether to automatically sort events by priority
            autoSort: config.autoSort !== undefined ? config.autoSort : true,
            // Max events to process per turn
            maxEventsPerTurn: config.maxEventsPerTurn || 100,
            // Whether to track event history
            trackHistory: config.trackHistory !== undefined ? config.trackHistory : true,
            ...config
        };

        // Event processing state
        this.currentEventQueue = [];
        this.currentEventIndex = 0;
        this.eventHistory = [];
        this.isProcessing = false;
    }

    /**
     * Determine which events should be triggered based on current game state
     * @param {string} peerId - Peer ID for context
     * @returns {Array} Array of {event, space} objects
     */
    determineTriggeredEvents(peerId = null) {
        const triggeredEvents = [];

        // Loop through all spaces on the board to check for triggered events
        for (const space of this.gameState.board.spaces) {
            const context = {
                gameState: this.gameState,
                space: space,
                eventBus: this.eventBus,
                peerId: peerId
            };

            // Check each event on the space
            for (const event of space.events) {
                if (event.checkTrigger(context)) {
                    triggeredEvents.push({ event, space });
                }
            }
        }

        // Sort by priority if configured
        if (this.config.autoSort) {
            this.sortEventsByPriority(triggeredEvents);
        }

        // Update game state's triggered events (for backward compatibility)
        this.gameState.triggeredEvents = triggeredEvents;

        return triggeredEvents;
    }

    /**
     * Sort events by priority (highest to lowest)
     * @param {Array} events - Array of {event, space} objects
     */
    sortEventsByPriority(events) {
        events.sort((a, b) => {
            const aPriority = a.event.priority.value;
            const bPriority = b.event.priority.value;
            return bPriority - aPriority; // Descending order
        });
    }

    /**
     * Start processing a queue of events
     * @param {Array} eventQueue - Array of {event, space} objects
     * @returns {boolean} True if processing started
     */
    startProcessing(eventQueue = null) {
        if (this.isProcessing) {
            console.warn('Event processor is already processing events');
            return false;
        }

        // Use provided queue or determine triggered events
        this.currentEventQueue = eventQueue || this.determineTriggeredEvents();
        this.currentEventIndex = 0;
        this.isProcessing = true;

        // Emit processing started event
        if (this.eventBus) {
            this.eventBus.emit('eventProcessingStarted', {
                eventCount: this.currentEventQueue.length,
                gameState: this.gameState
            });
        }

        return true;
    }

    /**
     * Get the next event to process
     * @returns {Object|null} Next {event, space} or null if none
     */
    getNextEvent() {
        if (!this.isProcessing) return null;
        if (this.currentEventIndex >= this.currentEventQueue.length) return null;

        return this.currentEventQueue[this.currentEventIndex];
    }

    /**
     * Mark current event as processed and move to next
     * @param {Object} result - Result data from event execution
     */
    advanceToNextEvent(result = {}) {
        if (!this.isProcessing) return;

        const currentEvent = this.currentEventQueue[this.currentEventIndex];

        // Record in history if configured
        if (this.config.trackHistory && currentEvent) {
            this.recordEventExecution(currentEvent, result);
        }

        this.currentEventIndex++;

        // Check if done processing
        if (this.currentEventIndex >= this.currentEventQueue.length) {
            this.finishProcessing();
        }
    }

    /**
     * Finish processing all events
     */
    finishProcessing() {
        this.isProcessing = false;

        // Emit processing finished event
        if (this.eventBus) {
            this.eventBus.emit('eventProcessingFinished', {
                eventsProcessed: this.currentEventIndex,
                gameState: this.gameState
            });
        }

        // Clear current queue
        this.currentEventQueue = [];
        this.currentEventIndex = 0;
    }

    /**
     * Cancel event processing
     */
    cancelProcessing() {
        if (!this.isProcessing) return;

        this.isProcessing = false;

        // Emit cancellation event
        if (this.eventBus) {
            this.eventBus.emit('eventProcessingCancelled', {
                eventsProcessed: this.currentEventIndex,
                eventsRemaining: this.currentEventQueue.length - this.currentEventIndex,
                gameState: this.gameState
            });
        }

        this.currentEventQueue = [];
        this.currentEventIndex = 0;
    }

    /**
     * Check if there are events currently being processed
     * @returns {boolean} True if processing
     */
    hasEventsToProcess() {
        return this.isProcessing && this.currentEventIndex < this.currentEventQueue.length;
    }

    /**
     * Get count of remaining events to process
     * @returns {number} Number of events remaining
     */
    getRemainingEventCount() {
        if (!this.isProcessing) return 0;
        return this.currentEventQueue.length - this.currentEventIndex;
    }

    /**
     * Get processing progress (0 to 1)
     * @returns {number} Progress as decimal
     */
    getProgress() {
        if (!this.isProcessing || this.currentEventQueue.length === 0) return 0;
        return this.currentEventIndex / this.currentEventQueue.length;
    }

    /**
     * Reset all events to READY state
     * @param {boolean} resetHistory - Whether to clear event history
     */
    resetAllEvents(resetHistory = false) {
        // Reset events on all spaces
        for (const space of this.gameState.board.spaces) {
            for (const event of space.events) {
                if (event.getState() === 'COMPLETED_ACTION') {
                    event.setState('READY');
                }
            }
        }

        // Clear triggered events
        this.gameState.triggeredEvents = [];

        // Clear history if requested
        if (resetHistory) {
            this.eventHistory = [];
        }

        // Emit reset event
        if (this.eventBus) {
            this.eventBus.emit('eventsReset', {
                resetHistory,
                gameState: this.gameState
            });
        }
    }

    /**
     * Reset specific events by state
     * @param {string} fromState - State to reset from (e.g., 'COMPLETED_ACTION')
     * @param {string} toState - State to reset to (e.g., 'READY')
     */
    resetEventsByState(fromState, toState = 'READY') {
        let resetCount = 0;

        for (const space of this.gameState.board.spaces) {
            for (const event of space.events) {
                if (event.getState() === fromState) {
                    event.setState(toState);
                    resetCount++;
                }
            }
        }

        return resetCount;
    }

    /**
     * Get all events with a specific state
     * @param {string} state - Event state to filter by
     * @returns {Array} Array of {event, space} objects
     */
    getEventsByState(state) {
        const events = [];

        for (const space of this.gameState.board.spaces) {
            for (const event of space.events) {
                if (event.getState() === state) {
                    events.push({ event, space });
                }
            }
        }

        return events;
    }

    /**
     * Record an event execution in history
     * @param {Object} eventWithSpace - {event, space} object
     * @param {Object} result - Execution result
     */
    recordEventExecution(eventWithSpace, result) {
        const { event, space } = eventWithSpace;

        this.eventHistory.push({
            eventState: event.getState(),
            spaceName: space.name,
            spaceId: space.id,
            priority: event.priority,
            timestamp: Date.now(),
            turnNumber: this.gameState.getTurnNumber(),
            result: result
        });

        // Keep history limited to last 100 events
        if (this.eventHistory.length > 100) {
            this.eventHistory.shift();
        }
    }

    /**
     * Get event execution history
     * @param {number} limit - Max entries to return
     * @returns {Array} Event history entries
     */
    getEventHistory(limit = 10) {
        return this.eventHistory.slice(-limit);
    }

    /**
     * Get statistics about event processing
     * @returns {Object} Event processing stats
     */
    getStats() {
        const allEvents = [];
        const eventsByState = {};

        // Collect all events and categorize by state
        for (const space of this.gameState.board.spaces) {
            for (const event of space.events) {
                allEvents.push(event);
                const state = event.getState();
                if (!eventsByState[state]) {
                    eventsByState[state] = 0;
                }
                eventsByState[state]++;
            }
        }

        return {
            totalEvents: allEvents.length,
            eventsByState,
            triggeredCount: this.gameState.triggeredEvents.length,
            currentQueueSize: this.currentEventQueue.length,
            currentQueueIndex: this.currentEventIndex,
            isProcessing: this.isProcessing,
            historyLength: this.eventHistory.length
        };
    }

    /**
     * Execute an event (wrapper for GameEvent.executeAction)
     * @param {Object} eventWithSpace - {event, space} object
     * @param {Object} gameEngine - Game engine instance
     * @param {boolean} force - Force execution
     */
    executeEvent(eventWithSpace, gameEngine, force = false) {
        const { event, space } = eventWithSpace;

        // Emit event triggering
        if (this.eventBus) {
            this.eventBus.emit('gameEventTriggered', {
                gameEvent: event,
                gameState: this.gameState,
                eventSpace: space
            });
        }

        // Execute the event's action
        event.executeAction(gameEngine, force);
    }

    /**
     * Serialize event processor state for debugging
     * @returns {Object} Serialized state
     */
    toJSON() {
        return {
            isProcessing: this.isProcessing,
            queueSize: this.currentEventQueue.length,
            queueIndex: this.currentEventIndex,
            remainingEvents: this.getRemainingEventCount(),
            stats: this.getStats(),
            config: this.config
        };
    }
}
