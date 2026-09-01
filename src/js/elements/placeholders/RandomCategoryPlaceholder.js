import BasePlaceholder from './BasePlaceholder.js';
import { randomCategory } from '../../infrastructure/utils/PlaceholderFunctions.js';

export default class RandomCategoryPlaceholder extends BasePlaceholder {
    static type = 'RANDOM_CATEGORY';

    static getMetadata() {
        return {
            type: this.type,
            displayName: 'Random Category',
            description: 'Insert a category for a round-robin naming challenge.',
            args: [],
            template: this.buildTemplate()
        };
    }

    static evaluate(args = [], context) {
        return randomCategory(context);
    }
}
