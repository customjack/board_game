export default class FactoryManager {
    constructor() {
        this.factories = new Map();
    }

    registerFactory(factoryName, factoryInstance) {
        if (this.factories.has(factoryName)) {
            throw new Error(`Factory "${factoryName}" is already registered.`);
        }
        this.factories.set(factoryName, factoryInstance);
    }

    getFactory(factoryName) {
        const factory = this.factories.get(factoryName);
        if (!factory) {
            throw new Error(`Factory "${factoryName}" not found.`);
        }
        return factory;
    }
}
