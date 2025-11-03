import GameLogModalController from '../../src/js/controllers/GameLogModalController.js';

const createEventBus = () => {
  const listeners = {};
  return {
    on: jest.fn((event, handler) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    }),
    off: jest.fn((event, handler) => {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter((cb) => cb !== handler);
    }),
    emit: (event, payload) => {
      (listeners[event] || []).forEach((handler) => handler(payload));
    },
  };
};

describe('GameLogModalController', () => {
  let eventBus;
  let controller;
  let modal;
  let openButton;
  let closeButton;

  beforeEach(() => {
    jest.useFakeTimers();
    eventBus = createEventBus();

    modal = {
      style: { display: 'none' },
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    openButton = {
      addEventListener: jest.fn((_, cb) => {
        openButton.handler = cb;
      }),
      removeEventListener: jest.fn(),
      style: {},
      handler: null,
    };

    closeButton = {
      addEventListener: jest.fn((_, cb) => {
        closeButton.handler = cb;
      }),
      removeEventListener: jest.fn(),
      handler: null,
    };

    document.getElementById = jest.fn((id) => {
      if (id === 'gameLogModal') return modal;
      if (id === 'openGameLogButton') return openButton;
      if (id === 'closeGameLogButton') return closeButton;
      return null;
    });

    controller = new GameLogModalController(eventBus);
    controller.init();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('initializes hidden and button hidden when not on game page', () => {
    expect(openButton.style.display).toBe('none');
    expect(modal.style.display).toBe('none');
  });

  test('shows button on game page and opens modal on click', () => {
    eventBus.emit('pageChanged', { pageId: 'gamePage' });
    expect(openButton.style.display).toBe('');

    openButton.handler();
    expect(modal.style.display).toBe('flex');
  });

  test('closes modal when close button clicked', () => {
    eventBus.emit('pageChanged', { pageId: 'gamePage' });
    openButton.handler();
    closeButton.handler();

    expect(modal.style.display).toBe('none');
  });

  test('hides modal and button when leaving game page', () => {
    eventBus.emit('pageChanged', { pageId: 'gamePage' });
    openButton.handler();

    eventBus.emit('pageChanged', { pageId: 'lobbyPage' });
    expect(openButton.style.display).toBe('none');
    expect(modal.style.display).toBe('none');
  });
});
