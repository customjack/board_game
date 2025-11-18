import seedrandom from 'seedrandom';

export default class SharedRandomNumberGenerator {
    constructor(seed) {
        this.seed = seed;
        this.usageCount = 0;
    }

    // Get the next random number based on the current usage count
    getNextRandomNumber() {
        const rng = seedrandom(`${this.seed}-${this.usageCount}`);
        this.usageCount++;
        return rng();  // Returns a random number between 0 and 1
    }

    // Getter for the seed
    getSeed() {
        return this.seed;
    }

    // Getter for the usage count
    getUsageCount() {
        return this.usageCount;
    }

    // Serialize the SharedRandomNumberGenerator to JSON
    toJSON() {
        return {
            seed: this.seed,
            usageCount: this.usageCount
        };
    }

    // Deserialize JSON to create a new SharedRandomNumberGenerator instance
    static fromJSON(json) {
        const generator = new SharedRandomNumberGenerator(json.seed);
        generator.usageCount = json.usageCount;
        return generator;
    }
}
