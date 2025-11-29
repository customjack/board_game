export const createDemoTurnManager = () =>
    class DemoTurnManager {
        constructor(gameState, config = {}) {
            this.gameState = gameState;
            this.config = config;
        }

        getCurrentPlayer() {
            return this.gameState?.players?.[0] || null;
        }
    };
