export const createDemoUIComponent = () =>
    class DemoUIComponent {
        constructor(config = {}) {
            this.config = config;
            this.renderCount = 0;
        }

        init() {
            this.renderCount++;
        }
    };
