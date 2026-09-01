import BasePlaceholder from './BasePlaceholder.js';
import { randomWord } from '../../infrastructure/utils/PlaceholderFunctions.js';

export default class RandomWordPlaceholder extends BasePlaceholder {
    static type = 'RANDOM_WORD';

    static getMetadata() {
        return {
            type: this.type,
            displayName: 'Random Word',
            description: 'Insert a random word from the word list.',
            args: [],
            template: this.buildTemplate()
        };
    }

    static evaluate(args = [], context) {
        return randomWord(context);
    }
}
