import GameEvent from './GameEvent.js';

export default class Space {
    constructor(id, name, type, events, visualDetails, connections = []) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.events = events; // List of GameEvent instances
        this.visualDetails = visualDetails; // Holds x, y, size, and color
        this.connections = connections; // Connections (directed graph)
    }

    // Add connection to another space
    addConnection(targetSpace, condition = null, drawConnection = true) {
        this.connections.push({
            target: targetSpace,
            condition: condition,
            drawConnection: drawConnection
        });
    }

    // Serialize this space to JSON (new format)
    toJSON() {
        // Split visualDetails back into position and visual
        const { x, y, ...visual } = this.visualDetails;

        return {
            id: this.id,
            name: this.name,
            type: this.type,
            position: { x, y },
            visual: visual,
            connections: this.connections.map(conn => ({
                targetId: conn.target.id,
                draw: conn.drawConnection,
                ...(conn.condition && { condition: conn.condition })
            })),
            triggers: this.events.map(event => {
                const eventJson = event.toJSON();
                return {
                    when: eventJson.trigger,
                    action: eventJson.action,
                    priority: eventJson.priority,
                    state: eventJson.state  // Preserve event state through serialization!
                };
            })
        };
    }


    /**
     * First pass: Deserialize spaces without resolving connections
     * @param {Object} json - JSON representation
     * @param {FactoryManager} factoryManager - Factory manager for creating events
     * @returns {Space} Space instance
     */
    static fromJSON(json, factoryManager) {
        // Handle triggers array (new format) - map trigger.when -> trigger, trigger.action -> action
        const events = (json.triggers || []).map(triggerData => {
            const eventData = {
                trigger: triggerData.when,
                action: triggerData.action,
                priority: triggerData.priority,
                state: triggerData.state  // Preserve event state from serialization
            };
            return GameEvent.fromJSON(eventData, factoryManager);
        });

        // Merge position object with visual object to create visualDetails
        const visualDetails = {
            ...(json.position || {}),
            ...(json.visual || {})
        };

        return new Space(
            json.id,
            json.name,
            json.type,
            events,
            visualDetails,
            json.connections.map(conn => ({
                targetId: conn.targetId,
                condition: conn.condition,
                drawConnection: conn.draw !== undefined ? conn.draw : true
            }))
        );
    }

    // Second pass: Resolve connections between spaces
    static resolveConnections(spaces, json) {
        spaces.forEach(space => {
            space.connections = json
                .find(s => s.id === space.id)
                .connections.map(conn => ({
                    target: spaces.find(targetSpace => targetSpace.id === conn.targetId),
                    condition: conn.condition,
                    drawConnection: conn.draw !== undefined ? conn.draw : true
                }));
        });
    }
}
