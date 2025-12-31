import BaseEventPipeline from './BaseEventPipeline.js';

/**
 * EventResolutionPipeline - resolves triggered events in order
 */
export default class EventResolutionPipeline extends BaseEventPipeline {
    constructor(eventBus, peerId) {
        super();
        this.eventBus = eventBus;
        this.peerId = peerId;
    }

    collect(gameState, eventBus = this.eventBus, peerId = this.peerId) {
        return gameState?.determineTriggeredEvents?.(eventBus, peerId) || [];
    }
}
