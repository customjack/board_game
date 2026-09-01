import BasePlaceholder from './BasePlaceholder.js';
import { randomColor } from '../../infrastructure/utils/PlaceholderFunctions.js';

export default class RandomColorPlaceholder extends BasePlaceholder {
    static type = 'RANDOM_COLOR';

    static getMetadata() {
        return {
            type: this.type,
            displayName: 'Random Color',
            description: 'Insert a random color hex code, or wrap provided text in a random color.',
            args: [
                { name: 'text', type: 'string', description: 'Optional text to colorize', example: 'Lucky!' }
            ],
            template: this.buildTemplate()
        };
    }

    static evaluate(args = [], context) {
        if (args.length && args[0] !== undefined && args[0] !== null && String(args[0]).length) {
            return randomColor(String(args[0]), context);
        }
        return randomColor(context);
    }
}
