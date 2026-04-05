import BaseRegistry from '../../core/base/BaseRegistry';  // Import the base registry class
import BasePlaceholder from '../../elements/placeholders/BasePlaceholder.js';

export default class PlaceholderRegistry extends BaseRegistry {
    constructor() {
        super();  // Call the parent constructor to initialize the registry
    }

    // Register a placeholder with a name and a generator function or class
    register(name, placeholder) {
        let resolvedName = name;
        let resolvedPlaceholder = placeholder;

        if (typeof name === 'function' && !placeholder) {
            resolvedPlaceholder = name;
            resolvedName = resolvedPlaceholder?.type || resolvedPlaceholder?.placeholderType || resolvedPlaceholder?.name;
        }

        if (!resolvedName || typeof resolvedName !== 'string') {
            throw new Error('Placeholder must have a valid type identifier.');
        }

        const upperCaseName = resolvedName.toUpperCase();  // Convert name to uppercase

        if (resolvedPlaceholder?.prototype instanceof BasePlaceholder) {
            super.register(upperCaseName, resolvedPlaceholder);
            return;
        }

        if (typeof resolvedPlaceholder !== 'function') {
            throw new Error('Placeholder must be a subclass of BasePlaceholder or a function.');
        }

        super.register(upperCaseName, resolvedPlaceholder);  // Use the inherited method from BaseRegistry with the uppercase name
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

    getAllMetadata() {
        const metadata = {};
        Object.entries(this.registry).forEach(([type, entry]) => {
            if (entry?.getMetadata) {
                metadata[type] = entry.getMetadata();
            } else {
                metadata[type] = {
                    type,
                    displayName: type,
                    description: 'No description provided.',
                    args: [],
                    template: `{{${type}}}`
                };
            }
        });
        return metadata;
    }

    getMetadata(type) {
        if (!type) return null;
        const entry = this.registry[type.toUpperCase()];
        if (!entry) return null;
        return entry.getMetadata ? entry.getMetadata() : {
            type,
            displayName: type,
            description: 'No description provided.',
            args: [],
            template: `{{${type}}}`
        };
    }

    // Replace placeholders in a given text
    replacePlaceholders(text, context, depth = 0) {
        // Prevent infinite recursion
        if (depth > 10) {
            console.warn('Maximum placeholder nesting depth reached (10)');
            return text;
        } 

        let currentText = text;
        let iterations = 0;
        const maxIterations = 20;

        while (iterations < maxIterations) {
            const { updatedText, changed } = this._replaceOnePass(currentText, context, depth);
            currentText = updatedText;
            if (!changed) break;
            iterations++;
        }

        if (iterations >= maxIterations) {
            console.warn('Maximum placeholder replacement iterations reached');
        }

        return currentText;
    }

    // Replace placeholders in a single pass from left to right
    _replaceOnePass(text, context, depth) {
        let cursor = 0;
        let result = '';
        let changed = false;

        while (cursor < text.length) {
            const next = this._findNextPlaceholder(text, cursor);
            if (!next) {
                result += text.slice(cursor);
                break;
            }

            const { start, end, expression } = next;
            result += text.slice(cursor, start);

            result += this._evaluatePlaceholder(expression, context, depth);
            cursor = end;
            changed = true;
        }

        return { updatedText: result, changed };
    }

    _evaluatePlaceholder(expression, context, depth) {
        const [name, argsString] = this._parseExpression(expression);
        const upperCaseName = name.toUpperCase();  // Convert name to uppercase
        const placeholder = this.registry[upperCaseName];  // Access the registry using the uppercase name

        if (!placeholder) {
            console.warn(`No generator found for placeholder: ${upperCaseName}`);
            return `{{${expression}}}`; // Keep the original placeholder if no generator is found
        }

        let args = argsString ? this._parseArgs(argsString) : [];
        args = args.map(arg => {
            if (typeof arg === 'string' && arg.includes('{{')) {
                return this.replacePlaceholders(arg, context, depth + 1);
            }
            return arg;
        });

        try {
            if (typeof placeholder === 'function' && placeholder.prototype instanceof BasePlaceholder) {
                return placeholder.evaluate(args, context);
            }
            if (typeof placeholder?.evaluate === 'function') {
                return placeholder.evaluate(args, context);
            }
            if (typeof placeholder === 'function') {
                // Always pass context as the last argument so placeholders that rely on
                // game state don't break when called without explicit args (e.g. RANDOM_COLOR()).
                return placeholder(...args, context);
            }
        } catch (error) {
            console.warn(`Error executing placeholder ${upperCaseName}`, error);
            return `{{${expression}}}`;
        }

        console.warn(`Placeholder ${upperCaseName} is not callable`);
        return `{{${expression}}}`;
    }

    // Find the next balanced placeholder, accounting for nested {{ }}
    _findNextPlaceholder(text, fromIndex = 0) {
        const start = text.indexOf('{{', fromIndex);
        if (start === -1) return null;

        let depth = 0;
        let i = start;
        while (i < text.length - 1) {
            const pair = text[i] + text[i + 1];
            if (pair === '{{') {
                depth++;
                i += 2;
                continue;
            }
            if (pair === '}}' && depth > 0) {
                depth--;
                i += 2;
                if (depth === 0) {
                    const end = i;
                    return {
                        start,
                        end,
                        expression: text.slice(start + 2, end - 2).trim()
                    };
                }
                continue;
            }
            i++;
        }

        return null;
    }


    // Helper method to parse the expression and extract name and arguments
    _parseExpression(expression) {
        // Find the first opening parenthesis
        const firstParenIndex = expression.indexOf('(');

        if (firstParenIndex === -1) {
            // No arguments
            return [expression.trim(), ''];
        }

        // Everything before the first '(' is the name
        const name = expression.substring(0, firstParenIndex).trim();

        // Find the matching closing parenthesis by counting brackets
        let depth = 0;
        let argsStart = firstParenIndex + 1;
        let argsEnd = argsStart;

        for (let i = firstParenIndex; i < expression.length; i++) {
            if (expression[i] === '(') {
                depth++;
            } else if (expression[i] === ')') {
                depth--;
                if (depth === 0) {
                    argsEnd = i;
                    break;
                }
            }
        }

        // Extract the arguments string (everything between the matching parentheses)
        const argsString = expression.substring(argsStart, argsEnd);

        return [name, argsString];
    }

    // Helper method to parse arguments passed to the placeholder function
    _parseArgs(argsString) {
        const args = [];
        let current = '';
        let parenDepth = 0;
        let braceDepth = 0;

        for (let i = 0; i < argsString.length; i++) {
            const char = argsString[i];
            const next = argsString[i + 1];

            if (char === '{' && next === '{') {
                braceDepth++;
                current += '{{';
                i++;
                continue;
            }

            if (char === '}' && next === '}' && braceDepth > 0) {
                braceDepth--;
                current += '}}';
                i++;
                continue;
            }

            if (char === '(') {
                parenDepth++;
                current += char;
                continue;
            }

            if (char === ')' && parenDepth > 0) {
                parenDepth--;
                current += char;
                continue;
            }

            if (char === ',' && parenDepth === 0 && braceDepth === 0) {
                const trimmed = current.trim();
                if (trimmed !== '') {
                    const num = Number(trimmed);
                    args.push(isNaN(num) ? trimmed : num);
                }
                current = '';
                continue;
            }

            current += char;
        }

        const trimmed = current.trim();
        if (trimmed !== '') {
            const num = Number(trimmed);
            args.push(isNaN(num) ? trimmed : num);
        }

        return args;
    }
}
