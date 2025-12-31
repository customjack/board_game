/**
 * BaseTurnController - common contract for turn flow controllers
 */
export default class BaseTurnController {
    registerPhaseHandlers() {
        throw new Error('registerPhaseHandlers() must be implemented');
    }
}
