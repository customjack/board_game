import EventBus from '../../src/js/events/EventBus.js';
import FactoryManager from '../../src/js/factories/FactoryManager.js';
import RegistryManager from '../../src/js/registries/RegistryManager.js';
import TroubleGameState from '../../src/js/gameStates/TroubleGameState.js';
import Player from '../../src/js/models/Player.js';
import Board from '../../src/js/models/Board.js';
import TroubleGameEngine from '../../src/js/engines/TroubleGameEngine.js';
import GameEngineFactory from '../../src/js/factories/GameEngineFactory.js';
import TroublePlugin from '../../src/js/plugins/TroublePlugin.js';

import troubleBoardDefinition from '../../src/assets/maps/examples/trouble-classic.json';

describe('TroubleGameEngine', () => {
    let factoryManager;
    let registryManager;
    let eventBus;
    let gameState;
    let player1;
    let player2;
    let engine;

    beforeEach(() => {
        factoryManager = new FactoryManager();
        registryManager = new RegistryManager();
        eventBus = new EventBus();

        const board = Board.fromJSON(troubleBoardDefinition, factoryManager);
        player1 = new Player('peer-1', 'Player One', factoryManager, false, 'p1');
        player2 = new Player('peer-2', 'Player Two', factoryManager, false, 'p2');
        gameState = new TroubleGameState({
            board,
            factoryManager,
            players: [player1, player2]
        });
        gameState.resetPlayerPositions();

        engine = new TroubleGameEngine(
            {
                gameState,
                peerId: player1.peerId,
                proposeGameState: jest.fn(),
                eventBus,
                registryManager,
                factoryManager,
                isHost: true
            },
            {
                trackLength: 28,
                finishLength: 4,
                piecesPerPlayer: 4
            }
        );

        engine.init();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('rolling a six releases a peg from home', async () => {
        jest.spyOn(player1, 'rollDice').mockReturnValue(6);

        const rollResult = await engine.onPlayerAction(player1.playerId, 'ROLL_DICE');
        expect(rollResult.success).toBe(true);
        expect(rollResult.data.requiresSelection).toBe(true);

        const moveResult = await engine.onPlayerAction(player1.playerId, 'SELECT_PIECE', { pieceIndex: 0 });
        expect(moveResult.success).toBe(true);

        const state = engine.playerState.get(player1.playerId);
        const pieceOnTrack = state.pieces.find(piece => piece.status === 'TRACK');
        expect(pieceOnTrack).toBeDefined();
        expect(engine.getEngineState().metadata.troubleState.pendingRoll).toBeNull();
    });

    test('landing on an occupied track space bumps opponents home', async () => {
        const p1State = engine.playerState.get(player1.playerId);
        const p2State = engine.playerState.get(player2.playerId);

        // Position player1 piece two steps from start
        p1State.pieces[0].status = 'TRACK';
        p1State.pieces[0].stepsFromStart = 0;
        p1State.pieces[0].spaceId = 'track-0';

        // Position player2 piece on the global track index player1 will land on
        p2State.pieces[0].status = 'TRACK';
        p2State.pieces[0].stepsFromStart = 17;
        p2State.pieces[0].spaceId = 'track-3';

        jest.spyOn(player1, 'rollDice').mockReturnValue(3);

        const result = await engine.onPlayerAction(player1.playerId, 'ROLL_DICE');
        expect(result.success).toBe(true);
        expect(p2State.pieces[0].status).toBe('HOME');
        expect(p2State.pieces[0].spaceId).toMatch(/home-1-/);
    });
});

describe('TroublePlugin', () => {
    beforeEach(() => {
        GameEngineFactory.unregister('trouble');
    });

    test('registers the trouble engine with the factory', () => {
        const plugin = new TroublePlugin();
        plugin.initialize(new EventBus(), new RegistryManager(), new FactoryManager());
        expect(GameEngineFactory.isRegistered('trouble')).toBe(true);
    });
});
