export const createDemoStat = (BaseStat) =>
    class DemoStat extends BaseStat {
        constructor(id = 'demo-stat', initialValue = 0, metadata = {}) {
            super(id, initialValue, metadata);
        }

        onChange(oldValue, newValue) {
            this.metadata.lastChange = { oldValue, newValue };
        }

        static getMetadata() {
            return {
                type: 'DemoStat',
                displayName: 'Demo Stat',
                description: 'Tracks a numeric counter for demonstration.',
                category: 'demo',
                defaultValue: 0,
                valueType: 'number'
            };
        }
    };
