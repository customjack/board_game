// Test setup file
// Mock DOM elements that the game engine expects
global.document.getElementById = jest.fn((id) => {
  const mockElement = {
    id,
    style: {},
    textContent: '',
    innerHTML: '',
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(() => false),
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    cloneNode: jest.fn(() => mockElement),
    parentNode: {
      replaceChild: jest.fn(),
    },
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
  };
  return mockElement;
});

global.document.createElement = jest.fn((tag) => ({
  tagName: tag.toUpperCase(),
  style: {},
  textContent: '',
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
  },
  addEventListener: jest.fn(),
}));

global.document.querySelectorAll = jest.fn(() => []);

// Mock Web Animations API
global.Animation = class Animation {
  constructor(effect, timeline) {
    this.effect = effect;
    this.timeline = timeline;
    this.playState = 'idle';
  }

  play() {
    this.playState = 'running';
  }

  pause() {
    this.playState = 'paused';
  }

  cancel() {
    this.playState = 'idle';
  }

  finish() {
    this.playState = 'finished';
  }
};

// Mock KeyframeEffect
global.KeyframeEffect = class KeyframeEffect {
  constructor(target, keyframes, options) {
    this.target = target;
    this.keyframes = keyframes;
    this.options = options;
  }
};

// Mock localStorage
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

// Mock fetch API
global.fetch = jest.fn((url) => {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      metadata: {
        name: 'Test Board',
        author: 'Test',
        description: 'Test board for testing'
      },
      spaces: [
        {
          id: 'start',
          name: 'Start',
          visualDetails: { x: 100, y: 100, size: 50 },
          connections: [],
          events: []
        }
      ]
    })
  });
});
