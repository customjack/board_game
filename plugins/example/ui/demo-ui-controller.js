export const createDemoUIController = () =>
    class DemoUIController {
        constructor(dependencies, config = {}) {
            this.dependencies = dependencies;
            this.config = config;
        }

        init() {
            // No-op demo initialization
        }
    };
