// BoardManager - state-focused board loader (no DOM rendering)

import Board from '../../elements/models/Board.js';
import BoardSchemaValidator from '../utils/BoardSchemaValidator.js';

/**
 * Loads and validates boards; rendering is handled by UI components (e.g., BoardCanvasComponent).
 */
export default class BoardManager {
    constructor(factoryManager = null) {
        this.factoryManager = factoryManager;
        this.board = null;
    }

    /**
     * Set the current board (deep copy).
     * @param {Board} newBoard
     */
    setBoard(newBoard) {
        const boardCopy = Board.fromJSON(newBoard.toJSON(), this.factoryManager);
        this.board = boardCopy;
    }

    /**
     * Determine if the board differs from the current one.
     * @param {Board} newBoard
     * @returns {boolean}
     */
    shouldUpdateBoard(newBoard) {
        if (!this.board) return true;
        return JSON.stringify(this.board.toJSON()) !== JSON.stringify(newBoard.toJSON());
    }

    /**
     * Load the default board (state only).
     */
    async loadDefaultBoard() {
        console.log('Attempting to load the default board...');
        const response = await fetch('assets/maps/defaultBoard.json');
        const boardData = await response.json();

        const validation = BoardSchemaValidator.validateDetailed(boardData);
        if (!validation.valid) {
            console.warn('Default board validation warnings:', validation.errors);
        } else {
            console.log('Board validation passed:', validation.summary);
        }

        this.board = Board.fromJSON(boardData, this.factoryManager);
        console.log('Board object created (state only):', this.board);
        return this.board;
    }

    /**
     * Load a board from a JSON file (state only).
     * @param {File} file
     */
    async loadBoardFromFile(file) {
        if (!file || file.type !== 'application/json') {
            throw new Error('File must be a valid JSON file.');
        }

        const text = await this.readFile(file);
        const boardData = JSON.parse(text);

        const validation = BoardSchemaValidator.validateDetailed(boardData);
        if (!validation.valid) {
            const errorMsg = `Board validation failed:\n${validation.errors.join('\n')}`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        console.log('Board validation passed:', validation.summary);

        const board = Board.fromJSON(boardData, this.factoryManager);
        this.setBoard(board);
        return board;
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(new Error('Failed to read file.'));
            reader.readAsText(file);
        });
    }
}
