import GameLogDockController from '../../src/js/controllers/GameLogDockController.js';

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

describe('GameLogDockController', () => {
  let eventBus;
  let controller;
  let dock;
  let dockBody;
  let toggle;

  beforeEach(() => {
    jest.useFakeTimers();
    eventBus = createEventBus();
    dock = {
      setAttribute: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
      },
    };
    dockBody = {
      setAttribute: jest.fn(),
    };
    toggle = {
      addEventListener: jest.fn((_, cb) => {
        toggle.handler = cb;
      }),
      removeEventListener: jest.fn(),
      textContent: '',
      setAttribute: jest.fn(),
      handler: null,
    };

    document.getElementById = jest.fn((id) => {
      if (id === 'gameLogDock') return dock;
      if (id === 'gameLogBody') return dockBody;
      if (id === 'toggleGameLogButton') return toggle;
      return null;
    });

    controller = new GameLogDockController(eventBus);
    controller.init();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('initial state is hidden', () => {
    expect(dock.setAttribute).toHaveBeenCalledWith('data-page-visible', 'false');
    expect(dockBody.setAttribute).toHaveBeenCalledWith('data-collapsed', 'false');
    expect(toggle.textContent).toBe('Hide');
  });

  test('shows dock when game page is active', () => {
    eventBus.emit('pageChanged', { pageId: 'gamePage' });

    expect(dock.setAttribute).toHaveBeenLastCalledWith('data-page-visible', 'true');
    expect(toggle.textContent).toBe('Hide');
  });

  test('toggle button flips visibility state', () => {
    eventBus.emit('pageChanged', { pageId: 'gamePage' });

    toggle.handler(); // Hide
    expect(dockBody.setAttribute).toHaveBeenLastCalledWith('data-collapsed', 'true');
    expect(toggle.textContent).toBe('Show');

    toggle.handler(); // Show again
    expect(dockBody.setAttribute).toHaveBeenLastCalledWith('data-collapsed', 'false');
    expect(toggle.textContent).toBe('Hide');
  });
});
