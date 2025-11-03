import GameLogManager from '../../src/js/controllers/managers/GameLogManager.js';
import EventBus from '../../src/js/events/EventBus.js';

describe('GameLogManager', () => {
  let eventBus;
  let manager;
  let container;

  beforeEach(() => {
    eventBus = new EventBus();
    manager = new GameLogManager(eventBus, { maxEntries: 3 });
    container = { innerHTML: '' };
    manager.init(container);
  });

  afterEach(() => {
    manager.destroy();
  });

  test('logs messages and renders escaped output', () => {
    manager.log('Alice <script>', { playerName: 'Alice', playerId: 'p1' });

    const entries = manager.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].playerName).toBe('Alice');
    expect(container.innerHTML).toContain('Alice');
    expect(container.innerHTML).not.toContain('<script>');
  });

  test('respects maxEntries configuration', () => {
    manager.log('First');
    manager.log('Second');
    manager.log('Third');
    manager.log('Fourth');

    const entries = manager.getEntries();
    expect(entries).toHaveLength(3);
    expect(entries[0].message).toBe('Second');
    expect(entries[2].message).toBe('Fourth');
  });

  test('renders newest entries at the top of the container', () => {
    manager.log('Older');
    manager.log('Newer');

    expect(container.innerHTML.indexOf('Newer')).toBeLessThan(container.innerHTML.indexOf('Older'));
  });

  test('createLogger applies default metadata', () => {
    const logger = manager.createLogger('test-source', { type: 'custom' });
    const entry = logger('Logged via channel', { metadata: { flag: true } });

    expect(entry.source).toBe('test-source');
    expect(entry.type).toBe('custom');
    expect(entry.metadata.flag).toBe(true);
  });

  test('logPlayerAction hydrates player details', () => {
    const player = { playerId: 'p2', nickname: 'Bob' };
    manager.logPlayerAction(player, 'rolled a 5', { metadata: { result: 5 } });

    const entry = manager.getEntries()[0];
    expect(entry.playerName).toBe('Bob');
    expect(entry.type).toBe('player-action');
    expect(entry.metadata.result).toBe(5);
  });

  test('responds to event bus log injection', () => {
    eventBus.emit('gameLog:log', {
      message: 'Injected message',
      playerName: 'Carol',
      type: 'external'
    });

    const entry = manager.getEntries()[0];
    expect(entry.message).toBe('Injected message');
    expect(entry.playerName).toBe('Carol');
    expect(entry.type).toBe('external');
  });

  test('clear removes all entries and updates container', () => {
    manager.log('Something happened');
    expect(manager.getEntries()).toHaveLength(1);

    manager.clear();
    expect(manager.getEntries()).toHaveLength(0);
    expect(container.innerHTML).toBe('');
  });
});
