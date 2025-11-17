/**
 * MessageTypes - Central registry of all network message types
 *
 * Benefits:
 * - Single source of truth for all message types
 * - Prevents typos in message type strings
 * - Easy to see all available message types
 * - Can add versioning and deprecation warnings
 */

export const MessageTypes = {
    // Connection lifecycle
    CONNECTION_PACKAGE: 'connectionPackage',
    JOIN: 'join',
    JOIN_REJECTED: 'joinRejected',
    KICK: 'kick',

    // Game state synchronization
    GAME_STATE: 'gameState',
    GAME_STATE_DELTA: 'gameStateDelta',
    PROPOSE_GAME_STATE: 'proposeGameState',
    REQUEST_FULL_STATE: 'requestFullState',

    // Player management
    PROPOSE_ADD_PLAYER: 'proposeAddPlayer',
    ADD_PLAYER_REJECTED: 'addPlayerRejected',
    NAME_CHANGE: 'nameChange',
    COLOR_CHANGE: 'colorChange',
    PEER_COLOR_CHANGE: 'peerColorChange',
    REMOVE_PLAYER: 'removePlayer',

    // Game control
    START_GAME: 'startGame',

    // Plugin management
    PLUGIN_STATE_UPDATE: 'pluginStateUpdate',

    // Gameplay actions
    PLAYER_ACTION: 'playerAction',

    // Heartbeat
    HEARTBEAT: 'heartbeat',
    HEARTBEAT_ACK: 'heartbeatAck'
};

/**
 * Message schemas for validation
 * Schema format: { fieldName: 'type' | { type, required, validator } }
 */
export const MessageSchemas = {
    [MessageTypes.CONNECTION_PACKAGE]: {
        gameState: { type: 'object', required: true }
    },

    [MessageTypes.JOIN]: {
        peerId: { type: 'string', required: true },
        players: { type: 'array', required: true }
    },

    [MessageTypes.JOIN_REJECTED]: {
        reason: { type: 'string', required: true }
    },

    [MessageTypes.GAME_STATE]: {
        gameState: { type: 'object', required: true }
    },

    [MessageTypes.GAME_STATE_DELTA]: {
        delta: { type: 'object', required: true }
    },

    [MessageTypes.PROPOSE_GAME_STATE]: {
        gameState: { type: 'object', required: true }
    },

    [MessageTypes.REQUEST_FULL_STATE]: {
        reason: { type: 'string', required: false }
    },

    [MessageTypes.PROPOSE_ADD_PLAYER]: {
        player: { type: 'object', required: true }
    },

    [MessageTypes.ADD_PLAYER_REJECTED]: {
        reason: { type: 'string', required: true },
        player: { type: 'object', required: false }
    },

    [MessageTypes.NAME_CHANGE]: {
        playerId: { type: 'string', required: true },
        newName: { type: 'string', required: true }
    },

    [MessageTypes.COLOR_CHANGE]: {
        playerId: { type: 'string', required: true },
        newColor: { type: 'string', required: true }
    },

    [MessageTypes.PEER_COLOR_CHANGE]: {
        playerId: { type: 'string', required: true },
        newPeerColor: { type: 'string', required: true }
    },

    [MessageTypes.REMOVE_PLAYER]: {
        playerId: { type: 'string', required: true }
    },

    [MessageTypes.PLUGIN_STATE_UPDATE]: {
        pluginStates: { type: 'object', required: true }
    },

    [MessageTypes.PLAYER_ACTION]: {
        playerId: { type: 'string', required: true },
        actionType: { type: 'string', required: true },
        actionData: { type: 'object', required: false }
    },

    [MessageTypes.HEARTBEAT]: {
        timestamp: { type: 'number', required: true }
    },

    [MessageTypes.HEARTBEAT_ACK]: {
        timestamp: { type: 'number', required: true }
    }
};

/**
 * Get all message types as an array
 */
export function getAllMessageTypes() {
    return Object.values(MessageTypes);
}

/**
 * Check if a message type is valid
 */
export function isValidMessageType(type) {
    return getAllMessageTypes().includes(type);
}
