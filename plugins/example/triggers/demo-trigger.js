export const createDemoTrigger = (BaseTrigger) =>
    class DemoTrigger extends BaseTrigger {
        constructor(payload = {}) {
            super('DEMO_TRIGGER', payload);
        }

        isTriggered(context) {
            this.emitEvent(context?.eventBus, 'demoTriggerChecked', {
                space: context?.space,
                gameState: context?.gameState
            });
            return Boolean(this.payload?.always ?? true);
        }

        static getMetadata() {
            return {
                type: 'DEMO_TRIGGER',
                displayName: 'Demo Trigger',
                description: 'Always triggers (configurable).',
                category: 'demo',
                payloadSchema: {
                    always: {
                        type: 'boolean',
                        required: false,
                        default: true,
                        description: 'Return true by default'
                    }
                }
            };
        }
    };
