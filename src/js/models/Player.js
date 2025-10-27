import { v4 as uuidv4 } from 'uuid';
import ColorAssigner from '../utils/ColorAssigner';
import RollEngine from '../utils/RollEngine';
import PlayerMovementHistory from './PlayerMovementHistory';
import PlayerStates from '../enums/PlayerStates';

export default class Player {
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
        this.stats = {};
        this.playerId = playerId || this.generatePlayerId();
        this.id = this.playerId;
        this.state = initialState; // Use PlayerStates instead of isSpectator

        // Default to space 1 at the start
        this.currentSpaceId = 1;

        this.playerColor = (new ColorAssigner()).assignColor(this.playerId);
        this.peerColor = (new ColorAssigner()).assignColor(this.peerId);

        this.rollEngine = new RollEngine(this.generateSeedFromId(this.playerId));
        this.turnsTaken = 0;

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
     * Dynamically updates or adds a stat.
     * @param {string} statName - The name of the stat.
     * @param {number} delta - The value to add to the stat.
     */
    updateStat(statName, delta) {
        if (!this.stats[statName]) {
            this.stats[statName] = 0;
        }
        this.stats[statName] += delta;
    }

    /**
     * Sets a stat to a specific value.
     * @param {string} statName - The name of the stat.
     * @param {number} value - The value to set for the stat.
     */
    setStat(statName, value) {
        this.stats[statName] = value;
    }

    /**
     * Retrieves a player's stat.
     * @param {string} statName - The name of the stat.
     * @returns {number} The value of the stat.
     */
    getStat(statName) {
        return this.stats[statName] || 0;
    }

    /**
     * Removes a stat from the player’s stats.
     * @param {string} statName - The name of the stat to remove.
     */
    removeStat(statName) {
        if (this.stats[statName]) {
            delete this.stats[statName];
        } else {
            console.error(`Stat "${statName}" does not exist.`);
        }
    }

    /**
     * Sets the player's state.
     * @param {string} newState - The new state for the player. Must be a valid PlayerStates value.
     */
    setState(newState) {
        if (!Object.values(PlayerStates).includes(newState)) {
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
            state: this.state,
            stats: this.stats,
            playerId: this.playerId,
            currentSpaceId: this.currentSpaceId,
            rollEngine: this.rollEngine.toJSON(),  // Serialize the RollEngine
            turnsTaken: this.turnsTaken,            // Serialize the number of turns taken
            movementHistory: this.movementHistory.toJSON(),  // Serialize movement history
            effects: this.effects.map(effect => effect.toJSON()) // Serialize effects
        };
    }

    /**
     * Deserializes player data from JSON.
     * @param {Object} json - The JSON object containing player data.
     * @param {EffectFactory} effectFactory - The factory to create effects.
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
        player.stats = json.stats;
        player.currentSpaceId = json.currentSpaceId;
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
