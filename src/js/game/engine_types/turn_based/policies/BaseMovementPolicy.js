/**
 * BaseMovementPolicy - defines how movement/rolling decisions are made
 */
export default class BaseMovementPolicy {
    /**
     * Roll for the provided player.
     * @param {Object} player
     * @returns {number}
     */
    rollForPlayer(player) { // eslint-disable-line no-unused-vars
        throw new Error('rollForPlayer() must be implemented by movement policy');
    }
}
