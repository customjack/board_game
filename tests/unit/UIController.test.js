import UIController from '../../src/js/game/engines/turn_based/components/UIController.js';

describe('UIController', () => {
  let rollButtonManager;
  let timerManager;
  let uiController;
  let modalElements;
  let originalQuerySelectorAll;
  let baseGetElementById;
  let baseCreateElementImpl;

  const createModalStub = () => {
    const title = { textContent: '' };
    const message = { textContent: '' };
    const buttonsContainer = {
      innerHTML: '',
      appendChild: jest.fn(),
    };

    return {
      style: { display: 'none' },
      querySelector: jest.fn((selector) => {
        if (selector === '.modal-title') return title;
        if (selector === '.modal-message') return message;
        if (selector === '.modal-buttons') return buttonsContainer;
        return null;
      }),
    };
  };

  beforeEach(() => {
    rollButtonManager = {
      init: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      cleanup: jest.fn(),
    };

    timerManager = {
      init: jest.fn(),
      startTimer: jest.fn(),
      stopTimer: jest.fn(),
      pauseTimer: jest.fn(),
      resumeTimer: jest.fn(),
    };

    modalElements = {
      gamePromptModal: createModalStub(),
      choiceModal: createModalStub(),
      notificationModal: createModalStub(),
    };

    const rollButtonNode = { id: 'rollButton' };

    document.getElementById.mockImplementation((id) => {
      if (id === 'rollButton') return rollButtonNode;
      return modalElements[id] || null;
    });
    baseGetElementById = document.getElementById.getMockImplementation();

    baseCreateElementImpl = document.createElement.getMockImplementation();

    originalQuerySelectorAll = document.querySelectorAll;
    document.querySelectorAll = jest.fn(() => []);

    uiController = new UIController(
      {
        rollButtonManager,
        timerManager,
      },
      { modalDuration: 1500 }
    );
  });

  afterEach(() => {
    document.querySelectorAll = originalQuerySelectorAll;
  });

  describe('constructor and init', () => {
    test('should store managers and merge config defaults', () => {
      expect(uiController.rollButtonManager).toBe(rollButtonManager);
      expect(uiController.timerManager).toBe(timerManager);
      expect(uiController.config.autoHideModals).toBe(true);
      expect(uiController.config.modalDuration).toBe(1500);
    });

    test('should wire managers with DOM elements and callbacks', () => {
      const callbacks = {
        onRollDice: jest.fn(),
        onRollComplete: jest.fn(),
        onTimerEnd: jest.fn(),
        onPauseToggle: jest.fn(),
      };

      uiController.init(callbacks);

      expect(rollButtonManager.init).toHaveBeenCalled();
      expect(timerManager.init).toHaveBeenCalled();

      const [rollButtonElement, onRollDice, onRollComplete] = rollButtonManager.init.mock.calls[0];
      expect(rollButtonElement.id).toBe('rollButton');

      onRollDice();
      expect(callbacks.onRollDice).toHaveBeenCalled();

      onRollComplete('rolled');
      expect(callbacks.onRollComplete).toHaveBeenCalledWith('rolled');

      const [onTimerEnd, onPauseToggle] = timerManager.init.mock.calls[0];
      onTimerEnd();
      expect(callbacks.onTimerEnd).toHaveBeenCalled();
      onPauseToggle();
      expect(callbacks.onPauseToggle).toHaveBeenCalled();
    });
  });

  describe('roll button controls', () => {
    test('should activate and deactivate roll button while tracking state', () => {
      expect(uiController.isRollButtonActive()).toBe(false);

      uiController.activateRollButton();
      expect(rollButtonManager.activate).toHaveBeenCalled();
      expect(uiController.isRollButtonActive()).toBe(true);

      uiController.deactivateRollButton();
      expect(rollButtonManager.deactivate).toHaveBeenCalled();
      expect(uiController.isRollButtonActive()).toBe(false);
    });
  });

  describe('timer controls', () => {
    test('should proxy timer controls and track running state', () => {
      expect(uiController.isTimerRunning()).toBe(false);

      uiController.startTimer();
      expect(timerManager.startTimer).toHaveBeenCalled();
      expect(uiController.isTimerRunning()).toBe(true);

      uiController.pauseTimer();
      expect(timerManager.pauseTimer).toHaveBeenCalled();

      uiController.resumeTimer();
      expect(timerManager.resumeTimer).toHaveBeenCalled();

      uiController.stopTimer();
      expect(timerManager.stopTimer).toHaveBeenCalled();
      expect(uiController.isTimerRunning()).toBe(false);
    });
  });

  describe('modals', () => {
    test('should show modal, update content, and resolve when button clicked', async () => {
      const buttonsContainer = {
        innerHTML: '',
        appendChild: jest.fn(),
      };

      const modal = {
        style: { display: 'none' },
        querySelector: jest.fn((selector) => {
          if (selector === '.modal-title') return { textContent: '' };
          if (selector === '.modal-message') return { textContent: '' };
          if (selector === '.modal-buttons') return buttonsContainer;
          return null;
        }),
      };

      modalElements.gamePromptModal = modal;
      uiController.modals.gamePrompt = modal;

      let clickHandler = null;
      document.createElement.mockImplementation((tag) => ({
        textContent: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        addEventListener: jest.fn((event, handler) => {
          if (event === 'click') {
            clickHandler = handler;
          }
        }),
      }));

      const resultPromise = uiController.showModal('gamePrompt', {
        title: 'Welcome',
        message: 'Have fun!',
        buttons: [{ text: 'OK', value: true }],
      });

      expect(modal.style.display).toBe('block');
      expect(uiController.isModalOpen()).toBe(true);
      expect(uiController.getCurrentModal()).toBe('gamePrompt');
      expect(buttonsContainer.appendChild).toHaveBeenCalled();
      expect(clickHandler).toBeInstanceOf(Function);

      clickHandler();
      await expect(resultPromise).resolves.toBe(true);
      expect(modal.style.display).toBe('none');
      expect(uiController.isModalOpen()).toBe(false);

      document.createElement.mockImplementation(baseCreateElementImpl);
    });

    test('should auto-hide modal when duration provided', async () => {
      jest.useFakeTimers();

      const modal = {
        style: { display: 'none' },
        querySelector: jest.fn((selector) => {
          if (selector === '.modal-message') return { textContent: '' };
          if (selector === '.modal-buttons') return { innerHTML: '', appendChild: jest.fn() };
          return null;
        }),
      };

      modalElements.notificationModal = modal;
      uiController.modals.notification = modal;

      const resultPromise = uiController.showModal('notification', {
        message: 'Heads up',
        duration: 100,
      });

      expect(modal.style.display).toBe('block');
      jest.runAllTimers();

      await expect(resultPromise).resolves.toBeNull();
      expect(modal.style.display).toBe('none');
      expect(uiController.isModalOpen()).toBe(false);

      jest.useRealTimers();
    });

    test('should hide specific modal and reset state when using hideModal', () => {
      const modal = {
        style: { display: 'block' },
        querySelector: jest.fn(() => null),
      };

      uiController.modals.choice = modal;
      uiController.uiState.modalOpen = true;
      uiController.uiState.currentModal = 'choice';

      uiController.hideModal('choice');

      expect(modal.style.display).toBe('none');
      expect(uiController.isModalOpen()).toBe(false);
      expect(uiController.getCurrentModal()).toBeNull();
    });
  });

  describe('board highlighting helpers', () => {
    test('should highlight spaces by id and clear highlights', () => {
      const highlightedElements = [
        { classList: { remove: jest.fn() } },
        { classList: { remove: jest.fn() } },
      ];

      document.querySelectorAll = jest.fn(() => highlightedElements);

      const spaceA = { classList: { add: jest.fn() } };
      const spaceB = { classList: { add: jest.fn() } };

      const originalImpl = document.getElementById.getMockImplementation();

      document.getElementById.mockImplementation((id) => {
        if (id === 'space-a') return spaceA;
        if (id === 'space-b') return spaceB;
        return modalElements[id] || null;
      });

      uiController.highlightSpaces([{ id: 'a' }, { id: 'b' }]);
      expect(spaceA.classList.add).toHaveBeenCalledWith('highlight');
      expect(spaceB.classList.add).toHaveBeenCalledWith('highlight');

      uiController.removeAllHighlights();
      highlightedElements.forEach((el) => {
        expect(el.classList.remove).toHaveBeenCalledWith('highlight');
      });

      document.getElementById.mockImplementation(originalImpl);
    });

    test('should setup and remove space click handlers', () => {
      const spaceElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      const originalImpl = document.getElementById.getMockImplementation();

      document.getElementById.mockImplementation((id) => {
        if (id === 'space-choice') return spaceElement;
        return modalElements[id] || null;
      });

      const onSpaceClick = jest.fn();
      const clickHandlers = uiController.setupSpaceClickHandlers([{ id: 'choice' }], onSpaceClick);

      expect(spaceElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));

      const handler = spaceElement.addEventListener.mock.calls[0][1];
      handler();

      expect(onSpaceClick).toHaveBeenCalled();

      uiController.removeSpaceClickHandlers([{ id: 'choice' }], clickHandlers);
      expect(spaceElement.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));

      document.getElementById.mockImplementation(originalImpl);
    });
  });

  describe('callbacks and state', () => {
    test('should register callbacks and execute them safely', () => {
      const callback = jest.fn().mockReturnValue('done');
      uiController.registerCallback('custom', callback);

      expect(uiController.executeCallback('custom', 1, 2)).toBe('done');
      expect(callback).toHaveBeenCalledWith(1, 2);

      expect(uiController.executeCallback('missing')).toBeUndefined();
    });

    test('getState should return a snapshot of UI state', () => {
      uiController.activateRollButton();
      const state = uiController.getState();

      expect(state.rollButtonActive).toBe(true);
      expect(state).not.toBe(uiController.uiState);
    });
  });

  describe('cleanup', () => {
    test('should reset managers, highlights, callbacks, and state', () => {
      uiController.registerCallback('test', jest.fn());
      uiController.uiState = {
        rollButtonActive: true,
        timerRunning: true,
        modalOpen: true,
        currentModal: 'gamePrompt',
      };

      const highlightedElements = [
        { classList: { remove: jest.fn() } },
      ];
      document.querySelectorAll = jest.fn(() => highlightedElements);

      uiController.cleanup();

      expect(rollButtonManager.cleanup).toHaveBeenCalled();
      expect(timerManager.stopTimer).toHaveBeenCalled();
      highlightedElements.forEach((el) => {
        expect(el.classList.remove).toHaveBeenCalledWith('highlight');
      });
      expect(uiController.callbacks.size).toBe(0);
      expect(uiController.isRollButtonActive()).toBe(false);
      expect(uiController.isTimerRunning()).toBe(false);
      expect(uiController.isModalOpen()).toBe(false);
    });
  });
});
