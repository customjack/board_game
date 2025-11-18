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

const createEngine = () => {
    const registryManager = new RegistryManager();
    const factoryManager = new FactoryManager(registryManager);
    const board = Board.fromJSON(troubleMapData, factoryManager);

    const gameState = GameStateFactory.create({
        type: 'trouble',
        board,
        factoryManager
    });
    gameState.settings.setMoveDelay(0);

    const hostPeerId = 'host-peer-id';
    const clientPeerId = 'client-peer-id';

    gameState.addPlayer(hostPeerId, 'Host', true);
    gameState.addPlayer(clientPeerId, 'Guest', false);
    gameState.initializePieces();

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
        peerId: hostPeerId,
        proposeGameState,
        eventBus: new EventBus(),
        registryManager,
        factoryManager,
        isHost: true,
        uiSystem
    });

    engine.init();

    return { engine, gameState, proposeGameState };
};

describe('TroubleGameEngine turn flow', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('advances to the next player when no moves are available', () => {
        const { engine, gameState, proposeGameState } = createEngine();

        jest.spyOn(global.Math, 'random').mockReturnValue(0.0); // roll = 1

        const currentPlayer = gameState.getCurrentPlayer();
        const response = engine.handleRoll(currentPlayer);

        expect(response.success).toBe(true);
        expect(gameState.currentPlayerIndex).toBe(1);
        expect(gameState.getCurrentPlayer().nickname).toBe('Guest');
        expect(proposeGameState).toHaveBeenCalled();
    });
});
