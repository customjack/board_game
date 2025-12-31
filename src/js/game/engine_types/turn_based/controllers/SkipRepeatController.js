/**
 * SkipRepeatController - determines repeat turn requests emitted by effects
 */
export default class SkipRepeatController {
    constructor(eventBus) {
        this.eventBus = eventBus;
    }

    shouldRepeatTurn(effectScheduler, gameState, engine) {
        let repeatTurnRequested = false;
        const repeatTurnHandler = () => {
            repeatTurnRequested = true;
        };

        this.eventBus.on('effect:repeat_turn', repeatTurnHandler);
        effectScheduler.enactAll(gameState, engine);
        this.eventBus.off('effect:repeat_turn', repeatTurnHandler);

        return repeatTurnRequested;
    }
}
