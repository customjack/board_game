import BasePlaceholder from './BasePlaceholder.js';
import { randomSong } from '../../infrastructure/utils/PlaceholderFunctions.js';

export default class RandomSongPlaceholder extends BasePlaceholder {
    static type = 'RANDOM_SONG';

    static getMetadata() {
        return {
            type: this.type,
            displayName: 'Random Song',
            description: 'Insert a random song title from the playlist.',
            args: [],
            template: this.buildTemplate()
        };
    }

    static evaluate(args = [], context) {
        return randomSong(context);
    }
}
