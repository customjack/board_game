export default class BaseFactory {
    constructor() {
        if (new.target === BaseFactory) {
            throw new Error("BaseFactory cannot be instantiated directly");
        }
        this.registry = new Map();
    }

    // Method to register types
    register(typeName, classRef) {
        if (this.registry.has(typeName)) {
            throw new Error(`Type "${typeName}" is already registered.`);
        }
        this.registry.set(typeName, classRef);
    }

    // Method to create objects based on registered types
    create(typeName, ...args) {
        const ClassRef = this.registry.get(typeName);
        if (!ClassRef) {
            throw new Error(`Type "${typeName}" is not registered.`);
        }
        return new ClassRef(...args);
    }
}
