/**
 * BaseEffectScheduler - abstract scheduler for applying player effects
 * Implementations should perform effect enactment and cleanup.
 */
export default class BaseEffectScheduler {
    /**
     * Enact all effects on the provided game state.
     * @param {Object} gameState
     * @param {Object} engine - engine context for effect execution
     */
    enactAll(gameState, engine) { // eslint-disable-line no-unused-vars
        throw new Error('enactAll() must be implemented by effect scheduler');
    }
}
