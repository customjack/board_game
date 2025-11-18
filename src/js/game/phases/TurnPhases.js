const TurnPhases = Object.freeze({
    CHANGE_TURN: 'CHANGE_TURN',
    BEGIN_TURN: 'BEGIN_TURN',
    END_TURN: 'END_TURN',
    WAITING_FOR_MOVE: 'WAITING_FOR_MOVE',
    PLAYER_CHOOSING_DESTINATION: 'PLAYER_CHOOSING_DESTINATION',
    PROCESSING_MOVE: 'PROCESSING_MOVE',
    PROCESSING_EVENTS: 'PROCESSING_EVENTS', //Stage for checking event triggers and sorting as a whole
    PROCESSING_EVENT: 'PROCESSING_EVENT', //Stage for checking just one event
});

export default TurnPhases;
