export const createDemoEventProcessor = () =>
    class DemoEventProcessor {
        constructor(config = {}) {
            this.config = config;
        }

        process(event) {
            return { ...event, processed: true };
        }
    };
