import randomColors from '../../../assets/random_samples/random_colors.json';
import randomSongs from '../../../assets/random_samples/random_songs.json';
import randomWords from '../../../assets/random_samples/random_words.json';
import randomThisOrThatOptions from '../../../assets/random_samples/random_this_or_that.json';
import randomFamousPeople from '../../../assets/random_samples/random_famous_people.json';
import randomCategories from '../../../assets/random_samples/random_categories.json';

function takeRandomItem(items, context) {
    const randomValue = context.gameState.randomGenerator.getNextRandomNumber();
    return items[Math.floor(randomValue * items.length)];
}

export function randomNumber(min, max, context) {
    const randomValue = context.gameState.randomGenerator.getNextRandomNumber();
    return Math.floor(randomValue * (max - min + 1)) + min;
}

export function randomWord(context) {
    return takeRandomItem(randomWords, context);
}

export function randomColor(textOrContext, context) {
    // Handle both calling patterns:
    // 1. randomColor(context) - when called without text argument
    // 2. randomColor(text, context) - when called with text argument
    let text;
    let gameEngine;

    if (context === undefined) {
        // Called with just context: randomColor(context)
        gameEngine = textOrContext;
        text = undefined;
    } else {
        // Called with text and context: randomColor(text, context)
        text = textOrContext;
        gameEngine = context;
    }

    const randomValue = gameEngine.gameState.randomGenerator.getNextRandomNumber();
    const color = randomColors[Math.floor(randomValue * randomColors.length)];

    // If text is provided, wrap it in a colored span
    if (text !== undefined && text !== null && text !== '') {
        return `<span style="color: ${color};">${text}</span>`;
    }

    // Otherwise, just return the color hex code
    return color;
}

export function randomSong(context) {
    return takeRandomItem(randomSongs, context).track_name;
}

export function randomThisOrThat(context) {
    return takeRandomItem(randomThisOrThatOptions, context);
}

export function randomCategory(context) {
    return takeRandomItem(randomCategories, context);
}

export function randomFamousPerson(context) {
    return takeRandomItem(randomFamousPeople, context);
}
