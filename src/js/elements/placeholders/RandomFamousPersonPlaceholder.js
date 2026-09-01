import BasePlaceholder from './BasePlaceholder.js';
import { randomFamousPerson } from '../../infrastructure/utils/PlaceholderFunctions.js';

export default class RandomFamousPersonPlaceholder extends BasePlaceholder {
    static type = 'RANDOM_FAMOUS_PERSON';

    static getMetadata() {
        return {
            type: this.type,
            displayName: 'Random Famous Person',
            description: 'Insert one random famous person, independently rolled for each occurrence.',
            args: [],
            template: this.buildTemplate()
        };
    }

    static evaluate(args = [], context) {
        return randomFamousPerson(context);
    }
}
