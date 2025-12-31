/**
 * BaseEventPipeline - defines lifecycle for event processing
 */
export default class BaseEventPipeline {
    collect(gameState, eventBus, peerId) { // eslint-disable-line no-unused-vars
        throw new Error('collect() must be implemented by event pipeline');
    }
}
