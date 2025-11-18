import EventBus from '../../src/js/events/EventBus.js';
import FactoryManager from '../../src/js/factories/FactoryManager.js';
import RegistryManager from '../../src/js/registries/RegistryManager.js';
import TroubleGameState from '../../src/js/models/gameStates/TroubleGameState.js';
import Player from '../../src/js/models/Player.js';
import Board from '../../src/js/models/Board.js';
import TroubleGameEngine from '../../src/js/engines/TroubleGameEngine.js';
import GameEngineFactory from '../../src/js/factories/GameEngineFactory.js';
import TroublePlugin from '../../src/js/plugins/TroublePlugin.js';
import PhaseStateMachineFactory from '../../src/js/factories/PhaseStateMachineFactory.js';
import { PieceStatus } from '../../src/js/models/gameStates/TroubleGameState.js';

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

        // Register required factories
        factoryManager.registerFactory('PhaseStateMachineFactory', new PhaseStateMachineFactory());

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
        // Set game to IN_GAME phase
        gameState.gamePhase = 'IN_GAME';
        gameState.setTurnPhase('WAITING_FOR_MOVE');
        engine.updateGameState(gameState); // Trigger phase handlers

        // Mock Math.random to return 6
        jest.spyOn(Math, 'random').mockReturnValue(0.99); // Will roll 6

        const rollResult = await engine.onPlayerAction(player1.playerId, 'ROLL_DICE', {});
        expect(rollResult.success).toBe(true);
        expect(rollResult.data.rollResult).toBe(6);

        // Wait for phase transition to PROCESSING_MOVE
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Manually trigger the phase handler by calling updateGameState
        engine.updateGameState(gameState);

        // Wait for piece movement
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check that a piece was moved out (automatically on 6 when no pieces on board)
        const player1Pieces = gameState.getPlayerPieces(player1.playerId);
        const pieceInPlay = player1Pieces.find(piece => piece.status === PieceStatus.IN_PLAY);
        expect(pieceInPlay).toBeDefined();
        expect(pieceInPlay.position).toBeGreaterThanOrEqual(0);
    });

    test('landing on an occupied track space bumps opponents home', async () => {
        // Set game to IN_GAME phase
        gameState.gamePhase = 'IN_GAME';
        gameState.setTurnPhase('WAITING_FOR_MOVE');
        engine.updateGameState(gameState); // Trigger phase handlers

        // Position player1 piece on track
        gameState.updatePiece(player1.playerId, 0, 5, PieceStatus.IN_PLAY);

        // Position player2 piece on position 8 (where player1 will land with roll 3)
        gameState.updatePiece(player2.playerId, 0, 8, PieceStatus.IN_PLAY);

        // Mock Math.random to return 3
        jest.spyOn(Math, 'random').mockReturnValue(0.49); // Will roll 3

        // Roll dice
        await engine.onPlayerAction(player1.playerId, 'ROLL_DICE', {});

        // Wait for phase transition to PROCESSING_MOVE
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Manually trigger the phase handler
        engine.updateGameState(gameState);

        // Wait for auto-move
        await new Promise(resolve => setTimeout(resolve, 100));

        // Player2's piece should be sent back home
        const player2Pieces = gameState.getPlayerPieces(player2.playerId);
        expect(player2Pieces[0].status).toBe(PieceStatus.HOME);
        expect(player2Pieces[0].position).toBe(-1);
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
