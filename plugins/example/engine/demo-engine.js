export const createDemoEngine = (BaseGameEngine) =>
    class DemoGameEngine extends BaseGameEngine {
        constructor(dependencies, config = {}) {
            super(dependencies, config);
            this.demoMessages = [];
        }

        init() {
            this.initialized = true;
            this.emitEvent('demoEngineInit');
        }

        updateGameState(gameState) {
            this.gameState = gameState;
            this.emitEvent('demoGameStateUpdated', { counter: gameState.demoCounter });
        }

        async onPlayerAction(playerId, actionType, actionData) {
            this.demoMessages.push({ playerId, actionType, actionData });
            this.emitEvent('demoPlayerAction', { playerId, actionType, actionData });
            return { success: true, stored: this.demoMessages.length };
        }

        cleanup() {
            this.demoMessages = [];
            this.running = false;
            this.initialized = false;
        }

        getEngineType() {
            return 'demo-engine';
        }

        getRequiredUIComponents() {
            return [{
                id: 'demo-ui',
                type: 'demo-ui',
                required: false,
                description: 'Simple demo UI component',
                config: { label: 'Demo UI' },
                events: { emits: ['demoClick'], listens: [] }
            }];
        }

        getOptionalUIComponents() {
            return [];
        }
    };
