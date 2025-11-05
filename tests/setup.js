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
