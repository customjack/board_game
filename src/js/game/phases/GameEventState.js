// GameEventState.js
const GameEventState = Object.freeze({
    READY: 'READY',
    CHECKING_TRIGGER: 'CHECKING_TRIGGER',
    TRIGGERED: 'TRIGGERED',
    PROCESSING_ACTION: 'PROCESSING_ACTION',
    COMPLETED_ACTION: 'COMPLETED_ACTION',
    INACTIVE: 'INACTIVE'
});

export default GameEventState;
