import EventBus from '../../src/js/events/EventBus.js';
import FactoryManager from '../../src/js/factories/FactoryManager.js';
import RegistryManager from '../../src/js/registries/RegistryManager.js';
import TroubleGameState from '../../src/js/models/gameStates/TroubleGameState.js';
import Player from '../../src/js/models/Player.js';
import Board from '../../src/js/models/Board.js';
import TroubleGameEngine from '../../src/js/engines/TroubleGameEngine.js';
import GamePhases from '../../src/js/enums/GamePhases.js';
import TurnPhases from '../../src/js/enums/TurnPhases.js';
import { PieceStatus } from '../../src/js/models/gameStates/TroubleGameState.js';

import troubleBoardDefinition from '../../src/assets/maps/examples/trouble-classic.json';

/**
 * TroubleGameBot - Automated player for testing
 * Simulates a player making moves based on game state
 */
class TroubleGameBot {
    constructor(engine, playerId, name) {
        this.engine = engine;
        this.playerId = playerId;
        this.name = name;
        this.moveLog = [];
    }

    async takeTurn() {
        const currentPlayer = this.engine.gameState.getCurrentPlayer();

        if (!currentPlayer || currentPlayer.playerId !== this.playerId) {
            // Not our turn
            return null;
        }

        const phase = this.engine.gameState.turnPhase;
        this.log(`Taking turn (phase: ${phase})`);

        if (phase === TurnPhases.WAITING_FOR_MOVE) {
            // Roll dice
            this.log('Rolling dice...');
            const result = await this.engine.onPlayerAction(this.playerId, 'ROLL_DICE', {});

            if (result.success) {
                this.log(`Rolled ${result.roll || this.engine.gameState.lastRoll}`);
                return { action: 'ROLL', roll: result.roll || this.engine.gameState.lastRoll };
            } else {
                this.log(`Roll failed: ${result.error}`);
                return null;
            }
        }

        if (phase === TurnPhases.PLAYER_CHOOSING_DESTINATION) {
            // Select first available piece
            const options = this.engine.pendingMoveOptions;

            if (options && options.length > 0) {
                const choice = options[0];
                this.log(`Selecting piece ${choice.pieceIndex} to move to ${choice.newStatus}:${choice.newPosition}`);

                const result = await this.engine.onPlayerAction(
                    this.playerId,
                    'SELECT_PIECE',
                    { pieceIndex: choice.pieceIndex }
                );

                if (result.success) {
                    this.log(`Moved piece successfully`);
                    return { action: 'MOVE', pieceIndex: choice.pieceIndex };
                } else {
                    this.log(`Move failed: ${result.error}`);
                    return null;
                }
            }
        }

        return null;
    }

    log(message) {
        const entry = `[${this.name}] ${message}`;
        this.moveLog.push(entry);
        console.log(entry);
    }

    getStats() {
        const pieces = this.engine.gameState.getPlayerPieces(this.playerId);
        const home = pieces.filter(p => p.status === PieceStatus.HOME).length;
        const track = pieces.filter(p => p.status === PieceStatus.TRACK).length;
        const finish = pieces.filter(p => p.status === PieceStatus.FINISH).length;
        const done = pieces.filter(p => p.status === PieceStatus.DONE).length;

        return { home, track, finish, done };
    }
}

describe('TroubleGameEngine - Full Game Bot Test', () => {
    let factoryManager;
    let registryManager;
    let eventBus;
    let gameState;
    let player1;
    let player2;
    let engine;
    let bot1;
    let bot2;

    beforeEach(() => {
        factoryManager = new FactoryManager();
        registryManager = new RegistryManager();
        eventBus = new EventBus();

        const board = Board.fromJSON(troubleBoardDefinition, factoryManager);
        player1 = new Player('bot-1', 'Bot One', factoryManager, false, 'bot1');
        player2 = new Player('bot-2', 'Bot Two', factoryManager, false, 'bot2');

        gameState = new TroubleGameState({
            board,
            factoryManager,
            players: [player1, player2]
        });

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

        bot1 = new TroubleGameBot(engine, player1.playerId, 'Bot1');
        bot2 = new TroubleGameBot(engine, player2.playerId, 'Bot2');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('bot can complete initial setup and take first turns', async () => {
        console.log('\n=== Starting Trouble Game Bot Test ===\n');

        // Initialize game
        engine.init();

        expect(engine.initialized).toBe(true);
        expect(engine.running).toBe(true);
        expect(gameState.gamePhase).toBe(GamePhases.IN_GAME);
        expect(gameState.turnPhase).toBe(TurnPhases.WAITING_FOR_MOVE);

        console.log('Game initialized successfully');
        console.log('Current player:', gameState.getCurrentPlayer()?.nickname);
        console.log('Turn phase:', gameState.turnPhase);
        console.log('Bot1 pieces:', bot1.getStats());
        console.log('Bot2 pieces:', bot2.getStats());

        // Verify initial state
        const bot1Stats = bot1.getStats();
        const bot2Stats = bot2.getStats();

        expect(bot1Stats.home).toBe(4);
        expect(bot1Stats.track).toBe(0);
        expect(bot1Stats.finish).toBe(0);
        expect(bot1Stats.done).toBe(0);

        expect(bot2Stats.home).toBe(4);
        expect(bot2Stats.track).toBe(0);

        // Bot 1's first turn
        console.log('\n--- Bot 1 Turn 1 ---');
        const turn1 = await bot1.takeTurn();

        expect(turn1).not.toBeNull();
        expect(turn1.action).toBe('ROLL');
        expect(turn1.roll).toBeGreaterThanOrEqual(1);
        expect(turn1.roll).toBeLessThanOrEqual(6);

        console.log('After Bot1 turn 1:');
        console.log('Turn phase:', gameState.turnPhase);
        console.log('Current player:', gameState.getCurrentPlayer()?.nickname);
        console.log('Bot1 pieces:', bot1.getStats());

        // Game should have advanced (either same player if rolled 6, or next player)
        expect([TurnPhases.WAITING_FOR_MOVE, TurnPhases.PROCESSING_MOVE])
            .toContain(gameState.turnPhase);
    });

    test('bot can play multiple turns until a piece moves out', async () => {
        console.log('\n=== Multi-Turn Test - Moving Piece Out ===\n');

        engine.init();

        let turns = 0;
        const maxTurns = 50; // Safety limit
        let pieceMoved = false;

        while (turns < maxTurns && !pieceMoved) {
            const currentPlayer = gameState.getCurrentPlayer();
            const bot = currentPlayer.playerId === bot1.playerId ? bot1 : bot2;

            console.log(`\n--- Turn ${turns + 1}: ${bot.name} ---`);

            const turn = await bot.takeTurn();

            if (turn && turn.action === 'ROLL') {
                const stats = bot.getStats();
                console.log(`${bot.name} stats: HOME=${stats.home}, TRACK=${stats.track}, FINISH=${stats.finish}, DONE=${stats.done}`);

                if (stats.track > 0 || stats.finish > 0 || stats.done > 0) {
                    pieceMoved = true;
                    console.log(`\n✓ ${bot.name} successfully moved a piece out!`);
                    break;
                }
            }

            turns++;
        }

        expect(turns).toBeLessThan(maxTurns);
        expect(pieceMoved).toBe(true);

        console.log(`\nGame took ${turns} turns to move first piece out`);
    });

    test('bot can play a full game simulation', async () => {
        console.log('\n=== Full Game Simulation ===\n');

        engine.init();

        let turns = 0;
        const maxTurns = 500; // Generous limit for full game
        let gameWon = false;

        // Use fixed random seed for predictable rolls (helps with testing)
        const rolls = [6, 3, 2, 6, 5, 1, 6, 4, 2, 6, 3, 5, 1, 6, 2, 4, 6, 3];
        let rollIndex = 0;

        jest.spyOn(Math, 'random').mockImplementation(() => {
            const roll = rolls[rollIndex % rolls.length];
            rollIndex++;
            return (roll - 0.5) / 6; // Convert to Math.random() range that produces desired roll
        });

        while (turns < maxTurns && !gameWon) {
            if (gameState.gamePhase === GamePhases.GAME_ENDED) {
                gameWon = true;
                break;
            }

            const currentPlayer = gameState.getCurrentPlayer();
            if (!currentPlayer) {
                console.error('No current player!');
                break;
            }

            const bot = currentPlayer.playerId === bot1.playerId ? bot1 : bot2;

            const turn = await bot.takeTurn();

            if (turn) {
                if (turns % 10 === 0) {
                    const bot1Stats = bot1.getStats();
                    const bot2Stats = bot2.getStats();
                    console.log(`\n--- After ${turns} turns ---`);
                    console.log(`Bot1: HOME=${bot1Stats.home}, TRACK=${bot1Stats.track}, FINISH=${bot1Stats.finish}, DONE=${bot1Stats.done}`);
                    console.log(`Bot2: HOME=${bot2Stats.home}, TRACK=${bot2Stats.track}, FINISH=${bot2Stats.finish}, DONE=${bot2Stats.done}`);
                }
            }

            turns++;

            // Safety check for infinite loops
            if (turns > maxTurns - 10) {
                console.warn(`Approaching max turns (${turns}/${maxTurns})`);
            }
        }

        console.log(`\n=== Game Complete After ${turns} Turns ===\n`);

        const bot1FinalStats = bot1.getStats();
        const bot2FinalStats = bot2.getStats();

        console.log(`Final Bot1: HOME=${bot1FinalStats.home}, TRACK=${bot1FinalStats.track}, FINISH=${bot1FinalStats.finish}, DONE=${bot1FinalStats.done}`);
        console.log(`Final Bot2: HOME=${bot2FinalStats.home}, TRACK=${bot2FinalStats.track}, FINISH=${bot2FinalStats.finish}, DONE=${bot2FinalStats.done}`);

        // At minimum, verify game made progress
        expect(turns).toBeLessThan(maxTurns);
        expect(bot1FinalStats.home + bot1FinalStats.track + bot1FinalStats.finish + bot1FinalStats.done).toBe(4);
        expect(bot2FinalStats.home + bot2FinalStats.track + bot2FinalStats.finish + bot2FinalStats.done).toBe(4);

        // Verify at least some pieces moved
        expect(
            bot1FinalStats.track + bot1FinalStats.finish + bot1FinalStats.done +
            bot2FinalStats.track + bot2FinalStats.finish + bot2FinalStats.done
        ).toBeGreaterThan(0);

        if (gameWon) {
            console.log('\n✓ Game ended with a winner!');
            expect(gameState.gamePhase).toBe(GamePhases.GAME_ENDED);

            // One player should have all 4 pieces DONE
            expect(
                bot1FinalStats.done === 4 || bot2FinalStats.done === 4
            ).toBe(true);
        } else {
            console.log('\n✓ Game simulation completed successfully (no winner in test time limit)');
        }
    });

    test('initial state has all pieces at HOME', () => {
        engine.init();

        const allPieces = gameState.pieces;
        expect(allPieces.length).toBe(8); // 2 players × 4 pieces

        allPieces.forEach(piece => {
            expect(piece.status).toBe(PieceStatus.HOME);
            expect(piece.position).toBe(-1);
        });
    });

    test('roll button should activate for current player on init', () => {
        const activateSpy = jest.fn();
        const deactivateSpy = jest.fn();

        // Create fresh engine with proper peerId matching
        const testEngine = new TroubleGameEngine(
            {
                gameState,
                peerId: player1.playerId, // Use playerId not peerId
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

        // Mock UI system with roll button
        testEngine.uiSystem = {
            getComponent: (id) => {
                if (id === 'rollButton') {
                    return {
                        init: jest.fn(),
                        activate: activateSpy,
                        deactivate: deactivateSpy
                    };
                }
                return null;
            }
        };

        testEngine.init();

        // Roll button should be activated for player 1 (whose turn it is)
        expect(testEngine.isClientTurn()).toBe(true);
        expect(activateSpy).toHaveBeenCalled();
    });
});
