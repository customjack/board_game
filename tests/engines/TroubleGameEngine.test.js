import fs from 'fs';
import path from 'path';
import TroubleGameEngine from '../../src/js/engines/TroubleGameEngine.js';
import TroubleGameState from '../../src/js/models/gameStates/TroubleGameState.js';
import RegistryManager from '../../src/js/registries/RegistryManager.js';
import FactoryManager from '../../src/js/factories/FactoryManager.js';
import EventBus from '../../src/js/events/EventBus.js';
import GameStateFactory from '../../src/js/factories/GameStateFactory.js';
import Board from '../../src/js/models/Board.js';

if (!GameStateFactory.isRegistered('trouble')) {
    GameStateFactory.register('trouble', TroubleGameState);
}

const troubleMapPath = path.resolve(process.cwd(), 'src/assets/maps/examples/trouble-classic.json');
const troubleMapData = JSON.parse(fs.readFileSync(troubleMapPath, 'utf-8'));

const HOST_PEER_ID = 'host-peer-id';
const CLIENT_PEER_ID = 'client-peer-id';

const createHostEngine = () => {
    const registryManager = new RegistryManager();
    const factoryManager = new FactoryManager(registryManager);
    const board = Board.fromJSON(troubleMapData, factoryManager);

    const gameState = GameStateFactory.create({
        type: 'trouble',
        board,
        factoryManager
    });
    gameState.settings.setMoveDelay(0);

    gameState.addPlayer(HOST_PEER_ID, 'Host', true);
    gameState.addPlayer(CLIENT_PEER_ID, 'Guest', false);
    gameState.initializePieces?.();

    const rollButton = {
        init: jest.fn(),
        activate: jest.fn(),
        deactivate: jest.fn()
    };

    const uiSystem = {
        getComponent: jest.fn((id) => (id === 'rollButton' ? rollButton : null))
    };

    const proposeGameState = jest.fn();

    const engine = new TroubleGameEngine({
        gameState,
        peerId: HOST_PEER_ID,
        proposeGameState,
        eventBus: new EventBus(),
        registryManager,
        factoryManager,
        isHost: true,
        uiSystem
    });

    engine.init();

    return { engine, gameState, proposeGameState, registryManager, factoryManager };
};

const createClientEngine = (initialStateJSON) => {
    const registryManager = new RegistryManager();
    const factoryManager = new FactoryManager(registryManager);
    const initialState = GameStateFactory.fromJSON(initialStateJSON, factoryManager);

    const rollButton = {
        init: jest.fn(),
        activate: jest.fn(),
        deactivate: jest.fn()
    };

    const uiSystem = {
        getComponent: jest.fn((id) => (id === 'rollButton' ? rollButton : null))
    };

    const engine = new TroubleGameEngine({
        gameState: initialState,
        peerId: CLIENT_PEER_ID,
        proposeGameState: jest.fn(),
        eventBus: new EventBus(),
        registryManager,
        factoryManager,
        isHost: false,
        uiSystem
    });

    engine.init();
    rollButton.activate.mockClear();
    rollButton.deactivate.mockClear();

    return { engine, rollButton, registryManager, factoryManager };
};

describe('TroubleGameEngine turn flow', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('advances to the next player when no moves are available', () => {
        const { engine, gameState, proposeGameState } = createHostEngine();

        jest.spyOn(global.Math, 'random').mockReturnValue(0.0); // roll = 1

        const currentPlayer = gameState.getCurrentPlayer();
        const response = engine.handleRoll(currentPlayer);

        expect(response.success).toBe(true);
        expect(gameState.currentPlayerIndex).toBe(1);
        expect(gameState.getCurrentPlayer().nickname).toBe('Guest');
        expect(proposeGameState).toHaveBeenCalled();
    });

    test('client receives turn after host ends turn', () => {
        const hostCtx = createHostEngine();
        const initialJSON = hostCtx.gameState.toJSON();
        const clientCtx = createClientEngine(initialJSON);

        jest.spyOn(global.Math, 'random').mockReturnValue(0.0);
        const currentPlayer = hostCtx.gameState.getCurrentPlayer();
        hostCtx.engine.handleRoll(currentPlayer);

        const updatedJSON = hostCtx.gameState.toJSON();
        const updatedClientState = GameStateFactory.fromJSON(updatedJSON, clientCtx.factoryManager);
        clientCtx.engine.updateGameState(updatedClientState);

        expect(clientCtx.engine.isClientTurn()).toBe(true);
        expect(clientCtx.rollButton.activate).toHaveBeenCalled();
    });
});
