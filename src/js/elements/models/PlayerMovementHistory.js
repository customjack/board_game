import PlayerMoves from './PlayerMoves';

export default class PlayerMovementHistory {
    constructor() {
        this.history = {}; // Each turn maps to a list of PlayerMoves instances
        this.currentId = 0; // Global counter for assigning unique IDs to moves
    }

    /**
     * Adds a move to the history for a specific turn.
     * @param {number} turn - The turn number.
     * @param {number} spaceId - The space ID of the move.
     * @param {number} remainingMoves - The number of moves remaining after this move.
     */
    addMove(turn, spaceId, remainingMoves) {
        if (!this.history[turn]) {
            this.history[turn] = [];
        }
        // Create a new PlayerMoves instance with a unique ID
        const move = new PlayerMoves(spaceId, remainingMoves, turn, this.currentId++);
        this.history[turn].push(move);
    }

    /**
     * Retrieves the movement history for a specific turn.
     * @param {number} turn - The turn number to retrieve history for.
     * @returns {Array<PlayerMoves>} The list of moves made during the specified turn.
     */
    getHistoryForTurn(turn) {
        return this.history[turn] || [];
    }

    /**
     * Retrieves the complete movement history.
     * @returns {Object} The entire history object, with turn numbers as keys and arrays of PlayerMoves as values.
     */
    getFullHistory() {
        return this.history;
    }

    /**
     * Retrieves the previous move (or a specific move based on the index).
     * @param {number} [index=0] - The index of the move to retrieve (0 for the most recent previous move, 1 for the second previous, etc.).
     * @returns {PlayerMoves|null} The PlayerMoves instance or null if no previous moves exist.
     */
        getPreviousMove(index = 0) {
            const allMoves = this.flattenHistory(); // Flatten and sort all moves
            return allMoves.length > index ? allMoves[allMoves.length - 1 - index] : null;
        }

    /**
     * Flattens the movement history into a sorted array of moves.
     * @returns {Array<PlayerMoves>} A flat array of all moves sorted by their ID.
     */
    flattenHistory() {
        return Object.values(this.history)
            .flat() // Combine all moves into a single array
            .sort((a, b) => a.id - b.id); // Sort by ID to ensure correct order
    }

    /**
     * Rebuilds the history from a flat array of moves.
     * @param {Array<PlayerMoves>} flatHistory - A flat array of PlayerMoves.
     */
    unflattenHistory(flatHistory) {
        this.history = {}; // Reset the history
        flatHistory.forEach(move => {
            const { turn } = move;
            if (!this.history[turn]) {
                this.history[turn] = [];
            }
            this.history[turn].push(move);
        });
    
        // Sort the moves for each turn by id
        Object.keys(this.history).forEach(turn => {
            this.history[turn].sort((a, b) => a.id - b.id);
        });
    
        // Update the currentId to avoid ID collisions
        if (flatHistory.length > 0) {
            this.currentId = Math.max(...flatHistory.map(move => move.id)) + 1;
        }
    }

    /**
     * Checks if the movement history is empty.
     * @returns {boolean} True if the history is empty, otherwise false.
     */
    isEmpty() {
        return Object.keys(this.history).length === 0 || 
            Object.values(this.history).every(turnMoves => turnMoves.length === 0);
    }
    

    /**
     * Serializes the PlayerMovementHistory instance to JSON.
     * @returns {Object} The JSON representation of the movement history.
     */
    toJSON() {
        return {
            history: Object.fromEntries(
                Object.entries(this.history).map(([turn, moves]) => [
                    turn,
                    moves.map(move => move.toJSON())
                ])
            )
        };
    }

    /**
     * Creates a PlayerMovementHistory instance from a JSON object.
     * @param {Object} json - The JSON object containing the movement history data.
     * @returns {PlayerMovementHistory} A new PlayerMovementHistory instance.
     */
    static fromJSON(json) {
        const movementHistory = new PlayerMovementHistory();
        movementHistory.history = Object.fromEntries(
            Object.entries(json.history || {}).map(([turn, moves]) => [
                turn,
                moves.map(moveJson => PlayerMoves.fromJSON(moveJson))
            ])
        );

        // Determine the highest `id` in the deserialized data to continue incrementing IDs correctly
        const allMoves = Object.values(movementHistory.history).flat();
        if (allMoves.length > 0) {
            movementHistory.currentId = Math.max(...allMoves.map(move => move.id)) + 1;
        }

        return movementHistory;
    }
}
