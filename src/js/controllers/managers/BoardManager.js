// BoardManager.js

import Board from '../../models/Board.js';
import BoardRenderConfig from '../../rendering/BoardRenderConfig.js';
import ConnectionRenderer from '../../rendering/ConnectionRenderer.js';
import SpaceRenderer from '../../rendering/SpaceRenderer.js';

export default class BoardManager {
    constructor() {
        this.board = null;
        this.boardContainer = document.getElementById('lobbyBoardContent'); // Assuming a container div for the board

        // Initialize rendering components
        this.renderConfig = new BoardRenderConfig();
        this.connectionRenderer = new ConnectionRenderer(this.renderConfig);
        this.spaceRenderer = new SpaceRenderer(this.renderConfig);
    }

    /**
     * Set the board with a new board instance, and handle board-related updates.
     * @param {Board} newBoard - The new board instance.
     */
    setBoard(newBoard) {
        // Use the Board's toJSON and fromJSON for deep copying
        const boardCopy = Board.fromJSON(newBoard.toJSON());
        this.board = boardCopy;
    }

    /**
     * Determines if the board needs to be updated based on the game state.
     * @param {Board} newBoard - The board object from the latest game state.
     * @returns {boolean} - Returns true if the board should be updated, false otherwise.
     */
    shouldUpdateBoard(newBoard) {
        // Check if the current board and the new board are the same
        if (!this.board || JSON.stringify(this.board.toJSON()) !== JSON.stringify(newBoard.toJSON())) {
            return true; // Update required if there is no board or boards don't match
        }
        return false; // No update required if boards are the same
    }

    /**
     * Set the board container to a new DOM element.
     * @param {HTMLElement} containerElement - The new container element.
     */
    setBoardContainer(containerElement) {
        this.boardContainer = containerElement;
    }

    // Load the default board
    async loadDefaultBoard() {
        console.log("Attempting to load the default board...");
        try {
            const response = await fetch('assets/maps/defaultBoard.json');
            const boardData = await response.json();
            console.log("Default board data loaded:", boardData);

            // Create the Board object from JSON
            this.board = Board.fromJSON(boardData);
            console.log("Board object created:", this.board);

            this.drawBoard();
        } catch (error) {
            console.log(this.boardContainer);
            console.error("Error loading the default board:", error);
        }
    }

    /**
     * Load the board from a JSON file.
     * @param {File} file - The board file to load.
     */
    async loadBoardFromFile(file) {
        if (file && file.type === 'application/json') {
            const text = await this.readFile(file);
            const boardData = JSON.parse(text);
            const board = Board.fromJSON(boardData);
            this.setBoard(board);
            this.drawBoard();
            return board; // Return the loaded board if needed
        } else {
            throw new Error('File must be a valid JSON file.');
        }
    }
    
    // Read the file as text
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (event) => reject(new Error('Failed to read file.'));
            reader.readAsText(file);
        });
    }

    // Function to draw the board as HTML elements
    drawBoard() {
        // Clear the previous board
        this.boardContainer.innerHTML = '';

        // Remove any existing elements with the same IDs from the entire document
        this.board.spaces.forEach(space => {
            const spaceElementId = `space-${space.id}`;
            const existingElement = document.getElementById(spaceElementId);
            if (existingElement) {
                existingElement.parentNode.removeChild(existingElement);
            }
        });

        // Reinitialize render config to pick up theme changes
        this.renderConfig = BoardRenderConfig.fromBoardMetadata(this.board.metadata);
        this.connectionRenderer = new ConnectionRenderer(this.renderConfig);
        this.spaceRenderer = new SpaceRenderer(this.renderConfig);

        // Draw connections between spaces using HTML elements
        this.drawConnections();

        // Create HTML elements for each space using the renderer
        this.board.spaces.forEach(space => {
            this.spaceRenderer.render(
                space,
                this.boardContainer,
                (clickedSpace) => this.handleSpaceClick(clickedSpace)
            );
        });
    }

    // Draw connections between spaces using the connection renderer
    drawConnections() {
        // Keep track of drawn connections to avoid duplicates
        const drawnConnections = new Set();

        this.board.spaces.forEach(space => {
            space.connections.forEach(connection => {
                const targetSpace = connection.target;

                if (targetSpace && (connection.drawConnection === undefined || connection.drawConnection === true)) {
                    // Check if we should draw this connection (avoid duplicates)
                    if (ConnectionRenderer.shouldDrawConnection(space, targetSpace, drawnConnections)) {
                        // Check if bidirectional
                        const isBidirectional = ConnectionRenderer.isBidirectional(space, targetSpace);

                        // Render the connection using the renderer
                        this.connectionRenderer.render(
                            space,
                            targetSpace,
                            this.boardContainer,
                            isBidirectional
                        );
                    }
                }
            });
        });
    }

    // Handle space click interactions
    handleSpaceClick(space) {
        console.log(`Space clicked: ${space.name}, id: ${space.id}`);
        // Add logic here for what happens when a space is clicked (e.g., move player, highlight, etc.)
    }

    // Highlight specific spaces
    highlightSpaces(spaces) {
        spaces.forEach(space => {
            const spaceElement = SpaceRenderer.getSpaceElement(space.id);
            if (spaceElement) {
                this.spaceRenderer.highlight(spaceElement);
            }
        });
    }

    // Remove highlight from all spaces
    removeHighlightFromAll() {
        const highlightedElements = this.boardContainer.querySelectorAll('.highlight');
        highlightedElements.forEach(element => {
            this.spaceRenderer.removeHighlight(element);
        });
    }
}
