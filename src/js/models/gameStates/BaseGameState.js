import Player from '../Player.js';
import Board from '../Board.js';
import Settings from '../Settings.js';
import SharedRandomNumberGenerator from '../SharedRandomNumberGenerator.js';
import GamePhases from '../../enums/GamePhases.js';
import GameEventState from '../../enums/GameEventState.js';

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

        instance.gamePhase = json.gamePhase || GamePhases.IN_LOBBY;
        instance._version = json._version || 0;
        instance._timestamp = json._timestamp || Date.now();

        return instance;
    }
}
