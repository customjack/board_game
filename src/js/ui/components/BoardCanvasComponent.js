/**
 * BoardCanvasComponent - Game board display and rendering
 *
 * Manages the board canvas, rendering spaces, connections, and pieces
 */
import BaseUIComponent from '../BaseUIComponent.js';
import Board from '../../elements/models/Board.js';
import BoardRenderConfig from '../../rendering/BoardRenderConfig.js';
import ConnectionRenderer from '../../rendering/ConnectionRenderer.js';
import SpaceRenderer from '../../rendering/SpaceRenderer.js';
import BoardSchemaValidator from '../../infrastructure/utils/BoardSchemaValidator.js';
import BoardViewport from '../BoardViewport.js';

export default class BoardCanvasComponent extends BaseUIComponent {
    /**
     * Create a board canvas component
     * @param {Object} config - Component configuration
     */
    constructor(config = {}) {
        super({
            id: 'boardCanvas',
            containerId: config.containerElementId || 'lobbyBoardContent',
            ...config
        });

        this.board = null;
        this.highlightedSpaceIds = new Set();

        // Rendering components
        this.renderConfig = new BoardRenderConfig();
        this.connectionRenderer = new ConnectionRenderer(this.renderConfig);
        this.spaceRenderer = new SpaceRenderer(this.renderConfig);

        // Viewport for panning/zooming
        this.viewport = null;

        // Track container element ID for switching contexts
        this.currentContainerId = config.containerElementId || 'lobbyBoardContent';
    }

    /**
     * Initialize the component
     */
    init() {
        super.init();

        if (!this.container) {
            console.warn(`Board container ${this.currentContainerId} not found`);
        }
    }

    /**
     * Set the board container (e.g., switch between lobby and game)
     * @param {string} containerElementId - New container element ID
     */
    setBoardContainer(containerElementId) {
        this.currentContainerId = containerElementId;
        this.containerId = containerElementId;
        this.container = this.getElement(containerElementId, false); // Force fresh lookup
        this.elements = {}; // Clear element cache
    }

    /**
     * Set the board
     * @param {Board} newBoard - New board instance
     */
    setBoard(newBoard) {
        // Deep copy using toJSON/fromJSON
        this.board = Board.fromJSON(newBoard.toJSON(), this.factoryManager);
        this.updateRenderersFromBoard();
        this.emit('boardChanged', { board: this.board });
    }

    /**
     * Check if board needs updating
     * @param {Board} newBoard - New board to compare
     * @returns {boolean} True if update needed
     */
    shouldUpdate(newBoard) {
        if (!this.board) {
            return true;
        }

        // Compare JSON representations
        return JSON.stringify(this.board.toJSON()) !== JSON.stringify(newBoard.toJSON());
    }

    /**
     * Update component based on game state
     * @param {GameState} gameState - Current game state
     * @param {Object} context - Additional context
     */
    update(gameState, context = {}) {
        if (!this.initialized) return;

        // Refresh container reference if needed (handles late DOM initialization)
        if (!this.container) {
            this.container = this.getElement(this.currentContainerId, false);
        }

        // Don't render if container doesn't exist yet
        if (!this.container) {
            return;
        }

        // Check if board changed
        if (gameState.board && this.shouldUpdate(gameState.board)) {
            this.setBoard(gameState.board);
            this.render();
        }
    }

    /**
     * Load the default board
     * @returns {Promise<void>}
     */
    async loadDefaultBoard() {
        console.log('Loading default board...');

        try {
            const response = await fetch('assets/maps/default-board.zip');
            if (!response.ok) {
                throw new Error(`Failed to fetch default board: ${response.status} ${response.statusText}`);
            }
            const blob = await response.blob();
            const { default: BoardBundleLoader } = await import('../../systems/storage/BoardBundleLoader.js');
            const boardData = await BoardBundleLoader.loadBundle(blob);
            console.log('Default board data loaded:', boardData);

            // Validate board data
            const validation = BoardSchemaValidator.validateDetailed(boardData);
            if (!validation.valid) {
                console.warn('Default board validation warnings:', validation.errors);
            } else {
                console.log('Board validation passed:', validation.summary);
            }

            // Create board object
            this.board = Board.fromJSON(boardData, this.factoryManager);
            this.updateRenderersFromBoard();
            console.log('Board object created:', this.board);

            this.render();
            this.emit('boardLoaded', { board: this.board });
        } catch (error) {
            console.error('Error loading default board:', error);
            this.emit('boardLoadError', { error });
            throw error;
        }
    }

    /**
     * Load board from file
     * @param {File} file - Board JSON file
     * @returns {Promise<void>}
     */
    async loadBoardFromFile(file) {
        if (!file || file.type !== 'application/json') {
            throw new Error('Invalid file type. Please provide a JSON file.');
        }

        try {
            const text = await this.readFile(file);
            const boardData = JSON.parse(text);

            // Validate board data
            const validation = BoardSchemaValidator.validateDetailed(boardData);
            if (!validation.valid) {
                const errorMsg = `Board validation failed:\n${validation.errors.join('\n')}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }

            console.log('Board validation passed:', validation.summary);

            // Create and set board
            this.board = Board.fromJSON(boardData, this.factoryManager);
            this.updateRenderersFromBoard();
            this.render();
            this.emit('boardLoaded', { board: this.board, source: 'file' });
        } catch (error) {
            console.error('Error loading board from file:', error);
            this.emit('boardLoadError', { error });
            throw error;
        }
    }

    /**
     * Read a file as text
     * @param {File} file - File to read
     * @returns {Promise<string>} File contents
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }

    /**
     * Render the board
     */
    render() {
        // Refresh container reference if needed
        if (!this.container) {
            this.container = this.getElement(this.currentContainerId, false);
        }

        if (!this.container) {
            console.warn('Cannot render board - container not found');
            return;
        }

        if (!this.board) {
            console.warn('Cannot render board - no board loaded');
            return;
        }

        // Clear existing content but preserve viewport controls by recreating viewport each render
        if (this.viewport) {
            this.viewport.destroy();
            this.viewport = null;
        }
        this.container.innerHTML = '';

        // Initialize viewport if not already done
        if (!this.viewport) {
            this.viewport = new BoardViewport(this.container);
        }

        // Create HTML render surface so spaces remain interactive
        const renderSurface = document.createElement('div');
        renderSurface.classList.add('board-render-surface');
        renderSurface.style.position = 'relative';
        renderSurface.style.width = 'fit-content';
        renderSurface.style.height = 'fit-content';
        renderSurface.style.pointerEvents = 'auto';

        // Add custom background if specified in board metadata
        const bgImage = this.board.metadata?.renderConfig?.backgroundImage;
        const bgColor = this.board.metadata?.renderConfig?.backgroundColor;

        if (bgImage) {
            renderSurface.style.backgroundImage = `url(${bgImage})`;
            renderSurface.style.backgroundSize = 'cover';
            renderSurface.style.backgroundPosition = 'center';
            renderSurface.style.backgroundRepeat = 'no-repeat';
        }
        if (bgColor) {
            renderSurface.style.backgroundColor = bgColor;
        }

        this.container.appendChild(renderSurface);
        this.viewport.setBoardSurface(renderSurface);

        // Render connections first (so they appear behind spaces)
        const drawnConnections = new Set();
        this.board.spaces.forEach(space => {
            space.connections.forEach(connection => {
                if (connection.drawConnection === false) {
                    return;
                }

                const targetSpace = connection.target || this.board.getSpace(connection.targetId);
                if (!targetSpace) {
                    return;
                }

                if (!ConnectionRenderer.shouldDrawConnection(space, targetSpace, drawnConnections)) {
                    return;
                }

                const isBidirectional = ConnectionRenderer.isBidirectional(space, targetSpace);
                this.connectionRenderer.render(
                    space,
                    targetSpace,
                    renderSurface,
                    isBidirectional
                );
            });
        });

        // Render spaces - SpaceRenderer appends to container directly
        this.board.spaces.forEach(space => {
            this.spaceRenderer.render(space, renderSurface, (clickedSpace) => this.handleSpaceClick(clickedSpace));
        });

        this.emit('boardRendered', { spaceCount: this.board.spaces.length });
    }

    /**
     * Get the current board
     * @returns {Board|null} Current board instance
     */
    getBoard() {
        return this.board;
    }

    /**
     * Update render configuration and helper renderers based on current board metadata
     */
    updateRenderersFromBoard() {
        if (!this.board) {
            return;
        }

        this.renderConfig = BoardRenderConfig.fromBoardMetadata(this.board.metadata);
        this.connectionRenderer = new ConnectionRenderer(this.renderConfig);
        this.spaceRenderer = new SpaceRenderer(this.renderConfig);
    }

    /**
     * Handle general space clicks (logging/debugging)
     * @param {Space} space - Clicked space
     */
    handleSpaceClick(space) {
        if (!space) {
            return;
        }

        console.log(`Space clicked: ${space.name || 'Unnamed'} (id: ${space.id}, type: ${space.type})`, space);
        this.emit('spaceClicked', { space });
    }

    /**
     * Highlight a list of space IDs
     * @param {string[]} spaceIds
     */
    highlightValidMoves(spaceIds = []) {
        this.clearHighlights();
        (spaceIds || []).forEach(id => {
            const el = SpaceRenderer.getSpaceElement(id);
            if (el) {
                el.classList.add('highlight');
                this.highlightedSpaceIds.add(id);
            }
        });
    }

    /**
     * Clear any highlighted spaces
     */
    clearHighlights() {
        this.highlightedSpaceIds.forEach(id => {
            const el = SpaceRenderer.getSpaceElement(id);
            if (el) {
                el.classList.remove('highlight');
            }
        });
        this.highlightedSpaceIds.clear();
    }

    /**
     * Clear the board
     */
    clear() {
        if (this.viewport) {
            this.viewport.destroy();
            this.viewport = null;
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.board = null;
        this.emit('boardCleared');
    }

    /**
     * Get component state
     * @returns {Object} Component state
     */
    getState() {
        return {
            ...super.getState(),
            hasBoard: !!this.board,
            spaceCount: this.board ? this.board.spaces.length : 0,
            currentContainerId: this.currentContainerId
        };
    }

    /**
     * Cleanup component
     */
    cleanup() {
        this.clear();
        this.board = null;
        this.renderConfig = null;
        this.connectionRenderer = null;
        this.spaceRenderer = null;
        super.cleanup();
    }
}
