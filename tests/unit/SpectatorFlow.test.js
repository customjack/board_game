import ConnectionHandler from '../../src/js/systems/networking/handlers/ConnectionHandler.js';
import PlayerHandler from '../../src/js/systems/networking/handlers/PlayerHandler.js';
import { MessageTypes } from '../../src/js/systems/networking/protocol/MessageTypes.js';
import BaseGameState from '../../src/js/game/state/BaseGameState.js';
import Board from '../../src/js/elements/models/Board.js';
import GameRules from '../../src/js/game/rules/GameRules.js';
import Settings from '../../src/js/elements/models/Settings.js';

const createGameState = (settingsOverrides = {}) => {
    const board = new Board([], { name: 'Test Board' }, new GameRules());
    const settings = new Settings({ ...settingsOverrides });
    return new BaseGameState({ board, factoryManager: {}, settings });
};

const buildProtocolStub = () => ({
    registerHandler: jest.fn()
});

describe('Spectator and claim flow', () => {
    test('rejects spectator join when limit is reached', async () => {
        const gameState = createGameState({ spectatorLimit: 1 });
        gameState.addSpectator('peer-host');

        const peer = {
            gameState,
            isHost: true,
            broadcastGameState: jest.fn(),
            eventHandler: { updateGameState: jest.fn() }
        };

        const handler = new ConnectionHandler(buildProtocolStub(), { peer, factoryManager: {} });
        const send = jest.fn();
        const conn = { peer: 'peer-new', send, open: true };

        await handler.handleJoin({ peerId: 'peer-new', players: [] }, { connection: conn });

        expect(send).toHaveBeenCalledWith(expect.objectContaining({
            type: MessageTypes.JOIN_REJECTED,
            reason: expect.stringContaining('Spectator limit')
        }));
        expect(gameState.isSpectator('peer-new')).toBe(false);
    });

    test('claims an unclaimed peer slot and transfers players', () => {
        const gameState = createGameState({ playerLimitPerPeer: 3 });
        gameState.addPlayer('peer-old', 'Old One');
        gameState.addPlayer('peer-old', 'Old Two');
        gameState.setUnclaimedPeerIds(['peer-old']);
        gameState.addSpectator('peer-new');

        const peer = {
            gameState,
            broadcastGameState: jest.fn(),
            eventHandler: { updateGameState: jest.fn() }
        };

        const handler = new PlayerHandler(buildProtocolStub(), { peer });
        const conn = { peer: 'peer-new', send: jest.fn() };

        handler.handleClaimPeerSlot({ peerSlotId: 'peer-old' }, { connection: conn });

        expect(gameState.players.every(player => player.peerId === 'peer-new')).toBe(true);
        expect(gameState.unclaimedPeerIds).toHaveLength(0);
        expect(gameState.isSpectator('peer-new')).toBe(false);
        expect(peer.broadcastGameState).toHaveBeenCalled();
    });
});
