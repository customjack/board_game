export const createDemoPhaseStateMachine = (PhaseStateMachine, GamePhases, TurnPhases) =>
    class DemoPhaseStateMachine extends PhaseStateMachine {
        constructor(config = {}, eventBus = null) {
            super({
                gamePhases: config.gamePhases || Object.values(GamePhases),
                turnPhases: config.turnPhases || Object.values(TurnPhases)
            }, eventBus);
        }
    };
