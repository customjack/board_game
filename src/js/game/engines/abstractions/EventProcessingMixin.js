/**
 * EventProcessingMixin - shared helpers for processing triggered events.
 */
export const EventProcessingMixin = (Base) => class extends Base {
    /**
     * Handle the branch when there are triggered events to process or not.
     * @param {Array} triggeredEvents
     * @param {Object} options
     * @param {Function} options.onEmpty - Called when no events remain
     * @param {Function} options.onProcess - Called when events exist
     */
    processTriggeredEventsFlow(triggeredEvents, { onEmpty, onProcess } = {}) {
        if (!Array.isArray(triggeredEvents) || triggeredEvents.length === 0) {
            onEmpty?.();
        } else {
            onProcess?.();
        }
    }
};
