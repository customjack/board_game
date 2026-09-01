import BasePlaceholder from './BasePlaceholder.js';
import { randomThisOrThat } from '../../infrastructure/utils/PlaceholderFunctions.js';

export default class RandomThisOrThatPlaceholder extends BasePlaceholder {
    static type = 'RANDOM_THIS_OR_THAT';

    static getMetadata() {
        return {
            type: this.type,
            displayName: 'Random This or That',
            description: 'Insert a random either-or question for a secret choice drinking round.',
            args: [],
            template: this.buildTemplate()
        };
    }

    static evaluate(args = [], context) {
        return randomThisOrThat(context);
    }
}
