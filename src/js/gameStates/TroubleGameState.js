import BaseGameState from './BaseGameState.js';
import TurnPhases from '../enums/TurnPhases.js';

const TroublePhases = {
    WAITING_FOR_ROLL: 'WAITING_FOR_ROLL',
    WAITING_FOR_SELECTION: 'WAITING_FOR_SELECTION'
};

export { TroublePhases };

export default class TroubleGameState extends BaseGameState {
    constructor(config = {}) {
        super(config);
        this.currentPlayerIndex = config.currentPlayerIndex || 0;
        this.troublePhase = config.troublePhase || TroublePhases.WAITING_FOR_ROLL;
        this.turnPhase = config.turnPhase || TurnPhases.WAITING_FOR_MOVE;
    }

    getStateType() {
        return 'trouble';
    }

    getCurrentPlayer() {
        if (!Array.isArray(this.players) || this.players.length === 0) {
            return null;
        }
        return this.players[this.currentPlayerIndex % this.players.length];
    }

    setCurrentPlayerIndex(index) {
        if (!Array.isArray(this.players) || this.players.length === 0) {
            return false;
        }

        if (typeof index !== 'number' || index < 0 || index >= this.players.length) {
            return false;
        }

        this.currentPlayerIndex = index;
        return true;
    }

    getCurrentPlayerIndex() {
        return this.currentPlayerIndex;
    }

    setTurnPhase(phase) {
        this.turnPhase = phase;
    }

    setTroublePhase(phase) {
        if (Object.values(TroublePhases).includes(phase)) {
            this.troublePhase = phase;
        }
    }

    getTroublePhase() {
        return this.troublePhase;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            currentPlayerIndex: this.currentPlayerIndex,
            troublePhase: this.troublePhase,
            turnPhase: this.turnPhase
        };
    }

    static fromJSON(json, factoryManager) {
        const state = super.fromJSON(json, factoryManager);
        state.currentPlayerIndex = json.currentPlayerIndex || 0;
        state.troublePhase = json.troublePhase || TroublePhases.WAITING_FOR_ROLL;
        state.turnPhase = json.turnPhase || TurnPhases.WAITING_FOR_MOVE;
        return state;
    }
}
