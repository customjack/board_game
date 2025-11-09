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

    // Serialize this space to JSON
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            events: this.events.map(event => event.toJSON()),
            connections: this.connections.map(conn => ({
                targetId: conn.target.id,
                condition: conn.condition,
                drawConnection: conn.drawConnection
            })),
            visualDetails: this.visualDetails
        };
    }


    /**
     * First pass: Deserialize spaces without resolving connections
     * @param {Object} json - JSON representation
     * @param {FactoryManager} factoryManager - Factory manager for creating events
     * @returns {Space} Space instance
     */
    static fromJSON(json, factoryManager) {
        const events = json.events.map(eventData => GameEvent.fromJSON(eventData, factoryManager));
        return new Space(
            json.id,
            json.name,
            json.type,
            events,
            json.visualDetails,
            json.connections.map(conn => ({
                targetId: conn.targetId,   // Temporarily store the targetId, will resolve later
                condition: conn.condition,
                drawConnection: conn.drawConnection !== undefined ? conn.drawConnection : true
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
                    drawConnection: conn.drawConnection !== undefined ? conn.drawConnection : true
                }));
        });
    }
}
