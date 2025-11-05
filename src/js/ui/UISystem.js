/**
 * UISystem - Central UI coordination system
 *
 * Manages all UI components for the game across different pages (lobby, game)
 * Replaces the old manager-based system with a component-based architecture
 */
import UIComponentManager from './UIComponentManager.js';
import PlayerListComponent from './components/PlayerListComponent.js';
import BoardCanvasComponent from './components/BoardCanvasComponent.js';
import RemainingMovesComponent from './components/RemainingMovesComponent.js';
import RollButtonComponent from './components/RollButtonComponent.js';
import TimerComponent from './components/TimerComponent.js';
import GameLogComponent from './components/GameLogComponent.js';
import GameLogManager from '../controllers/managers/GameLogManager.js';

export default class UISystem {
    /**
     * Create a UI system
     * @param {Object} config - Configuration
     * @param {EventBus} config.eventBus - Event bus instance
     * @param {FactoryManager} config.factoryManager - Factory manager for plugin extensibility
     * @param {boolean} config.isHost - Whether current user is host
     * @param {string} config.peerId - Current user's peer ID
     * @param {string} config.hostPeerId - Host's peer ID
     */
    constructor(config = {}) {
        this.eventBus = config.eventBus;
        this.factoryManager = config.factoryManager;
        this.isHost = config.isHost || false;
        this.peerId = config.peerId || null;
        this.hostPeerId = config.hostPeerId || null;

        // Component manager
        this.componentManager = new UIComponentManager(this.eventBus);

        // Individual component references
        this.components = {
            lobbyPlayerList: null,
            gamePlayerList: null,
            lobbyBoard: null,
            gameBoard: null,
            remainingMoves: null,
            rollButton: null,
            timer: null,
            gameLog: null
        };

        // Game log manager (still needed for now)
        this.gameLogManager = null;

        // Current page context
        this.currentPage = null;
    }

    /**
     * Initialize the UI system
     * Sets up all components and registers them with the component manager
     */
    init() {
        const uiComponentFactory = this.factoryManager?.getFactory('UIComponentFactory');

        // Initialize game log manager
        this.gameLogManager = new GameLogManager(this.eventBus);
        this.gameLogManager.init('gameLogContainer');

        // Create lobby player list
        this.components.lobbyPlayerList = uiComponentFactory
            ? uiComponentFactory.create('PlayerListComponent', {
                listElementId: 'lobbyPlayerList',
                isHost: this.isHost,
                currentPlayerPeerId: this.peerId,
                hostPeerId: this.hostPeerId,
                eventBus: this.eventBus
            })
            : new PlayerListComponent({
                listElementId: 'lobbyPlayerList',
                isHost: this.isHost,
                currentPlayerPeerId: this.peerId,
                hostPeerId: this.hostPeerId,
                eventBus: this.eventBus
            });

        // Create game player list
        this.components.gamePlayerList = uiComponentFactory
            ? uiComponentFactory.create('PlayerListComponent', {
                listElementId: 'gamePlayerList',
                isHost: this.isHost,
                currentPlayerPeerId: this.peerId,
                hostPeerId: this.hostPeerId,
                eventBus: this.eventBus
            })
            : new PlayerListComponent({
                listElementId: 'gamePlayerList',
                isHost: this.isHost,
                currentPlayerPeerId: this.peerId,
                hostPeerId: this.hostPeerId,
                eventBus: this.eventBus
            });

        // Create lobby board
        this.components.lobbyBoard = uiComponentFactory
            ? uiComponentFactory.create('BoardCanvasComponent', {
                containerElementId: 'lobbyBoardContent',
                eventBus: this.eventBus
            })
            : new BoardCanvasComponent({
                containerElementId: 'lobbyBoardContent',
                eventBus: this.eventBus
            });

        // Create game board
        this.components.gameBoard = uiComponentFactory
            ? uiComponentFactory.create('BoardCanvasComponent', {
                containerElementId: 'gameBoardContent',
                eventBus: this.eventBus
            })
            : new BoardCanvasComponent({
                containerElementId: 'gameBoardContent',
                eventBus: this.eventBus
            });

        // Create remaining moves component
        this.components.remainingMoves = uiComponentFactory
            ? uiComponentFactory.create('RemainingMovesComponent', {
                eventBus: this.eventBus
            })
            : new RemainingMovesComponent({
                eventBus: this.eventBus
            });

        // Create roll button component
        this.components.rollButton = uiComponentFactory
            ? uiComponentFactory.create('RollButtonComponent', {
                eventBus: this.eventBus
            })
            : new RollButtonComponent({
                eventBus: this.eventBus
            });

        // Create timer component
        this.components.timer = uiComponentFactory
            ? uiComponentFactory.create('TimerComponent', {
                eventBus: this.eventBus
            })
            : new TimerComponent({
                eventBus: this.eventBus
            });

        // Create game log component
        this.components.gameLog = uiComponentFactory
            ? uiComponentFactory.create('GameLogComponent', {
                gameLogManager: this.gameLogManager,
                eventBus: this.eventBus
            })
            : new GameLogComponent({
                gameLogManager: this.gameLogManager,
                eventBus: this.eventBus
            });

        // Register all components
        Object.entries(this.components).forEach(([id, component]) => {
            if (component) {
                this.componentManager.register(id, component);
            }
        });

        // Initialize all components
        this.componentManager.initAll();

        console.log('UI System initialized with', this.componentManager.getComponentIds().length, 'components');
    }

    /**
     * Update peer information
     * @param {boolean} isHost - Whether user is host
     * @param {string} peerId - User's peer ID
     * @param {string} hostPeerId - Host's peer ID
     */
    updatePeerInfo(isHost, peerId, hostPeerId) {
        this.isHost = isHost;
        this.peerId = peerId;
        this.hostPeerId = hostPeerId;

        // Update player list components
        if (this.components.lobbyPlayerList) {
            this.components.lobbyPlayerList.setIsHost(isHost);
            this.components.lobbyPlayerList.currentPlayerPeerId = peerId;
            this.components.lobbyPlayerList.hostPeerId = hostPeerId;
        }

        if (this.components.gamePlayerList) {
            this.components.gamePlayerList.setIsHost(isHost);
            this.components.gamePlayerList.currentPlayerPeerId = peerId;
            this.components.gamePlayerList.hostPeerId = hostPeerId;
        }
    }

    /**
     * Switch context to a different page
     * @param {string} page - Page name ('lobby' or 'game')
     */
    switchContext(page) {
        this.currentPage = page;
        console.log(`UI System switched to ${page} context`);
    }

    /**
     * Update all components with game state
     * @param {GameState} gameState - Current game state
     */
    updateFromGameState(gameState) {
        if (!gameState) return;

        const context = {
            peerId: this.peerId,
            hostPeerId: this.hostPeerId,
            isHost: this.isHost,
            page: this.currentPage
        };

        this.componentManager.updateAll(gameState, context);
    }

    /**
     * Get the active player list component based on current page
     * @returns {PlayerListComponent|null}
     */
    getActivePlayerList() {
        if (this.currentPage === 'game') {
            return this.components.gamePlayerList;
        }
        return this.components.lobbyPlayerList;
    }

    /**
     * Get the active board component based on current page
     * @returns {BoardCanvasComponent|null}
     */
    getActiveBoard() {
        if (this.currentPage === 'game') {
            return this.components.gameBoard;
        }
        return this.components.lobbyBoard;
    }

    /**
     * Load default board on both lobby and game boards
     * @returns {Promise<void>}
     */
    async loadDefaultBoard() {
        await this.components.lobbyBoard.loadDefaultBoard();
        // Copy board to game board
        if (this.components.lobbyBoard.board) {
            this.components.gameBoard.setBoard(this.components.lobbyBoard.board);
            this.components.gameBoard.render();
        }
    }

    /**
     * Load board from file
     * @param {File} file - Board JSON file
     * @returns {Promise<void>}
     */
    async loadBoardFromFile(file) {
        await this.components.lobbyBoard.loadBoardFromFile(file);
        // Copy board to game board
        if (this.components.lobbyBoard.board) {
            this.components.gameBoard.setBoard(this.components.lobbyBoard.board);
            this.components.gameBoard.render();
        }
    }

    /**
     * Show game log
     */
    showGameLog() {
        if (this.components.gameLog) {
            this.components.gameLog.show();
        }
    }

    /**
     * Hide game log
     */
    hideGameLog() {
        if (this.components.gameLog) {
            this.components.gameLog.hide();
        }
    }

    /**
     * Get a specific component by ID
     * @param {string} id - Component ID
     * @returns {BaseUIComponent|null}
     */
    getComponent(id) {
        return this.components[id] || this.componentManager.get(id);
    }

    /**
     * Cleanup all UI components
     */
    cleanup() {
        this.componentManager.cleanupAll();
        this.components = {};
        this.gameLogManager = null;
    }

    /**
     * Get UI system state for debugging
     * @returns {Object}
     */
    getState() {
        return {
            isHost: this.isHost,
            peerId: this.peerId,
            hostPeerId: this.hostPeerId,
            currentPage: this.currentPage,
            componentManager: this.componentManager.getState(),
            components: Object.keys(this.components)
        };
    }
}
