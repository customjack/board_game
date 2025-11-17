import BaseGameState from './BaseGameState.js';

export default class TroubleGameState extends BaseGameState {
    constructor(config) {
        super(config);
    }

    getStateType() {
        return 'trouble';
    }
}
