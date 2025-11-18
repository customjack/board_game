export default class PlayerMoves {
    /**
     * Constructs a new PlayerMoves instance.
     * @param {number} spaceId - The ID of the space visited.
     * @param {number} remainingMoves - The number of moves remaining after this move.
     * @param {number} turn - The turn number in which this move occurred.
     * @param {number} id - The unique ID of the move (order in which it was added).
     * @param {boolean} [isBacktracked=false] - Flag to indicate if the move was backtracked.
     */
    constructor(spaceId, remainingMoves, turn, id, isBacktracked = false) {
        this.spaceId = spaceId;
        this.remainingMoves = remainingMoves;
        this.turn = turn;
        this.id = id; // Unique identifier for the move
        this.isBacktracked = isBacktracked; // New flag to mark if move was backtracked
    }

    /**
     * Serializes the PlayerMoves instance to JSON.
     * @returns {Object} The JSON representation of the move.
     */
    toJSON() {
        return {
            spaceId: this.spaceId,
            remainingMoves: this.remainingMoves,
            turn: this.turn,
            id: this.id,
            isBacktracked: this.isBacktracked // Include the backtracked flag in JSON
        };
    }

    /**
     * Creates a PlayerMoves instance from a JSON object.
     * @param {Object} json - The JSON object containing the move data.
     * @returns {PlayerMoves} A new PlayerMoves instance.
     */
    static fromJSON(json) {
        return new PlayerMoves(json.spaceId, json.remainingMoves, json.turn, json.id, json.isBacktracked);
    }

    /**
     * Marks the move as backtracked.
     */
    markAsBacktracked() {
        this.isBacktracked = true;
    }
}
