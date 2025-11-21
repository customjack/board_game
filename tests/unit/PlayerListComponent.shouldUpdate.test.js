import PlayerListComponent from '../../src/js/ui/components/PlayerListComponent.js';

const baseState = (overrides = {}) => ({
  players: [
    { playerId: 'p1', nickname: 'A', peerId: 'peer1', playerColor: '#000', peerColor: '#000', turnsTaken: 0 },
    { playerId: 'p2', nickname: 'B', peerId: 'peer2', playerColor: '#111', peerColor: '#111', turnsTaken: 0 }
  ],
  board: { metadata: { name: 'board' } },
  settings: {},
  gamePhase: 'IN_LOBBY',
  ...overrides
});

describe('PlayerListComponent.shouldUpdate', () => {
  test('returns true when gamePhase changes (to highlight current player at game start)', () => {
    const c = new PlayerListComponent({ listElementId: 'gamePlayerList' });
    c.gameState = baseState();
    const nextState = baseState({ gamePhase: 'IN_GAME' });
    expect(c.shouldUpdate(nextState)).toBe(true);
  });

  test('returns false when nothing relevant changes', () => {
    const c = new PlayerListComponent({ listElementId: 'gamePlayerList' });
    const state = baseState();
    c.gameState = state;
    expect(c.shouldUpdate(baseState())).toBe(false);
  });
});
