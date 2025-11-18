const PlayerStates = Object.freeze({
    SPECTATING: 'SPECTATING',
    PLAYING: 'PLAYING',
    COMPLETED_GAME: 'COMPLETED_GAME',
    DISCONNECTED: 'DISCONNECTED',
    SKIPPING_TURN: 'SKIPPING_TURN',
    WAITING: 'WAITING', // For players waiting for their turn or game start
    ELIMINATED: 'ELIMINATED' // For games with elimination mechanics
});

export default PlayerStates;
