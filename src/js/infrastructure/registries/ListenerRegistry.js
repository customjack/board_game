import BaseRegistry from './BaseRegistry';

export default class ListenerRegistry extends BaseRegistry {
    constructor() {
        super();  // Initialize the BaseRegistry
    }

    // Register a listener for an event
    registerListener(elementId, eventType, callback) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(eventType, callback);
            this.register(`${elementId}_${eventType}`, { element, eventType, callback });  // Use the base class's register method
        } else {
            console.warn(`Element with ID ${elementId} not found.`);
        }
    }

    // Unregister a listener
    unregisterListener(elementId, eventType) {
        const listenerKey = `${elementId}_${eventType}`;
        const listener = this.get(listenerKey);  // Use the base class's get method
        if (listener) {
            listener.element.removeEventListener(listener.eventType, listener.callback);
            this.unregister(listenerKey);  // Use the base class's unregister method
        } else {
            console.warn(`Listener for ${listenerKey} not found.`);
        }
    }

    // Unregister all listeners
    unregisterAllListeners() {
        Object.keys(this.registry).forEach(key => {
            const { element, eventType, callback } = this.get(key);
            element.removeEventListener(eventType, callback);
        });
        this.clear();  // Use the base class's clear method
    }
}
