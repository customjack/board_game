export const createDemoAnimation = () =>
    class DemoAnimation {
        constructor(options = {}) {
            this.options = options;
        }

        animate() {
            return Promise.resolve({ complete: true, options: this.options });
        }
    };
