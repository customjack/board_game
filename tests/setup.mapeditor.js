// Setup file for map editor tests.
// Intentionally does NOT mock document.createElement — MapEditorController needs
// the real jsdom implementation (dataset, innerHTML, appendChild, querySelector, etc.).

// Mock localStorage
global.localStorage = {
    store: {},
    getItem(key) { return this.store[key] || null; },
    setItem(key, value) { this.store[key] = String(value); },
    removeItem(key) { delete this.store[key]; },
    clear() { this.store = {}; }
};

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
            metadata: { name: 'Test Board', author: 'Test', description: 'Test' },
            spaces: [{ id: 'start', name: 'Start', visualDetails: { x: 100, y: 100, size: 50 }, connections: [], events: [] }]
        }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
    })
);

// Mock Web Animations API
global.Animation = class Animation {
    constructor() { this.playState = 'idle'; }
    play() { this.playState = 'running'; }
    pause() { this.playState = 'paused'; }
    cancel() { this.playState = 'idle'; }
    finish() { this.playState = 'finished'; }
};
global.KeyframeEffect = class KeyframeEffect {
    constructor(target, keyframes, options) {
        this.target = target; this.keyframes = keyframes; this.options = options;
    }
};
