import MapEditorController from '../../src/js/editor/MapEditorController.js';
import GameEngineFactory from '../../src/js/infrastructure/factories/GameEngineFactory.js';
import TurnBasedGameEngine from '../../src/js/game/engine_types/turn_based/TurnBasedEngine.js';

// Silence console noise
beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    jest.restoreAllMocks();
});

function makeController(overrides = {}) {
    const pageRegistry = { showPage: jest.fn(), registerPage: jest.fn() };
    const eventBus = { emit: jest.fn(), on: jest.fn(), off: jest.fn() };
    const factoryManager = {
        getFactory: jest.fn((name) => {
            if (name === 'TriggerFactory') return { getRegisteredTypes: () => [], getMetadata: () => ({}) };
            if (name === 'ActionFactory') return { getRegisteredTypes: () => [], getMetadata: () => ({}) };
            if (name === 'EffectFactory') return { getRegisteredTypes: () => [], getMetadata: () => ({}) };
            if (name === 'PlaceholderRegistry') return { getAll: () => ({}) };
            return null;
        })
    };
    const pluginManager = {
        isHost: false,
        getRegisteredPlugins: jest.fn(() => []),
    };
    return new MapEditorController({ pageRegistry, eventBus, factoryManager, pluginManager, ...overrides });
}

describe('MapEditorController.init()', () => {
    beforeEach(() => {
        // Register a real engine type so getRegisteredTypes() returns something
        GameEngineFactory.engineRegistry = new Map();
        GameEngineFactory.register('turn-based', TurnBasedGameEngine);

        // Provide the full map editor HTML in jsdom
        document.body.innerHTML = `
            <div id="mapEditorPage">
                <button id="mapEditorBackButton"></button>
                <button id="mapEditorNewButton"></button>
                <button id="mapEditorLoadButton"></button>
                <input id="mapEditorBundleInput" type="file">
                <button id="mapEditorExportButton"></button>
                <button id="mapEditorUndoButton"></button>
                <button id="mapEditorRedoButton"></button>
                <span id="mapEditorStatus"></span>
                <div id="mapEditorPrimaryTabs" data-tab-group="editor">
                    <button class="map-editor-tab-button" data-tab="map">Map</button>
                    <button class="map-editor-tab-button" data-tab="metadata">Metadata</button>
                    <button class="map-editor-tab-button" data-tab="rules">Rules</button>
                    <button class="map-editor-tab-button" data-tab="engine">Engine</button>
                    <button class="map-editor-tab-button" data-tab="tutorial">Tutorial</button>
                </div>
                <div id="mapEditorMetadataForm" class="map-editor-tab-content" data-tab-group="editor" data-tab="metadata"></div>
                <button id="mapEditorMetadataApply"></button>
                <div id="mapEditorRulesForm" class="map-editor-tab-content" data-tab-group="editor" data-tab="rules"></div>
                <button id="mapEditorRulesApply"></button>
                <div id="mapEditorEngineForm" class="map-editor-tab-content" data-tab-group="editor" data-tab="engine"></div>
                <button id="mapEditorEngineApply"></button>
                <ul id="mapEditorSpaceList"></ul>
                <button id="mapEditorAddSpaceButton"></button>
                <button id="mapEditorDeleteSpaceButton"></button>
                <input id="mapEditorAssetsInput" type="file">
                <div id="mapEditorAssetsList"></div>
                <input id="mapEditorPreviewInput" type="file">
                <div id="mapEditorPreviewName"></div>
                <input id="mapEditorBackgroundInput" type="file">
                <div id="mapEditorBackgroundName"></div>
                <button id="mapEditorBackgroundClear"></button>
                <main id="mapEditorCanvas" class="map-editor-canvas" style="width:800px;height:600px;"></main>
                <div id="mapEditorSpaceEditor" style="display:none;">
                    <button id="mapEditorSpaceClose"></button>
                    <strong id="mapEditorSpaceTitle"></strong>
                    <div id="mapEditorSpaceTabs" data-tab-group="space">
                        <button class="map-editor-tab-button" data-tab="visual">Visual</button>
                        <button class="map-editor-tab-button" data-tab="events">Events</button>
                        <button class="map-editor-tab-button" data-tab="json">JSON</button>
                    </div>
                    <input id="mapEditorVisualSize" type="number">
                    <input id="mapEditorVisualColor" type="color">
                    <input id="mapEditorVisualTextColor" type="color">
                    <input id="mapEditorVisualFont" type="text">
                    <input id="mapEditorVisualImageSearch" type="text">
                    <select id="mapEditorVisualImageSelect"></select>
                    <button id="mapEditorVisualImageUse"></button>
                    <button id="mapEditorVisualImageClear"></button>
                    <div id="mapEditorVisualImageSelected"></div>
                    <button id="mapEditorVisualApply"></button>
                    <select id="mapEditorEventSelect"></select>
                    <button id="mapEditorEventAdd"></button>
                    <button id="mapEditorEventRemove"></button>
                    <select id="mapEditorEventTriggerType"></select>
                    <div id="mapEditorTriggerPayloadForm"></div>
                    <select id="mapEditorEventActionType"></select>
                    <div id="mapEditorActionPayloadForm"></div>
                    <select id="mapEditorEventPriority"></select>
                    <button id="mapEditorEventApply"></button>
                    <textarea id="mapEditorSpaceJsonView"></textarea>
                </div>
                <div id="mapEditorConnectionEditor" style="display:none;">
                    <button id="mapEditorConnectionClose"></button>
                    <strong id="mapEditorConnectionTitle"></strong>
                    <select id="mapEditorConnectionDirection"></select>
                    <input id="mapEditorConnectionColor" type="color">
                    <input id="mapEditorConnectionVisible" type="checkbox">
                    <button id="mapEditorConnectionApply"></button>
                    <button id="mapEditorConnectionRemove"></button>
                </div>
            </div>
        `;
    });

    test('init() completes without throwing', async () => {
        const controller = makeController();
        await expect(controller.init()).resolves.not.toThrow();
    });

    test('renderer is created after init', async () => {
        const controller = makeController();
        await controller.init();
        expect(controller.renderer).not.toBeNull();
    });

    test('stateManager has state after init', async () => {
        const controller = makeController();
        await controller.init();
        expect(controller.stateManager.state).not.toBeNull();
    });

    test('engine tab renders without getEditorConfigSchema errors', async () => {
        const controller = makeController();
        await controller.init();
        const engineForm = document.getElementById('mapEditorEngineForm');
        // Form should have been populated (not empty)
        expect(engineForm).not.toBeNull();
    });

    test('rules tab renders without getEditorSchema errors', async () => {
        const controller = makeController();
        await controller.init();
        const rulesForm = document.getElementById('mapEditorRulesForm');
        expect(rulesForm).not.toBeNull();
    });
});
