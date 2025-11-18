export default class RollEngine {
    /**
     * Constructs a new RollEngine instance with an optional seed.
     * @param {number} [seed] - The initial seed for the random number generator.
     */
    constructor(seed = null) {
        this.seed = seed || this.generateSeed();
        this.originalSeed = this.seed; // Keep track of the original seed for potential resets.
    }

    /**
     * Generates a random seed if none is provided.
     * @returns {number} A new random seed.
     */
    generateSeed() {
        return Math.floor(Math.random() * 1000000);  // Example of a simple seed generation
    }

    /**
     * Generates a random number using the seed.
     * @param {number} min - The minimum value (inclusive).
     * @param {number} max - The maximum value (inclusive).
     * @param {Function} [distributionFn] - A function defining a custom distribution.
     * @returns {number} A pseudo-random number based on the provided distribution or default.
     */
    roll(min = 1, max = 6, distributionFn = null) {
        const rng = this.seededRandom(this.seed);
        let rollValue;

        if (distributionFn) {
            // Use custom distribution function
            rollValue = distributionFn(rng);
        } else {
            // Default uniform distribution
            rollValue = Math.floor(rng * (max - min + 1)) + min;
        }

        this.updateSeed();
        return rollValue;
    }

    /**
     * Updates the seed to ensure future rolls are different.
     */
    updateSeed() {
        this.seed = (this.seed * 9301 + 49297) % 233280;  // Linear congruential generator (LCG) example
    }

    /**
     * Simple seeded random function, producing a pseudo-random value between 0 and 1.
     * @param {number} seed - The current seed.
     * @returns {number} A pseudo-random value between 0 and 1.
     */
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    /**
     * Resets the seed to the original value.
     */
    resetSeed() {
        this.seed = this.originalSeed;
    }

    /**
     * Manually sets a new seed.
     * @param {number} newSeed - The new seed to set.
     */
    setSeed(newSeed) {
        this.seed = newSeed;
    }

    /**
     * Serializes the RollEngine to a JSON-friendly format.
     * @returns {Object} An object containing the seed.
     */
    toJSON() {
        return {
            seed: this.seed
        };
    }

    /**
     * Reconstructs a RollEngine instance from JSON data.
     * @param {Object} json - The JSON object containing roll engine data.
     * @returns {RollEngine} A new RollEngine instance.
     */
    static fromJSON(json) {
        return new RollEngine(json.seed);
    }
}
