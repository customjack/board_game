import Player from '../../elements/models/Player.js';
import Board from '../../elements/models/Board.js';
import Settings from '../../elements/models/Settings.js';
import SharedRandomNumberGenerator from '../../elements/models/SharedRandomNumberGenerator.js';
import GamePhases from '../phases/GamePhases.js';
import GameEventState from '../phases/GameEventState.js';

export default class BaseGameState {
    constructor({
        board,
        factoryManager,
        players = [],
        settings = new Settings(),
        randomGenerator = new SharedRandomNumberGenerator(Math.random().toString(36).slice(2, 11)),
        selectedMapId = 'default',
        selectedMapData = null,
        pluginState = {}
    } = {}) {
        if (!board) {
            throw new Error('Board instance is required to initialize a game state');
        }

        this.board = board;
        this.factoryManager = factoryManager;
        this.players = players;
        this.settings = settings;
        this.randomGenerator = randomGenerator;
        this.selectedMapId = selectedMapId;
        this.selectedMapData = selectedMapData;
        this.pluginState = pluginState;
        
        // Plugin readiness tracking: peerId -> { ready: boolean, missingPlugins: [] }
        this.pluginReadiness = {};
        // Required plugins for current map
        this.pluginRequirements = [];

        this.triggeredEvents = [];
        this.gamePhase = GamePhases.IN_LOBBY;

        this._version = 0;
        this._timestamp = Date.now();
    }

    getStateType() {
        return 'base';
    }

    startGame() {
        this.gamePhase = GamePhases.IN_GAME;
    }

    endGame() {
        this.gamePhase = GamePhases.GAME_ENDED;
    }

    isGameStarted() {
        return this.gamePhase === GamePhases.IN_GAME || this.gamePhase === GamePhases.PAUSED;
    }

    isGameEnded() {
        return this.gamePhase === GamePhases.GAME_ENDED;
    }

    setGamePhase(phase) {
        if (Object.values(GamePhases).includes(phase)) {
            this.gamePhase = phase;
        } else {
            console.error(`Invalid game phase: ${phase}`);
        }
    }

    incrementVersion() {
        this._version++;
        this._timestamp = Date.now();
    }

    getVersion() {
        return this._version;
    }

    addPlayer(peerIdOrPlayer, nickname = null, isHost = false, playerId = null) {
        let player;

        if (peerIdOrPlayer instanceof Player) {
            player = peerIdOrPlayer;
        } else {
            player = new Player(peerIdOrPlayer, nickname, this.factoryManager, isHost, playerId);
        }

        const existingPeerPlayer = this.players.find(p => p.peerId === player.peerId);
        if (existingPeerPlayer && existingPeerPlayer.peerColor) {
            player.peerColor = existingPeerPlayer.peerColor;
        }

        player.setTurnsTaken?.(this.getTurnNumber?.() - 1 || 0);

        if (player.currentSpaceId === null && this.board?.gameRules) {
            const playerIndex = this.players.length;
            const totalPlayers = this.players.length + 1;
            player.currentSpaceId = this.board.gameRules.getStartingSpaceForPlayer(
                playerIndex,
                totalPlayers,
                this.board
            );
        }

        this.players.push(player);
        return player;
    }

    removePlayer(playerId) {
        this.players = this.players.filter(player => player.playerId !== playerId);
    }

    removeClient(peerId) {
        this.players = this.players.filter(player => player.peerId !== peerId);
        // Also remove plugin readiness for this peer
        if (this.pluginReadiness) {
            delete this.pluginReadiness[peerId];
        }
    }
    
    /**
     * Set plugin readiness for a peer
     * @param {string} peerId - Peer ID
     * @param {boolean} ready - Whether plugins are ready
     * @param {Array} missingPlugins - List of missing plugin IDs
     */
    setPluginReadiness(peerId, ready, missingPlugins = []) {
        if (!this.pluginReadiness) {
            this.pluginReadiness = {};
        }
        this.pluginReadiness[peerId] = {
            ready,
            missingPlugins: [...missingPlugins]
        };
    }
    
    /**
     * Get plugin readiness for a peer
     * @param {string} peerId - Peer ID
     * @returns {Object|null} Readiness info or null
     */
    getPluginReadiness(peerId) {
        return this.pluginReadiness?.[peerId] || null;
    }
    
    /**
     * Check if all players have required plugins
     * @returns {boolean} True if all ready
     */
    allPlayersPluginsReady() {
        if (!this.pluginRequirements || this.pluginRequirements.length === 0) {
            return true; // No plugins required
        }
        
        // Check all players
        for (const player of this.players) {
            const readiness = this.getPluginReadiness(player.peerId);
            if (!readiness || !readiness.ready) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Set required plugins for current map
     * @param {Array} requirements - Array of plugin requirement objects
     */
    setPluginRequirements(requirements) {
        this.pluginRequirements = requirements || [];
        // Reset all readiness when requirements change
        this.pluginReadiness = {};
    }

    getPlayerByPlayerId(playerId) {
        return this.players.find(player => player.playerId === playerId);
    }

    getPlayersByPeerId(peerId) {
        return this.players.filter(player => player.peerId === peerId);
    }

    determineTriggeredEvents(eventBus = null, peerId = null) {
        const triggeredEvents = [];

        for (const space of this.board.spaces) {
            const context = {
                gameState: this,
                space,
                eventBus,
                peerId
            };

            for (const event of space.events) {
                if (event.checkTrigger(context)) {
                    triggeredEvents.push({ event, space });
                }
            }
        }

        this.triggeredEvents = triggeredEvents.sort((a, b) => {
            const aPriority = a.event.priority.value;
            const bPriority = b.event.priority.value;
            return bPriority - aPriority;
        });

        return this.triggeredEvents;
    }

    getTriggeredEvents() {
        return this.triggeredEvents;
    }

    resetEvents() {
        for (const space of this.board.spaces) {
            for (const event of space.events) {
                if (event.state === GameEventState.COMPLETED_ACTION) {
                    event.state = GameEventState.READY;
                }
            }
        }
    }

    resetPlayerPositions() {
        if (!this.board || !this.board.gameRules) {
            console.warn('Cannot reset player positions: board or game rules not available');
            return;
        }

        this.players.forEach((player, index) => {
            const startingSpaceId = this.board.gameRules.getStartingSpaceForPlayer(
                index,
                this.players.length,
                this.board
            );
            player.currentSpaceId = startingSpaceId;
        });
    }

    /**
     * Get list of top-level fields that should be included in delta updates
     * Subclasses should override this to add their specific fields
     * @returns {Array<string>} Field names to include in deltas
     */
    getDeltaFields() {
        return [
            'stateType',
            'gamePhase'
        ];
    }

    toJSON() {
        return {
            stateType: this.getStateType(),
            board: this.board.toJSON(),
            players: this.players.map(player => player.toJSON()),
            settings: this.settings.toJSON(),
            randomGenerator: this.randomGenerator.toJSON(),
            selectedMapId: this.selectedMapId,
            selectedMapData: this.selectedMapData,
            pluginState: this.pluginState,
            pluginReadiness: this.pluginReadiness || {},
            pluginRequirements: this.pluginRequirements || [],
            gamePhase: this.gamePhase,
            _version: this._version,
            _timestamp: this._timestamp
        };
    }

    static fromJSON(json, factoryManager) {
        const board = Board.fromJSON(json.board, factoryManager);
        const players = (json.players || []).map(playerData => Player.fromJSON(playerData, factoryManager));
        const settings = Settings.fromJSON(json.settings);
        const randomGenerator = SharedRandomNumberGenerator.fromJSON(json.randomGenerator);

        const instance = new this({
            board,
            factoryManager,
            players,
            settings,
            randomGenerator,
            selectedMapId: json.selectedMapId || 'default',
            selectedMapData: json.selectedMapData || null,
            pluginState: json.pluginState || {}
        });
        
        // Restore plugin readiness and requirements
        instance.pluginReadiness = json.pluginReadiness || {};
        instance.pluginRequirements = json.pluginRequirements || [];

        instance.gamePhase = json.gamePhase || GamePhases.IN_LOBBY;
        instance._version = json._version || 0;
        instance._timestamp = json._timestamp || Date.now();

        return instance;
    }
}
