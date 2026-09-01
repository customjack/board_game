import BasePlaceholder from './BasePlaceholder.js';
import { randomNumber } from '../../infrastructure/utils/PlaceholderFunctions.js';

export default class RandomNumberPlaceholder extends BasePlaceholder {
    static type = 'RANDOM_NUMBER';

    static getMetadata() {
        return {
            type: this.type,
            displayName: 'Random Number',
            description: 'Generate a random integer between min and max (inclusive).',
            args: [
                { name: 'min', type: 'number', description: 'Minimum value', example: 1 },
                { name: 'max', type: 'number', description: 'Maximum value', example: 6 }
            ],
            template: this.buildTemplate([1, 6])
        };
    }

    static evaluate(args = [], context) {
        const min = Number.isFinite(args[0]) ? args[0] : 1;
        const max = Number.isFinite(args[1]) ? args[1] : 6;
        return randomNumber(min, max, context);
    }
}
