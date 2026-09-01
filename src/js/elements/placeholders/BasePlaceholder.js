/**
 * BasePlaceholder - Abstract base class for placeholder tags.
 *
 * Placeholders are rendered inside text fields using {{PLACEHOLDER(args)}} syntax.
 * Subclasses must define a static "type" and implement evaluate().
 */
export default class BasePlaceholder {
    static type = null;

    static getMetadata() {
        return {
            type: this.type,
            displayName: this.type || 'Placeholder',
            description: 'No description provided.',
            args: [],
            template: this.buildTemplate()
        };
    }

    static buildTemplate(args = []) {
        const type = this.type || 'PLACEHOLDER';
        const trimmedArgs = args.filter((arg) => arg !== undefined && arg !== null && String(arg).length);
        const argList = trimmedArgs.length ? `(${trimmedArgs.join(', ')})` : '';
        return `{{${type}${argList}}}`;
    }

    static evaluate() {
        throw new Error(`${this.name} must implement a static evaluate(args, context) method`);
    }
}
