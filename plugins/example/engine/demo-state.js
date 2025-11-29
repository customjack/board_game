export const createDemoState = (BaseGameState) =>
    class DemoGameState extends BaseGameState {
        constructor(options = {}) {
            super(options);
            this.demoCounter = options.demoCounter || 0;
        }

        getStateType() {
            return 'demo-state';
        }

        incrementDemoCounter() {
            this.demoCounter += 1;
            this.incrementVersion();
        }

        getDeltaFields() {
            return [...super.getDeltaFields(), 'demoCounter'];
        }

        toJSON() {
            return {
                ...super.toJSON(),
                demoCounter: this.demoCounter
            };
        }

        static fromJSON(json, factoryManager) {
            const state = super.fromJSON(json, factoryManager);
            state.demoCounter = json.demoCounter || 0;
            return state;
        }
    };
