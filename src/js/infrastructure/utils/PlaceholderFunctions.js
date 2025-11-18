import randomColors from '../../assets/random_samples/random_colors.json';
import randomSongs from '../../assets/random_samples/random_songs.json';
import randomWords from '../../assets/random_samples/random_words.json';

export function randomNumber(min, max, context) {
    const randomValue = context.gameState.randomGenerator.getNextRandomNumber();
    return Math.floor(randomValue * (max - min + 1)) + min;
}

export function randomWord(context) {
    const randomValue = context.gameState.randomGenerator.getNextRandomNumber();
    return randomWords[Math.floor(randomValue * randomWords.length)];
}

export function randomColor(context) {
    const randomValue = context.gameState.randomGenerator.getNextRandomNumber();
    return randomColors[Math.floor(randomValue * randomColors.length)];
}

export function randomSong(context) {
    const randomValue = context.gameState.randomGenerator.getNextRandomNumber();
    return randomSongs[Math.floor(randomValue * randomSongs.length)].track_name;
}
