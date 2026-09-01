import RandomNumberPlaceholder from './RandomNumberPlaceholder.js';
import RandomWordPlaceholder from './RandomWordPlaceholder.js';
import RandomColorPlaceholder from './RandomColorPlaceholder.js';
import RandomSongPlaceholder from './RandomSongPlaceholder.js';
import RandomThisOrThatPlaceholder from './RandomThisOrThatPlaceholder.js';
import RandomFamousPersonPlaceholder from './RandomFamousPersonPlaceholder.js';
import RandomCategoryPlaceholder from './RandomCategoryPlaceholder.js';
import CurrentPlayerNamePlaceholder from './CurrentPlayerNamePlaceholder.js';

export const builtInPlaceholderTypes = [
    RandomNumberPlaceholder,
    RandomWordPlaceholder,
    RandomColorPlaceholder,
    RandomSongPlaceholder,
    RandomThisOrThatPlaceholder,
    RandomFamousPersonPlaceholder,
    RandomCategoryPlaceholder,
    CurrentPlayerNamePlaceholder
];

export function registerBuiltInPlaceholders(placeholderRegistry) {
    builtInPlaceholderTypes.forEach((PlaceholderType) => {
        const generator = (...values) => {
            const context = values.pop();
            return PlaceholderType.evaluate(values, context);
        };
        placeholderRegistry.register(
            PlaceholderType.type,
            generator,
            PlaceholderType.getMetadata()
        );
    });

    return builtInPlaceholderTypes.length;
}
