import { v4 as uuidv4 } from 'uuid';
import ColorAssigner from '../../infrastructure/utils/ColorAssigner';
import RollEngine from '../../infrastructure/utils/RollEngine';
import PlayerMovementHistory from './PlayerMovementHistory';
import playerStateRegistry from '../../infrastructure/registries/PlayerStateRegistry.js';

export const PlayerStates = Object.freeze({
    SPECTATING: 'SPECTATING',
    PLAYING: 'PLAYING',
    COMPLETED_GAME: 'COMPLETED_GAME',
    DISCONNECTED: 'DISCONNECTED',
    SKIPPING_TURN: 'SKIPPING_TURN',
    WAITING: 'WAITING', // For players waiting for their turn or game start
    ELIMINATED: 'ELIMINATED' // For games with elimination mechanics
});

export default class Player {
    static allowedStates = new Set(Object.values(PlayerStates));

    static registerAllowedState(state) {
        if (typeof state === 'string' && state.length > 0) {
            Player.allowedStates.add(state);
        }
    }

    static registerAllowedStates(states = []) {
        states.forEach((s) => Player.registerAllowedState(s));
    }

    /**
     * Constructs a new Player instance.
     * @param {string} peerId - The unique identifier for the client's connection.
     * @param {string} nickname - The display name of the player.
     * @param {boolean} [isHost=false] - Indicates if the player is the host.
     * @param {string} [playerId] - Optional unique player ID. If not provided, it will be generated.
     * @param {string} [initialState=PlayerStates.WAITING] - The initial state of the player.
     */
    constructor(peerId, nickname, factoryManager, isHost = false, playerId = null, initialState = PlayerStates.WAITING) {
        this.peerId = peerId;
        this.nickname = nickname;
        this.factoryManager = factoryManager;
        this.isHost = isHost;
        this.isUnclaimed = false;
        this.stats = []; // Initialize as array of stat instances
        this.playerId = playerId || this.generatePlayerId();
        this.id = this.playerId;
        this.state = initialState; // Use PlayerStates instead of isSpectator

        // Starting space will be set by GameState based on board's game rules
        // Default to null - must be set before game starts
        this.currentSpaceId = null;

        this.playerColor = (new ColorAssigner()).assignColor(this.playerId);
        const peerColorKey = this.peerId || 'unclaimed';
        this.peerColor = (new ColorAssigner()).assignColor(peerColorKey);

        this.rollEngine = new RollEngine(this.generateSeedFromId(this.playerId));
        this.turnsTaken = 0;
        this.pieces = [];

        this.movementHistory = new PlayerMovementHistory();

        this.effects = []; // Initialize the effects list
    }

    /**
     * Generates a unique player ID using UUID.
     * @returns {string} A unique player ID.
     */
    generatePlayerId() {
        const id = uuidv4();
        console.log("Generated new Player with ID: ", id);
        console.log("Player attached to client: ", this.peerId);
        return id; // Generates a UUID v4
    }

    /**
     * Generate a seed from the playerId to ensure consistent rolls across sessions.
     * @param {string} playerId - The player's unique ID.
     * @returns {number} A number derived from the playerId for seeding the RNG.
     */
    generateSeedFromId(playerId) {
        return playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    }


    /**
     * Setter for nickname to enforce a 32-character limit.
     * @param {string} nickname - The player's nickname.
    */
    set nickname(nickname) {
        if (nickname.length > 32) {
            console.log(`Nickname "${nickname}" is too long. Truncating to 32 characters.`);
            this._nickname = nickname.slice(0, 32);
        } else {
            this._nickname = nickname;
        }
    }

    /**
     * Getter for nickname.
     * @returns {string} The player's nickname.
     */
    get nickname() {
        return this._nickname;
    }

    /**
     * Rolls the dice for the player using their roll engine.
     * @param {number} min - The minimum roll value (inclusive).
     * @param {number} max - The maximum roll value (inclusive).
     * @param {Function} [distributionFn] - Optional custom distribution function.
     * @returns {number} The result of the roll.
     */
    rollDice(min = 1, max = 6, distributionFn = null) {
        return this.rollEngine.roll(min, max, distributionFn);
    }

    /**
     * Resets the player's roll engine to the original seed.
     */
    resetRollEngine() {
        this.rollEngine.resetSeed();
    }

    /**
     * Sets a new seed in the roll engine, useful for applying custom game effects.
     * @param {number} newSeed - The new seed to apply.
     */
    setRollEngineSeed(newSeed) {
        this.rollEngine.setSeed(newSeed);
    }

    /**
     * Dynamically updates or adds a stat by delta.
     * @param {string} statId - The ID of the stat (e.g., "score").
     * @param {number} delta - The value to add to the stat.
     * @param {string} mode - Which value to change: 'both' (default), 'true', or 'display'
     */
    updateStat(statId, delta, mode = 'both') {
        const stat = this.stats.find(s => s.id === statId);
        if (stat) {
            stat.changeValue(delta, this, mode);
        } else {
            console.warn(`Stat "${statId}" not found on player ${this.nickname}. Cannot update.`);
        }
    }

    /**
     * Sets a stat to a specific value.
     * @param {string} statId - The ID of the stat (e.g., "score").
     * @param {*} value - The value to set for the stat.
     * @param {string} mode - Which value to set: 'both' (default), 'true', or 'display'
     */
    setStat(statId, value, mode = 'both') {
        const stat = this.stats.find(s => s.id === statId);
        if (stat) {
            stat.setValue(value, this, mode);
        } else {
            console.warn(`Stat "${statId}" not found on player ${this.nickname}. Cannot set.`);
        }
    }

    /**
     * Retrieves a player's stat value.
     * @param {string} statId - The ID of the stat (e.g., "score").
     * @returns {*} The value of the stat, or undefined if not found.
     */
    getStat(statId) {
        const stat = this.stats.find(s => s.id === statId);
        return stat ? stat.getValue() : undefined;
    }

    /**
     * Adds a stat instance to the player.
     * @param {BaseStat} stat - The stat instance to add.
     */
    addStat(stat) {
        // Check if stat with this ID already exists
        const existingStat = this.stats.find(s => s.id === stat.id);
        if (existingStat) {
            console.warn(`Stat with ID "${stat.id}" already exists on player ${this.nickname}. Replacing.`);
            this.removeStat(stat.id);
        }
        this.stats.push(stat);
    }

    /**
     * Removes a stat from the player's stats.
     * @param {string} statId - The ID of the stat to remove.
     */
    removeStat(statId) {
        const index = this.stats.findIndex(s => s.id === statId);
        if (index !== -1) {
            this.stats.splice(index, 1);
        } else {
            console.warn(`Stat "${statId}" does not exist on player ${this.nickname}.`);
        }
    }

    /**
     * Sets the player's state.
     * @param {string} newState - The new state for the player. Must be a valid PlayerStates value or a registered custom state.
     */
    setState(newState) {
        const allowed = this.constructor.allowedStates || Player.allowedStates;
        if (!allowed?.has?.(newState)) {
            throw new Error(`Invalid player state: ${newState}`);
        }
        this.state = newState;
    }

    /**
     * Adds an effect to the player.
     * @param {PlayerEffect} effect - The effect to add.
     */
    addEffect(effect) {
        this.effects.push(effect);
    }

    /**
     * Gets the player's current state.
     * @returns {string} The player's current state.
     */
    getState() {
        return this.state;
    }

    /**
     * Sets the player's current space ID.
     * @param {number} spaceId - The ID of the space the player is moving to.
     */
    setCurrentSpaceId(spaceId) {
        this.currentSpaceId = spaceId;
    }

    /**
     * Retrieves the player's current space ID.
     * @returns {number} The current space ID of the player.
     */
    getCurrentSpaceId() {
        return this.currentSpaceId;
    }

    /**
     * Increment the number of turns taken by the player.
     */
    incrementTurnsTaken() {
        this.turnsTaken += 1;
    }

    /**
     * Sets the number of turns taken by the player. Takes a copy of the passed value.
     * @param {number} turns - The number of turns to set.
     */
    setTurnsTaken(turns) {
        this.turnsTaken = Number(turns); // Convert to number to ensure it's a copy, not a reference
    }

    /**
     * Serializes player data to JSON.
     * @returns {Object} The serialized player data.
     */
    toJSON() {
        return {
            peerId: this.peerId,
            nickname: this.nickname,
            isHost: this.isHost,
            isUnclaimed: this.isUnclaimed,
            state: this.state,
            playerColor: this.playerColor,
            peerColor: this.peerColor,
            stats: this.stats.map(stat => stat.toJSON()), // Serialize stat instances
            playerId: this.playerId,
            currentSpaceId: this.currentSpaceId,
            pieces: this.pieces,
            rollEngine: this.rollEngine.toJSON(),  // Serialize the RollEngine
            turnsTaken: this.turnsTaken,            // Serialize the number of turns taken
            movementHistory: this.movementHistory.toJSON(),  // Serialize movement history
            effects: this.effects.map(effect => effect.toJSON()) // Serialize effects
        };
    }

    /**
     * Deserializes player data from JSON.
     * @param {Object} json - The JSON object containing player data.
     * @param {FactoryManager} factoryManager - The factory manager to create stats and effects.
     * @returns {Player} A new Player instance.
     */
    static fromJSON(json, factoryManager) {
        const player = new Player(
            json.peerId,
            json.nickname,
            factoryManager,
            json.isHost,
            json.playerId,
            json.state
        );
        player.isUnclaimed = Boolean(json.isUnclaimed);

        // Rebuild stats from JSON
        player.stats = (json.stats || []).map(statJson => {
            return factoryManager.getFactory('StatFactory').createStatFromJSON(statJson);
        }).filter(stat => stat !== null); // Filter out any failed deserializations

        // Preserve custom colors if provided, otherwise fallback to generated values
        if (json.playerColor) {
            player.playerColor = json.playerColor;
        }

        if (json.peerColor) {
            player.peerColor = json.peerColor;
        }

        player.currentSpaceId = json.currentSpaceId;
        player.pieces = Array.isArray(json.pieces) ? json.pieces.map(piece => ({ ...piece })) : [];
        player.rollEngine = RollEngine.fromJSON(json.rollEngine);  // Rebuild the RollEngine from JSON
        player.turnsTaken = json.turnsTaken;                       // Rebuild the turns taken
        player.movementHistory = PlayerMovementHistory.fromJSON(json.movementHistory);  // Rebuild movement history
        player.effects = json.effects.map(effectJson => {
            //console.log('Deserializing effect:', effectJson);
            return factoryManager.getFactory('EffectFactory').createEffectFromJSON(effectJson);
        }); // Rebuild effects
        return player;
    }
}
