import BaseRegistry from './BaseRegistry';  // Import the base registry class

export default class PlaceholderRegistry extends BaseRegistry {
    constructor() {
        super();  // Call the parent constructor to initialize the registry
    }

    // Register a placeholder with a name and a generator function
    register(name, generatorFunction) {
        if (typeof generatorFunction !== 'function') {
            throw new Error('Generator function must be a function.');
        }

        const upperCaseName = name.toUpperCase();  // Convert name to uppercase
        super.register(upperCaseName, generatorFunction);  // Use the inherited method from BaseRegistry with the uppercase name
    }

    // Unregister (remove) a placeholder by its name
    unregister(name) {
        const upperCaseName = name.toUpperCase();  // Convert name to uppercase
        if (this.registry[upperCaseName]) {
            super.unregister(upperCaseName);  // Use the inherited method from BaseRegistry
            //console.log(`Placeholder '${upperCaseName}' unregistered.`);
        } else {
            console.warn(`Placeholder '${upperCaseName}' not found.`);
        }
    }

    // Replace placeholders in a given text
    replacePlaceholders(text, context) {
        return text.replace(/{{(.*?)}}/g, (match, expression) => {
            const [name, argsString] = this._parseExpression(expression);
            const upperCaseName = name.toUpperCase();  // Convert name to uppercase
            const generator = this.registry[upperCaseName];  // Access the registry using the uppercase name

            if (!generator) {
                console.warn(`No generator found for placeholder: ${upperCaseName}`);
                return match; // Keep the original placeholder if no generator is found
            }

            const args = argsString ? this._parseArgs(argsString) : [];

            // Check if the generator expects both args and context (gameEngine)
            if (generator.length === args.length + 1) {
                // Generator expects arguments + context (gameEngine)
                return generator(...args, context);  // Pass both arguments and context
            } else {
                // Generator expects only arguments (no context)
                return generator(...args);  // Pass arguments as needed
            }
        });
    }


    // Helper method to parse the expression and extract name and arguments
    _parseExpression(expression) {
        const [name, ...args] = expression.split(/\((.*?)\)/).filter(Boolean);
        return [name.trim(), args.join('')];
    }

    // Helper method to parse arguments passed to the placeholder function
    _parseArgs(argsString) {
        // Split arguments by commas and trim whitespace
        return argsString.split(',').map(arg => {
            const trimmed = arg.trim();
            // Try to parse numbers; otherwise, return strings
            const num = Number(trimmed);
            return isNaN(num) ? trimmed : num;
        });
    }
}
