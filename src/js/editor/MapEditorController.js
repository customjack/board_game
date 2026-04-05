import JSZip from 'jszip';
import MapEditorStateManager from './MapEditorStateManager.js';
import MapEditorBundleLoader from './MapEditorBundleLoader.js';
import MapEditorRenderer from './MapEditorRenderer.js';
import MapEditorSpaceModal from './MapEditorSpaceModal.js';
import MapEditorConnectionModal from './MapEditorConnectionModal.js';
import GameRules from '../game/rules/GameRules.js';
import GameEngineFactory from '../infrastructure/factories/GameEngineFactory.js';

const BACKGROUND_ASSET_NAME = '_background';

const METADATA_SCHEMA = {
    type: 'object',
    properties: {
        name: { type: 'string', required: true, description: 'Display name for the board' },
        author: { type: 'string', description: 'Creator or studio name' },
        version: { type: 'string', description: 'Semantic version, e.g. 1.0.0' },
        description: { type: 'string', description: 'Short description', ui: { widget: 'textarea' } },
        tags: { type: 'array', description: 'Searchable tags', items: { type: 'string' } }
    }
};

const ENGINE_SCHEMA = {
    type: 'object',
    properties: {
        type: { type: 'string', description: 'Engine type', enum: [] },
        config: {
            type: 'object',
            description: 'Engine configuration',
            ui: { allowAdditional: true, collapsed: true }
        }
    }
};

export default class MapEditorController {
    constructor({ pageRegistry, eventBus, factoryManager, pluginManager }) {
        this.pageRegistry = pageRegistry;
        this.eventBus = eventBus;
        this.factoryManager = factoryManager;
        this.pluginManager = pluginManager;
        this.stateManager = new MapEditorStateManager();
        this.renderer = null;
        this.selectedSpaceId = null;
        this.selectedConnection = null;
        this.currentEventIndex = null;
        this.availableActions = [];
        this.availableTriggers = [];
        this.availableEffects = [];
        this.actionMetadataByType = {};
        this.triggerMetadataByType = {};
        this.effectMetadataByType = {};
        this.placeholderRegistry = null;
        this.placeholderMetadata = {};
        this.missingDependencies = [];
        this.assetsRootFallback = 'assets/';
        this.selectedVisualImagePath = null;
        this.effectPayloadSchema = null;
        this.effectPayloadContainer = null;
        this.effectTypeSelect = null;
        this.formCache = {};
        this.sectionAutoSaveTimers = {};
        this.gridEnabled = true;
        this.gridSize = 50;
        this.snapToGridEnabled = false;
        this.showHiddenConnections = false;
        this.drawConnectionMode = false;
        this.spaceEditorDragState = null;
        this.spaceEditorModal = null;
        this.connectionEditorDragState = null;
        this.connectionModal = null;
    }

    async init() {
        this.cacheElements();
        this.bindEvents();
        this.spaceEditorModal = new MapEditorSpaceModal({ id: 'mapEditorSpaceEditor' });
        this.spaceEditorModal.init();
        this.connectionModal = new MapEditorConnectionModal({ id: 'mapEditorConnectionEditor' });
        this.connectionModal.init();
        this.renderer = new MapEditorRenderer({
            container: this.elements.canvas,
            onSelectSpace: (spaceId) => this.selectSpace(spaceId),
            onMoveSpace: (spaceId, position) => this.updateSpacePosition(spaceId, position),
            onContextSpace: (spaceId, position) => this.openSpaceEditor(spaceId, position),
            onToggleGrid: () => this.toggleGrid(),
            onToggleSnap: () => this.toggleSnapToGrid(),
            onToggleConnections: () => this.toggleHiddenConnections(),
            onToggleDrawConnectionMode: () => this.toggleDrawConnectionMode(),
            onCreateConnection: (fromId, toId) => this.createConnection(fromId, toId),
            onSelectConnection: (fromId, toId) => this.selectConnection(fromId, toId),
            onEditConnection: (fromId, toId, position) => this.editConnection(fromId, toId, position)
        });

        this.refreshAvailableTypes();

        const draft = this.stateManager.loadDraft();
        if (draft) {
            this.setState(draft, { pushHistory: false });
            this.setStatus('Draft loaded');
        } else {
            await this.loadDefaultTemplate();
        }

        this.renderAll();
    }

    setupTabs(tabBar, defaultTab) {
        if (!tabBar) return;
        const group = tabBar.dataset.tabGroup || 'default';
        const buttons = Array.from(tabBar.querySelectorAll('.map-editor-tab-button'));
        buttons.forEach((btn) => {
            btn.addEventListener('click', () => this.activateTab(tabBar, btn.dataset.tab, group));
        });
        this.activateTab(tabBar, defaultTab || buttons[0]?.dataset.tab, group);
    }

    activateTab(tabBar, tabName, group = 'default') {
        if (!tabBar) return;
        const buttons = Array.from(tabBar.querySelectorAll('.map-editor-tab-button'));
        buttons.forEach((btn) => {
            const isActive = btn.dataset.tab === tabName;
            btn.classList.toggle('active', isActive);
        });
        const container = tabBar.parentElement;
        if (!container) return;
        const panels = Array.from(container.querySelectorAll(
            `.map-editor-tab-content[data-tab-group="${group}"]`
        ));
        panels.forEach((panel) => {
            const isActive = panel.dataset.tab === tabName;
            panel.classList.toggle('active', isActive);
        });
    }

    cacheElements() {
        this.elements = {
            backButton: document.getElementById('mapEditorBackButton'),
            newButton: document.getElementById('mapEditorNewButton'),
            loadButton: document.getElementById('mapEditorLoadButton'),
            bundleInput: document.getElementById('mapEditorBundleInput'),
            exportButton: document.getElementById('mapEditorExportButton'),
            undoButton: document.getElementById('mapEditorUndoButton'),
            redoButton: document.getElementById('mapEditorRedoButton'),
            status: document.getElementById('mapEditorStatus'),
            primaryTabs: document.getElementById('mapEditorPrimaryTabs'),
            spaceTabs: document.getElementById('mapEditorSpaceTabs'),
            metadataForm: document.getElementById('mapEditorMetadataForm'),
            metadataApply: document.getElementById('mapEditorMetadataApply'),
            rulesForm: document.getElementById('mapEditorRulesForm'),
            rulesApply: document.getElementById('mapEditorRulesApply'),
            engineForm: document.getElementById('mapEditorEngineForm'),
            engineApply: document.getElementById('mapEditorEngineApply'),
            spaceList: document.getElementById('mapEditorSpaceList'),
            addSpaceButton: document.getElementById('mapEditorAddSpaceButton'),
            deleteSpaceButton: document.getElementById('mapEditorDeleteSpaceButton'),
            assetsInput: document.getElementById('mapEditorAssetsInput'),
            assetsList: document.getElementById('mapEditorAssetsList'),
            previewInput: document.getElementById('mapEditorPreviewInput'),
            previewName: document.getElementById('mapEditorPreviewName'),
            backgroundInput: document.getElementById('mapEditorBackgroundInput'),
            backgroundClear: document.getElementById('mapEditorBackgroundClear'),
            backgroundName: document.getElementById('mapEditorBackgroundName'),
            spaceEditor: document.getElementById('mapEditorSpaceEditor'),
            spaceEditorHeader: document.getElementById('mapEditorSpaceHeader'),
            spaceEditorTitle: document.getElementById('mapEditorSpaceTitle'),
            spaceEditorClose: document.getElementById('mapEditorSpaceClose'),
            connectionEditor: document.getElementById('mapEditorConnectionEditor'),
            connectionEditorHeader: document.getElementById('mapEditorConnectionHeader'),
            connectionEditorTitle: document.getElementById('mapEditorConnectionTitle'),
            connectionEditorClose: document.getElementById('mapEditorConnectionClose'),
            connectionDirection: document.getElementById('mapEditorConnectionDirection'),
            connectionColor: document.getElementById('mapEditorConnectionColor'),
            connectionVisible: document.getElementById('mapEditorConnectionVisible'),
            connectionApply: document.getElementById('mapEditorConnectionApply'),
            connectionRemove: document.getElementById('mapEditorConnectionRemove'),
            visualSize: document.getElementById('mapEditorVisualSize'),
            visualColor: document.getElementById('mapEditorVisualColor'),
            visualTextColor: document.getElementById('mapEditorVisualTextColor'),
            visualFont: document.getElementById('mapEditorVisualFont'),
            visualImageSearch: document.getElementById('mapEditorVisualImageSearch'),
            visualImageSelect: document.getElementById('mapEditorVisualImageSelect'),
            visualImageUse: document.getElementById('mapEditorVisualImageUse'),
            visualImageClear: document.getElementById('mapEditorVisualImageClear'),
            visualImageSelected: document.getElementById('mapEditorVisualImageSelected'),
            visualApply: document.getElementById('mapEditorVisualApply'),
            eventSelect: document.getElementById('mapEditorEventSelect'),
            eventAdd: document.getElementById('mapEditorEventAdd'),
            eventRemove: document.getElementById('mapEditorEventRemove'),
            eventTriggerType: document.getElementById('mapEditorEventTriggerType'),
            triggerPayloadForm: document.getElementById('mapEditorTriggerPayloadForm'),
            eventActionType: document.getElementById('mapEditorEventActionType'),
            actionPayloadForm: document.getElementById('mapEditorActionPayloadForm'),
            eventPriority: document.getElementById('mapEditorEventPriority'),
            eventApply: document.getElementById('mapEditorEventApply'),
            spaceJsonView: document.getElementById('mapEditorSpaceJsonView'),
            canvas: document.getElementById('mapEditorCanvas')
        };
    }

    bindEvents() {
        if (this.elements.backButton) {
            this.elements.backButton.addEventListener('click', () => this.handleBack());
        }
        if (this.elements.newButton) {
            this.elements.newButton.addEventListener('click', () => this.handleNewMap());
        }
        if (this.elements.loadButton && this.elements.bundleInput) {
            this.elements.loadButton.addEventListener('click', () => this.elements.bundleInput.click());
            this.elements.bundleInput.addEventListener('change', (event) => this.handleBundleUpload(event));
        }
        if (this.elements.exportButton) {
            this.elements.exportButton.addEventListener('click', () => this.exportBundle());
        }
        if (this.elements.undoButton) {
            this.elements.undoButton.addEventListener('click', () => this.handleUndo());
        }
        if (this.elements.redoButton) {
            this.elements.redoButton.addEventListener('click', () => this.handleRedo());
        }
        if (this.elements.metadataApply) {
            this.elements.metadataApply.addEventListener('click', () => this.applyFormSection('metadata'));
        }
        if (this.elements.metadataForm) {
            this.elements.metadataForm.addEventListener('change', () => this.queueSectionAutoSave('metadata'));
        }
        if (this.elements.rulesApply) {
            this.elements.rulesApply.addEventListener('click', () => this.applyFormSection('rules'));
        }
        if (this.elements.rulesForm) {
            this.elements.rulesForm.addEventListener('change', () => this.queueSectionAutoSave('rules'));
            this.elements.rulesForm.addEventListener('change', (event) => this.handleRulesFormChange(event));
        }
        if (this.elements.engineApply) {
            this.elements.engineApply.addEventListener('click', () => this.applyFormSection('engine'));
        }
        if (this.elements.engineForm) {
            this.elements.engineForm.addEventListener('change', () => this.queueSectionAutoSave('engine'));
            this.elements.engineForm.addEventListener('change', (event) => this.handleEngineFormChange(event));
        }
        if (this.elements.addSpaceButton) {
            this.elements.addSpaceButton.addEventListener('click', () => this.addSpace());
        }
        if (this.elements.deleteSpaceButton) {
            this.elements.deleteSpaceButton.addEventListener('click', () => this.deleteSelectedSpace());
        }
        if (this.elements.assetsInput) {
            this.elements.assetsInput.addEventListener('change', (event) => this.handleAssetUpload(event));
        }
        if (this.elements.previewInput) {
            this.elements.previewInput.addEventListener('change', (event) => this.handlePreviewUpload(event));
        }
        if (this.elements.backgroundInput) {
            this.elements.backgroundInput.addEventListener('change', (event) => this.handleBackgroundUpload(event));
        }
        if (this.elements.backgroundClear) {
            this.elements.backgroundClear.addEventListener('click', () => this.clearBackground());
        }
        if (this.elements.visualImageSearch) {
            this.elements.visualImageSearch.addEventListener('input', () => this.renderVisualAssetOptions());
        }
        if (this.elements.visualImageSelect) {
            this.elements.visualImageSelect.addEventListener('change', () => this.updateSelectedVisualImage());
        }
        if (this.elements.visualImageUse) {
            this.elements.visualImageUse.addEventListener('click', () => this.updateSelectedVisualImage());
        }
        if (this.elements.visualImageClear) {
            this.elements.visualImageClear.addEventListener('click', () => this.clearSelectedVisualImage());
        }
        if (this.elements.spaceEditorClose) {
            this.elements.spaceEditorClose.addEventListener('click', () => this.closeSpaceEditor());
        }
        if (this.elements.spaceEditorHeader) {
            this.elements.spaceEditorHeader.addEventListener('mousedown', this.handleSpaceEditorDragStart);
            this.elements.spaceEditorHeader.addEventListener('touchstart', this.handleSpaceEditorDragStart, { passive: false });
        }
        if (this.elements.connectionEditorClose) {
            this.elements.connectionEditorClose.addEventListener('click', () => this.closeConnectionEditor());
        }
        if (this.elements.connectionEditorHeader) {
            this.elements.connectionEditorHeader.addEventListener('mousedown', this.handleConnectionEditorDragStart);
            this.elements.connectionEditorHeader.addEventListener('touchstart', this.handleConnectionEditorDragStart, { passive: false });
        }
        if (this.elements.connectionApply) {
            this.elements.connectionApply.addEventListener('click', () => this.applyConnectionEdits());
        }
        if (this.elements.connectionRemove) {
            this.elements.connectionRemove.addEventListener('click', () => this.removeSelectedConnection());
        }
        if (this.elements.visualApply) {
            this.elements.visualApply.addEventListener('click', () => this.applyVisualEdits());
        }
        if (this.elements.eventAdd) {
            this.elements.eventAdd.addEventListener('click', () => this.addEvent());
        }
        if (this.elements.eventRemove) {
            this.elements.eventRemove.addEventListener('click', () => this.removeEvent());
        }
        if (this.elements.eventApply) {
            this.elements.eventApply.addEventListener('click', () => this.applyEventEdits());
        }
        if (this.elements.eventSelect) {
            this.elements.eventSelect.addEventListener('change', () => this.loadSelectedEvent());
        }
        if (this.elements.eventTriggerType) {
            this.elements.eventTriggerType.addEventListener('change', () => {
                const triggerType = this.elements.eventTriggerType.value;
                this.renderTriggerPayloadForm(triggerType, {});
            });
        }
        if (this.elements.eventActionType) {
            this.elements.eventActionType.addEventListener('change', () => {
                const actionType = this.elements.eventActionType.value;
                this.renderActionPayloadForm(actionType, {});
            });
        }
        if (this.elements.canvas) {
            this.elements.canvas.addEventListener('click', () => this.clearSelection());
        }
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', () => this.clampSpaceEditorPosition());
            window.addEventListener('resize', () => this.clampConnectionEditorPosition());
            window.addEventListener('keydown', this.handleWindowKeyDown);
            window.addEventListener('keyup', this.handleWindowKeyUp);
        }
        this.setupTabs(this.elements.primaryTabs, 'map');
        this.setupTabs(this.elements.spaceTabs, 'visual');
    }

    handleBack() {
        if (this.pageRegistry) {
            this.pageRegistry.showPage('homePage');
        }
        if (this.eventBus) {
            this.eventBus.emit('pageChanged', { pageId: 'homePage' });
        }
    }

    async handleNewMap() {
        await this.loadDefaultTemplate();
        this.resetMetadataTimestamps();
        this.setStatus('New map loaded');
    }

    async handleBundleUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const bundle = await MapEditorBundleLoader.loadBundle(file);
            const state = this.buildStateFromBundle(bundle);
            this.setState(state, { pushHistory: false });
            this.setStatus(`Loaded ${file.name}`);
            this.selectedSpaceId = state.topology?.spaces?.[0]?.id || null;
            this.renderAll();
        } catch (error) {
            console.error('[MapEditor] Failed to load bundle', error);
            this.setStatus('Failed to load bundle');
        } finally {
            event.target.value = '';
        }
    }

    handleUndo() {
        const next = this.stateManager.undo();
        if (!next) return;
        this.setStatus('Undo');
        this.selectedSpaceId = next.topology?.spaces?.[0]?.id || null;
        this.renderAll();
    }

    handleRedo() {
        const next = this.stateManager.redo();
        if (!next) return;
        this.setStatus('Redo');
        this.selectedSpaceId = next.topology?.spaces?.[0]?.id || null;
        this.renderAll();
    }

    async loadDefaultTemplate() {
        try {
            const manifest = await this.fetchJson('assets/maps/default-board/board.json');
            const metadata = await this.fetchJson('assets/maps/default-board/metadata.json');
            const engine = await this.fetchJson('assets/maps/default-board/engine.json');
            const rules = await this.fetchJson('assets/maps/default-board/rules.json');
            const ui = await this.fetchJson('assets/maps/default-board/ui.json');
            const topology = await this.fetchJson('assets/maps/default-board/topology.json');
            let dependencies = { plugins: [] };
            try {
                dependencies = await this.fetchJson('assets/maps/default-board/dependencies.json');
            } catch (_) {}

            const preview = await this.fetchDataUrl('assets/maps/default-board/preview.png');

            const state = {
                manifest,
                metadata,
                engine,
                rules,
                ui,
                topology,
                dependencies,
                assets: [],
                preview: preview ? { name: 'preview.png', path: 'preview.png', dataUrl: preview } : null,
                background: null
            };

            this.setState(state, { pushHistory: false });
            this.selectedSpaceId = topology?.spaces?.[0]?.id || null;
        } catch (error) {
            console.error('[MapEditor] Failed to load default template', error);
        }
    }

    buildStateFromBundle(bundle) {
        const metadata = bundle.files.metadata || {};
        const backgroundPath = metadata.renderConfig?.backgroundImage || null;
        let assets = bundle.assets || [];
        let background = null;

        if (backgroundPath) {
            const matchIndex = assets.findIndex((asset) => asset.path === backgroundPath);
            if (matchIndex >= 0) {
                background = assets[matchIndex];
                assets = assets.filter((_, index) => index !== matchIndex);
            }
        }

        if (!background) {
            const reservedIndex = assets.findIndex((asset) => {
                const name = asset.name?.toLowerCase() || '';
                return name.startsWith(BACKGROUND_ASSET_NAME);
            });
            if (reservedIndex >= 0) {
                background = assets[reservedIndex];
                assets = assets.filter((_, index) => index !== reservedIndex);
            }
        }

        if (background && !metadata.renderConfig?.backgroundImage) {
            metadata.renderConfig = {
                ...(metadata.renderConfig || {}),
                backgroundImage: background.path
            };
        }

        return {
            manifest: bundle.manifest,
            metadata,
            engine: bundle.files.engine,
            rules: bundle.files.rules,
            ui: bundle.files.ui,
            topology: bundle.files.topology,
            dependencies: bundle.files.dependencies || { plugins: [] },
            assets,
            preview: bundle.preview || null,
            background
        };
    }

    setState(state, { pushHistory = true } = {}) {
        const normalized = {
            ...state,
            dependencies: state.dependencies || { plugins: [] },
            assets: state.assets || [],
            background: state.background || null
        };
        this.formCache = {};
        this.stateManager.setState(normalized, { pushHistory });
        this.updateDependenciesFromUsage();
        this.renderAll();
    }

    updateStateSection(key, value) {
        this.stateManager.updateSection(key, value);
        this.updateDependenciesFromUsage();
        this.updateMetadataTimestamps();
        this.renderAll();
    }

    resetMetadataTimestamps() {
        const state = this.stateManager.state;
        if (!state?.metadata) return;
        const now = new Date().toISOString();
        const metadata = {
            ...state.metadata,
            created: now,
            modified: now
        };
        this.stateManager.setState({ ...state, metadata }, { pushHistory: false });
        this.renderAll();
    }

    updateMetadataTimestamps() {
        const state = this.stateManager.state;
        if (!state?.metadata) return;
        const now = new Date().toISOString();
        const created = state.metadata.created || now;
        const modified = now;
        if (state.metadata.created === created && state.metadata.modified === modified) {
            return;
        }
        const metadata = {
            ...state.metadata,
            created,
            modified
        };
        this.stateManager.setState({ ...state, metadata }, { pushHistory: false });
    }

    selectSpace(spaceId) {
        this.selectedSpaceId = spaceId;
        this.selectedConnection = null;
        this.renderSpaceList();
        this.renderSpaceJsonView();
        this.renderCanvas();
        if (this.elements.spaceEditor?.style.display === 'block') {
            this.populateSpaceEditor();
        }
    }

    selectConnection(fromId, toId) {
        this.selectedConnection = { fromId: String(fromId), toId: String(toId) };
        this.selectedSpaceId = null;
        this.renderSpaceList();
        this.renderSpaceJsonView();
        this.renderCanvas();
    }

    editConnection(fromId, toId, position = null) {
        this.selectConnection(fromId, toId);
        this.openConnectionEditor(position);
    }

    updateSpacePosition(spaceId, position) {
        const state = this.stateManager.state;
        if (!state?.topology?.spaces) return;
        const updatedSpaces = state.topology.spaces.map((space) => {
            if (String(space.id) !== String(spaceId)) return space;
            return {
                ...space,
                position: {
                    ...space.position,
                    ...position
                }
            };
        });
        this.updateStateSection('topology', { ...state.topology, spaces: updatedSpaces });
    }

    addSpace() {
        const state = this.stateManager.state;
        if (!state?.topology) return;
        const spaces = state.topology.spaces || [];
        const newId = this.generateSpaceId(spaces);
        const newSpace = {
            id: newId,
            name: 'New Space',
            type: 'action',
            position: { x: 200, y: 200 },
            visual: {
                size: 50,
                color: '#ccccff',
                textColor: '#000000'
            },
            connections: [],
            triggers: []
        };
        this.updateStateSection('topology', {
            ...state.topology,
            spaces: [...spaces, newSpace]
        });
        this.selectedSpaceId = newId;
        this.renderAll();
    }

    deleteSelectedSpace() {
        const state = this.stateManager.state;
        if (!state?.topology?.spaces || !this.selectedSpaceId) return;
        const remaining = state.topology.spaces.filter((space) => String(space.id) !== String(this.selectedSpaceId));
        const cleaned = remaining.map((space) => ({
            ...space,
            connections: (space.connections || []).filter((conn) => String(conn.targetId) !== String(this.selectedSpaceId))
        }));
        this.updateStateSection('topology', { ...state.topology, spaces: cleaned });
        this.selectedSpaceId = cleaned[0]?.id || null;
        this.selectedConnection = null;
        this.renderAll();
    }

    applyFormSection(section) {
        const formMap = {
            metadata: this.elements.metadataForm,
            rules: this.elements.rulesForm,
            engine: this.elements.engineForm
        };
        const schemaMap = {
            metadata: METADATA_SCHEMA,
            rules: this.getRulesSchema(),
            engine: this.getEngineSchema()
        };
        const container = formMap[section];
        const schema = schemaMap[section];
        if (!container || !schema) return;
        const parsed = this.collectSchemaValue(schema, container);
        if (!parsed) return;
        const existing = this.stateManager.state?.[section] || {};
        const merged = { ...existing, ...parsed };
        if (section === 'metadata') {
            merged.created = existing.created || new Date().toISOString();
        }
        this.updateStateSection(section, merged);
        this.setStatus(`${section} updated`);
    }

    queueSectionAutoSave(section) {
        if (this.sectionAutoSaveTimers[section]) {
            clearTimeout(this.sectionAutoSaveTimers[section]);
        }
        this.sectionAutoSaveTimers[section] = setTimeout(() => {
            this.sectionAutoSaveTimers[section] = null;
            this.applyFormSection(section);
        }, 0);
    }

    handleAssetUpload(event) {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        const state = this.stateManager.state;
        const assetsRoot = state?.manifest?.assetsRoot || this.assetsRootFallback;
        const existing = state?.assets || [];
        const existingPaths = new Set(existing.map((asset) => asset.path));

        const additions = [];
        const readPromises = files.map((file) => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                let path = `${assetsRoot}${file.name}`;
                if (existingPaths.has(path)) {
                    const stamped = `${file.name.replace(/\\.(?=[^\\.]+$)/, '')}-${Date.now()}`;
                    const extension = file.name.split('.').pop();
                    path = `${assetsRoot}${stamped}.${extension}`;
                }
                additions.push({
                    id: path,
                    name: file.name,
                    path,
                    dataUrl: reader.result,
                    contentType: file.type || 'application/octet-stream'
                });
                resolve();
            };
            reader.readAsDataURL(file);
        }));

        Promise.all(readPromises).then(() => {
            this.updateStateSection('assets', [...existing, ...additions]);
            this.setStatus(`Added ${additions.length} asset(s)`);
        });
        event.target.value = '';
    }

    handlePreviewUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const state = this.stateManager.state;
            const preview = {
                name: file.name,
                path: 'preview.png',
                dataUrl: reader.result
            };
            this.updateStateSection('preview', preview);
            this.setStatus('Preview updated');
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    }

    handleBackgroundUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const state = this.stateManager.state;
            const assetsRoot = state?.manifest?.assetsRoot || this.assetsRootFallback;
            const extension = file.name.split('.').pop() || 'png';
            const path = `${assetsRoot}${BACKGROUND_ASSET_NAME}.${extension}`;
            const background = {
                name: file.name,
                path,
                dataUrl: reader.result,
                contentType: file.type || 'application/octet-stream'
            };
            this.setBackground(background);
            this.setStatus('Background updated');
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    }

    toggleGrid() {
        this.gridEnabled = !this.gridEnabled;
        this.renderCanvas();
    }

    toggleSnapToGrid() {
        this.snapToGridEnabled = !this.snapToGridEnabled;
        this.renderCanvas();
        this.setStatus(this.snapToGridEnabled ? 'Grid lock enabled' : 'Grid lock disabled');
    }

    toggleHiddenConnections() {
        this.showHiddenConnections = !this.showHiddenConnections;
        this.renderCanvas();
        this.setStatus(this.showHiddenConnections ? 'Hidden connections visible' : 'Hidden connections hidden');
    }

    toggleDrawConnectionMode() {
        this.drawConnectionMode = !this.drawConnectionMode;
        this.renderCanvas();
        this.setStatus(this.drawConnectionMode ? 'Draw connection mode enabled' : 'Draw connection mode disabled');
    }

    clearBackground() {
        this.setBackground(null);
        this.setStatus('Background cleared');
    }

    setBackground(background) {
        const state = this.stateManager.state;
        if (!state) return;
        const renderConfig = {
            ...(state.metadata?.renderConfig || {})
        };
        if (background?.path) {
            renderConfig.backgroundImage = background.path;
        } else {
            delete renderConfig.backgroundImage;
        }

        const metadata = {
            ...(state.metadata || {}),
            renderConfig
        };

        this.stateManager.setState({
            ...state,
            metadata,
            background
        }, { pushHistory: true });

        this.updateMetadataTimestamps();
        this.renderAll();
    }

    applyAssetToSelectedSpace(assetPath) {
        const state = this.stateManager.state;
        if (!state?.topology?.spaces || !this.selectedSpaceId) return;
        const updatedSpaces = state.topology.spaces.map((space) => {
            if (String(space.id) !== String(this.selectedSpaceId)) return space;
            return {
                ...space,
                visual: {
                    ...space.visual,
                    image: assetPath
                }
            };
        });
        this.updateStateSection('topology', { ...state.topology, spaces: updatedSpaces });
    }

    setPreviewFromAsset(asset) {
        if (!asset?.dataUrl) return;
        this.updateStateSection('preview', {
            name: asset.name,
            path: 'preview.png',
            dataUrl: asset.dataUrl
        });
    }

    removeAsset(assetPath) {
        const state = this.stateManager.state;
        if (!state?.assets) return;
        const assets = state.assets.filter((asset) => asset.path !== assetPath);
        const cleanedSpaces = (state.topology?.spaces || []).map((space) => {
            if (space.visual?.image === assetPath) {
                return {
                    ...space,
                    visual: {
                        ...space.visual,
                        image: null
                    }
                };
            }
            return space;
        });
        this.updateStateSection('assets', assets);
        this.updateStateSection('topology', { ...state.topology, spaces: cleanedSpaces });
    }

    buildAssetMap() {
        const state = this.stateManager.state;
        const assets = state?.assets || [];
        return assets.reduce((acc, asset) => {
            acc[asset.path] = asset.dataUrl;
            return acc;
        }, {});
    }

    updateDependenciesFromUsage() {
        const state = this.stateManager.state;
        if (!state) return;
        const spaces = state.topology?.spaces || [];
        const usedActions = new Set();
        const usedTriggers = new Set();
        const usedEffects = new Set();

        spaces.forEach((space) => {
            (space.triggers || []).forEach((trigger) => {
                if (trigger?.when?.type) usedTriggers.add(trigger.when.type);
                if (trigger?.action?.type) usedActions.add(trigger.action.type);
                if (trigger?.action?.type === 'APPLY_EFFECT') {
                    const effectType = trigger?.action?.payload?.effect?.type;
                    if (effectType) usedEffects.add(effectType);
                }
            });
        });

        const pluginMap = this.buildPluginTypeMap();
        const dependencies = [];
        this.missingDependencies = [];

        dependencies.push({
            id: 'core',
            version: '^1.0.0',
            source: 'builtin',
            description: 'Core game functionality'
        });

        const addDependency = (pluginMeta, category, type) => {
            if (!pluginMeta) {
                this.missingDependencies.push({ category, type });
                return;
            }
            if (pluginMeta.isDefault) {
                return;
            }
            if (dependencies.some((dep) => dep.id === pluginMeta.id)) {
                return;
            }
            dependencies.push({
                id: pluginMeta.id,
                version: pluginMeta.version,
                source: pluginMeta.source || (pluginMeta.url ? 'cdn' : 'local'),
                cdn: pluginMeta.url || null,
                name: pluginMeta.name,
                description: pluginMeta.description || ''
            });
        };

        usedActions.forEach((type) => addDependency(pluginMap.actions.get(type), 'action', type));
        usedTriggers.forEach((type) => addDependency(pluginMap.triggers.get(type), 'trigger', type));
        usedEffects.forEach((type) => addDependency(pluginMap.effects.get(type), 'effect', type));

        const existing = state.dependencies || {};
        this.stateManager.setState({
            ...state,
            dependencies: {
                ...existing,
                plugins: dependencies
            }
        }, { pushHistory: false });
    }

    buildPluginTypeMap() {
        const plugins = this.pluginManager?.getAllPlugins?.() || [];
        const map = {
            actions: new Map(),
            triggers: new Map(),
            effects: new Map()
        };
        plugins.forEach((plugin) => {
            const provides = plugin.provides || {};
            (provides.actions || []).forEach((type) => map.actions.set(type, plugin));
            (provides.triggers || []).forEach((type) => map.triggers.set(type, plugin));
            (provides.effects || []).forEach((type) => map.effects.set(type, plugin));
        });
        return map;
    }

    refreshAvailableTypes() {
        const actionFactory = this.factoryManager?.getFactory?.('ActionFactory');
        const triggerFactory = this.factoryManager?.getFactory?.('TriggerFactory');
        const effectFactory = this.factoryManager?.getFactory?.('EffectFactory');
        const actionMetadata = actionFactory?.getAllMetadata?.() || {};
        const triggerMetadata = triggerFactory?.getAllMetadata?.() || {};
        const effectMetadata = effectFactory?.getAllMetadata?.() || {};

        this.actionMetadataByType = actionMetadata;
        this.triggerMetadataByType = triggerMetadata;
        this.effectMetadataByType = effectMetadata;

        this.availableActions = Object.keys(actionMetadata).sort();
        this.availableTriggers = Object.keys(triggerMetadata).sort();
        this.availableEffects = Object.keys(effectMetadata).sort();

        const actionLabels = this.buildLabelMap(actionMetadata);
        const triggerLabels = this.buildLabelMap(triggerMetadata);

        this.fillSelect(this.elements.eventActionType, this.availableActions, actionLabels);
        this.fillSelect(this.elements.eventTriggerType, this.availableTriggers, triggerLabels);
        this.refreshPlaceholderMetadata();
    }

    refreshPlaceholderMetadata() {
        const registry = this.pluginManager?.registryManager?.getRegistry?.('placeholderRegistry');
        this.placeholderRegistry = registry || null;
        this.placeholderMetadata = registry?.getAllMetadata?.() || {};
    }

    fillSelect(select, options, labels = {}) {
        if (!select) return;
        select.innerHTML = '';
        options.forEach((option) => {
            const entry = document.createElement('option');
            entry.value = option;
            entry.textContent = labels[option] || option;
            select.appendChild(entry);
        });
    }

    openSpaceEditor(spaceId, position = null) {
        this.selectSpace(spaceId);
        if (!this.elements.spaceEditor) return;
        if (this.spaceEditorModal) {
            this.spaceEditorModal.open();
        } else {
            this.elements.spaceEditor.style.display = 'flex';
        }
        this.activateTab(this.elements.spaceTabs, 'visual');
        this.populateSpaceEditor();

        if (position) {
            this.positionSpaceEditor(position);
        } else {
            this.clampSpaceEditorPosition();
        }
    }

    closeSpaceEditor() {
        if (this.spaceEditorModal) {
            this.spaceEditorModal.close();
        } else if (this.elements.spaceEditor) {
            this.elements.spaceEditor.style.display = 'none';
        }
    }

    openConnectionEditor(position = null) {
        if (!this.elements.connectionEditor) return;
        if (this.connectionModal) {
            this.connectionModal.open();
        } else {
            this.elements.connectionEditor.style.display = 'flex';
        }
        this.populateConnectionEditor();
        if (position) {
            this.positionConnectionEditor(position);
        } else {
            this.clampConnectionEditorPosition();
        }
    }

    closeConnectionEditor() {
        if (this.connectionModal) {
            this.connectionModal.close();
        } else if (this.elements.connectionEditor) {
            this.elements.connectionEditor.style.display = 'none';
        }
    }

    clearSelection() {
        this.selectedSpaceId = null;
        this.selectedConnection = null;
        this.currentEventIndex = null;
        this.closeSpaceEditor();
        this.closeConnectionEditor();
        this.renderSpaceList();
        this.renderSpaceJsonView();
        this.renderCanvas();
        this.updateUndoRedoButtons();
    }

    positionSpaceEditor(position) {
        if (!this.elements.spaceEditor) return;
        const modal = this.elements.spaceEditor;
        modal.style.right = 'auto';
        modal.style.bottom = 'auto';
        const padding = 16;
        requestAnimationFrame(() => {
            const rect = modal.getBoundingClientRect();
            const maxLeft = Math.max(padding, window.innerWidth - rect.width - padding);
            const maxTop = Math.max(padding, window.innerHeight - rect.height - padding);
            const left = Math.min(Math.max(padding, position.x + 12), maxLeft);
            const top = Math.min(Math.max(padding, position.y + 12), maxTop);
            modal.style.left = `${left}px`;
            modal.style.top = `${top}px`;
        });
    }

    handleSpaceEditorDragStart = (event) => {
        if (!this.elements.spaceEditor) return;
        if (this.elements.spaceEditorClose?.contains(event.target)) return;
        if (event.type === 'touchstart') {
            event.preventDefault();
        }
        const point = event.touches?.[0] || event;
        const rect = this.elements.spaceEditor.getBoundingClientRect();
        this.spaceEditorDragState = {
            offsetX: point.clientX - rect.left,
            offsetY: point.clientY - rect.top
        };
        document.addEventListener('mousemove', this.handleSpaceEditorDragMove);
        document.addEventListener('mouseup', this.handleSpaceEditorDragEnd);
        document.addEventListener('touchmove', this.handleSpaceEditorDragMove, { passive: false });
        document.addEventListener('touchend', this.handleSpaceEditorDragEnd);
    };

    handleSpaceEditorDragMove = (event) => {
        if (!this.spaceEditorDragState || !this.elements.spaceEditor) return;
        event.preventDefault();
        const point = event.touches?.[0] || event;
        const modal = this.elements.spaceEditor;
        const padding = 12;
        const width = modal.offsetWidth || 0;
        const height = modal.offsetHeight || 0;
        const maxLeft = Math.max(padding, window.innerWidth - width - padding);
        const maxTop = Math.max(padding, window.innerHeight - height - padding);
        const rawLeft = point.clientX - this.spaceEditorDragState.offsetX;
        const rawTop = point.clientY - this.spaceEditorDragState.offsetY;
        const left = Math.min(Math.max(padding, rawLeft), maxLeft);
        const top = Math.min(Math.max(padding, rawTop), maxTop);
        modal.style.left = `${left}px`;
        modal.style.top = `${top}px`;
        modal.style.right = 'auto';
        modal.style.bottom = 'auto';
    };

    handleSpaceEditorDragEnd = () => {
        this.spaceEditorDragState = null;
        document.removeEventListener('mousemove', this.handleSpaceEditorDragMove);
        document.removeEventListener('mouseup', this.handleSpaceEditorDragEnd);
        document.removeEventListener('touchmove', this.handleSpaceEditorDragMove);
        document.removeEventListener('touchend', this.handleSpaceEditorDragEnd);
        this.clampSpaceEditorPosition();
    };

    clampSpaceEditorPosition() {
        if (!this.elements.spaceEditor || this.elements.spaceEditor.style.display === 'none') return;
        const modal = this.elements.spaceEditor;
        const rect = modal.getBoundingClientRect();
        const padding = 12;
        const maxLeft = Math.max(padding, window.innerWidth - rect.width - padding);
        const maxTop = Math.max(padding, window.innerHeight - rect.height - padding);
        const left = Math.min(Math.max(padding, rect.left), maxLeft);
        const top = Math.min(Math.max(padding, rect.top), maxTop);
        modal.style.left = `${left}px`;
        modal.style.top = `${top}px`;
        modal.style.right = 'auto';
        modal.style.bottom = 'auto';
    }

    positionConnectionEditor(position) {
        if (!this.elements.connectionEditor) return;
        const modal = this.elements.connectionEditor;
        modal.style.right = 'auto';
        modal.style.bottom = 'auto';
        const padding = 16;
        requestAnimationFrame(() => {
            const rect = modal.getBoundingClientRect();
            const maxLeft = Math.max(padding, window.innerWidth - rect.width - padding);
            const maxTop = Math.max(padding, window.innerHeight - rect.height - padding);
            const left = Math.min(Math.max(padding, position.x + 12), maxLeft);
            const top = Math.min(Math.max(padding, position.y + 12), maxTop);
            modal.style.left = `${left}px`;
            modal.style.top = `${top}px`;
        });
    }

    handleConnectionEditorDragStart = (event) => {
        if (!this.elements.connectionEditor) return;
        if (this.elements.connectionEditorClose?.contains(event.target)) return;
        if (event.type === 'touchstart') {
            event.preventDefault();
        }
        const point = event.touches?.[0] || event;
        const rect = this.elements.connectionEditor.getBoundingClientRect();
        this.connectionEditorDragState = {
            offsetX: point.clientX - rect.left,
            offsetY: point.clientY - rect.top
        };
        document.addEventListener('mousemove', this.handleConnectionEditorDragMove);
        document.addEventListener('mouseup', this.handleConnectionEditorDragEnd);
        document.addEventListener('touchmove', this.handleConnectionEditorDragMove, { passive: false });
        document.addEventListener('touchend', this.handleConnectionEditorDragEnd);
    };

    handleConnectionEditorDragMove = (event) => {
        if (!this.connectionEditorDragState || !this.elements.connectionEditor) return;
        event.preventDefault();
        const point = event.touches?.[0] || event;
        const modal = this.elements.connectionEditor;
        const padding = 12;
        const width = modal.offsetWidth || 0;
        const height = modal.offsetHeight || 0;
        const maxLeft = Math.max(padding, window.innerWidth - width - padding);
        const maxTop = Math.max(padding, window.innerHeight - height - padding);
        const rawLeft = point.clientX - this.connectionEditorDragState.offsetX;
        const rawTop = point.clientY - this.connectionEditorDragState.offsetY;
        modal.style.left = `${Math.min(Math.max(padding, rawLeft), maxLeft)}px`;
        modal.style.top = `${Math.min(Math.max(padding, rawTop), maxTop)}px`;
        modal.style.right = 'auto';
        modal.style.bottom = 'auto';
    };

    handleConnectionEditorDragEnd = () => {
        this.connectionEditorDragState = null;
        document.removeEventListener('mousemove', this.handleConnectionEditorDragMove);
        document.removeEventListener('mouseup', this.handleConnectionEditorDragEnd);
        document.removeEventListener('touchmove', this.handleConnectionEditorDragMove);
        document.removeEventListener('touchend', this.handleConnectionEditorDragEnd);
        this.clampConnectionEditorPosition();
    };

    clampConnectionEditorPosition() {
        if (!this.elements.connectionEditor || this.elements.connectionEditor.style.display === 'none') return;
        const modal = this.elements.connectionEditor;
        const rect = modal.getBoundingClientRect();
        const padding = 12;
        const maxLeft = Math.max(padding, window.innerWidth - rect.width - padding);
        const maxTop = Math.max(padding, window.innerHeight - rect.height - padding);
        modal.style.left = `${Math.min(Math.max(padding, rect.left), maxLeft)}px`;
        modal.style.top = `${Math.min(Math.max(padding, rect.top), maxTop)}px`;
        modal.style.right = 'auto';
        modal.style.bottom = 'auto';
    }

    populateSpaceEditor() {
        const space = this.getSelectedSpace();
        if (!space) return;
        if (this.elements.spaceEditorTitle) {
            this.elements.spaceEditorTitle.textContent = `${space.name || 'Space'} (${space.id})`;
        }
        if (this.elements.visualSize) {
            this.elements.visualSize.value = space.visual?.size ?? '';
        }
        if (this.elements.visualColor) {
            this.elements.visualColor.value = this.normalizeColor(space.visual?.color, '#ffffff');
        }
        if (this.elements.visualTextColor) {
            this.elements.visualTextColor.value = this.normalizeColor(space.visual?.textColor, '#000000');
        }
        if (this.elements.visualFont) {
            this.elements.visualFont.value = space.visual?.font ?? '';
        }
        this.selectedVisualImagePath = space.visual?.image ?? null;
        if (this.elements.visualImageSearch) {
            this.elements.visualImageSearch.value = '';
        }
        this.renderVisualAssetOptions();
        this.populateEventSelect();
        this.renderSpaceJsonView();
    }

    populateConnectionEditor() {
        const connection = this.getSelectedConnection();
        if (!connection) return;
        const { fromId, toId, reverseExists, config } = connection;
        if (this.elements.connectionEditorTitle) {
            this.elements.connectionEditorTitle.textContent = `${fromId} ↔ ${toId}`;
        }
        if (this.elements.connectionDirection) {
            let direction = 'forward';
            if (reverseExists) {
                direction = 'bidirectional';
            } else if (String(this.selectedConnection?.fromId) === String(toId) && String(this.selectedConnection?.toId) === String(fromId)) {
                direction = 'reverse';
            }
            this.elements.connectionDirection.value = direction;
        }
        if (this.elements.connectionColor) {
            this.elements.connectionColor.value = this.normalizeColor(config?.color, '#4a90e2');
        }
        if (this.elements.connectionVisible) {
            this.elements.connectionVisible.checked = config?.draw !== false && config?.drawConnection !== false;
        }
    }

    getSelectedSpace() {
        const state = this.stateManager.state;
        if (!state?.topology?.spaces || !this.selectedSpaceId) return null;
        return state.topology.spaces.find((space) => String(space.id) === String(this.selectedSpaceId)) || null;
    }

    applyVisualEdits() {
        const space = this.getSelectedSpace();
        if (!space) return;
        const updated = {
            ...space,
            visual: {
                ...space.visual,
                size: Number(this.elements.visualSize?.value) || space.visual?.size || 50,
                color: this.elements.visualColor?.value || space.visual?.color || '#ffffff',
                textColor: this.elements.visualTextColor?.value || space.visual?.textColor || '#000000',
                font: this.elements.visualFont?.value || space.visual?.font || '12px Arial',
                image: this.selectedVisualImagePath || null
            }
        };
        this.replaceSpace(updated);
        this.setStatus('Visual updated');
    }

    populateEventSelect() {
        const select = this.elements.eventSelect;
        if (!select) return;
        select.innerHTML = '';
        const space = this.getSelectedSpace();
        const events = space?.triggers || [];
        events.forEach((event, index) => {
            const option = document.createElement('option');
            option.value = String(index);
            option.textContent = `${index + 1}: ${event?.when?.type || 'Trigger'} -> ${event?.action?.type || 'Action'}`;
            select.appendChild(option);
        });
        if (events.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No events';
            select.appendChild(option);
            this.currentEventIndex = null;
            this.clearEventEditor();
            return;
        }
        if (this.currentEventIndex === null || this.currentEventIndex >= events.length) {
            this.currentEventIndex = 0;
        }
        select.value = String(this.currentEventIndex);
        this.loadSelectedEvent();
    }

    loadSelectedEvent() {
        const space = this.getSelectedSpace();
        if (!space) return;
        const events = space.triggers || [];
        if (!events.length) {
            this.clearEventEditor();
            return;
        }
        const index = parseInt(this.elements.eventSelect?.value, 10);
        this.currentEventIndex = Number.isNaN(index) ? 0 : index;
        const event = events[this.currentEventIndex];
        if (!event) return;
        const triggerType = event.when?.type || this.availableTriggers[0] || '';
        const actionType = event.action?.type || this.availableActions[0] || '';
        if (this.elements.eventTriggerType) {
            this.elements.eventTriggerType.value = triggerType;
        }
        if (this.elements.eventActionType) {
            this.elements.eventActionType.value = actionType;
        }
        if (this.elements.eventPriority) {
            this.elements.eventPriority.value = event.priority || 'MID';
        }
        this.renderTriggerPayloadForm(triggerType, event.when?.payload || {});
        this.renderActionPayloadForm(actionType, event.action?.payload || {});
    }

    clearEventEditor() {
        if (this.elements.eventTriggerType) {
            this.elements.eventTriggerType.value = this.availableTriggers[0] || '';
        }
        if (this.elements.eventActionType) {
            this.elements.eventActionType.value = this.availableActions[0] || '';
        }
        if (this.elements.eventPriority) {
            this.elements.eventPriority.value = 'MID';
        }
        this.renderTriggerPayloadForm(this.availableTriggers[0] || '', {});
        this.renderActionPayloadForm(this.availableActions[0] || '', {});
    }

    addEvent() {
        const space = this.getSelectedSpace();
        if (!space) return;
        const triggerType = this.elements.eventTriggerType?.value || this.availableTriggers[0];
        const actionType = this.elements.eventActionType?.value || this.availableActions[0];
        if (!triggerType || !actionType) {
            this.setStatus('Add at least one trigger/action type');
            return;
        }
        const event = {
            when: { type: triggerType },
            action: { type: actionType, payload: {} },
            priority: 'MID'
        };
        const updated = {
            ...space,
            triggers: [...(space.triggers || []), event]
        };
        this.replaceSpace(updated);
        this.currentEventIndex = (updated.triggers || []).length - 1;
        this.populateEventSelect();
        this.setStatus('Event added');
    }

    removeEvent() {
        const space = this.getSelectedSpace();
        if (!space) return;
        const events = space.triggers || [];
        if (!events.length) return;
        const index = this.currentEventIndex ?? 0;
        const updatedEvents = events.filter((_, idx) => idx !== index);
        const updated = {
            ...space,
            triggers: updatedEvents
        };
        this.replaceSpace(updated);
        this.currentEventIndex = updatedEvents.length ? Math.min(index, updatedEvents.length - 1) : null;
        this.populateEventSelect();
        this.setStatus('Event removed');
    }

    applyEventEdits() {
        const space = this.getSelectedSpace();
        if (!space) return;
        const events = space.triggers || [];
        if (!events.length) {
            this.setStatus('No event selected');
            return;
        }
        const index = this.currentEventIndex ?? 0;
        const triggerType = this.elements.eventTriggerType?.value || events[index]?.when?.type;
        const actionType = this.elements.eventActionType?.value || events[index]?.action?.type;
        const triggerSchema = this.getTriggerSchema(triggerType);
        const actionSchema = this.getActionSchema(actionType);

        const triggerPayload = this.collectSchemaValue(triggerSchema, this.elements.triggerPayloadForm);
        if (triggerPayload === null) return;
        let actionPayload = null;
        if (this.schemaUsesEffectWidget(actionSchema)) {
            actionPayload = this.collectEffectPayload();
        } else {
            actionPayload = this.collectSchemaValue(actionSchema, this.elements.actionPayloadForm);
        }
        if (actionPayload === null) return;

        const updatedEvent = {
            ...events[index],
            when: {
                type: triggerType,
                payload: Object.keys(triggerPayload || {}).length ? triggerPayload : undefined
            },
            action: {
                type: actionType,
                payload: Object.keys(actionPayload || {}).length ? actionPayload : undefined
            },
            priority: this.elements.eventPriority?.value || events[index]?.priority || 'MID'
        };
        const updatedEvents = events.map((event, idx) => (idx === index ? updatedEvent : event));
        this.replaceSpace({ ...space, triggers: updatedEvents });
        this.populateEventSelect();
        this.setStatus('Event updated');
    }

    replaceSpace(updatedSpace) {
        const state = this.stateManager.state;
        if (!state?.topology?.spaces) return;
        const updatedSpaces = state.topology.spaces.map((space) => (
            String(space.id) === String(updatedSpace.id) ? updatedSpace : space
        ));
        this.updateStateSection('topology', { ...state.topology, spaces: updatedSpaces });
    }

    renderAll() {
        this.renderSectionForms();
        this.renderSpaceList();
        this.renderSpaceJsonView();
        this.renderAssets();
        this.renderCanvas();
        this.updateUndoRedoButtons();
    }

    renderSectionForms() {
        const state = this.stateManager.state;
        if (!state) return;
        this.renderSectionForm('metadata', METADATA_SCHEMA, state.metadata, this.elements.metadataForm);
        this.renderSectionForm('rules', this.getRulesSchema(), state.rules, this.elements.rulesForm);
        this.renderSectionForm('engine', this.getEngineSchema(), state.engine, this.elements.engineForm);
    }

    renderSectionForm(key, schema, value, container) {
        if (!container) return;
        const serialized = JSON.stringify(value || {});
        const schemaKey = JSON.stringify(schema || {});
        const cacheKey = `${schemaKey}::${serialized}`;
        if (this.formCache[key] === cacheKey && container.childElementCount) {
            return;
        }
        this.formCache[key] = cacheKey;
        this.renderSchemaForm(container, schema, value);
    }

    renderSpaceList() {
        const state = this.stateManager.state;
        if (!state || !this.elements.spaceList) return;
        this.elements.spaceList.innerHTML = '';
        (state.topology?.spaces || []).forEach((space) => {
            const item = document.createElement('li');
            item.className = 'map-editor-list-item';
            if (String(space.id) === String(this.selectedSpaceId)) {
                item.classList.add('selected');
            }
            item.textContent = `${space.name || 'Space'} (${space.id})`;
            item.addEventListener('click', () => this.selectSpace(space.id));
            this.elements.spaceList.appendChild(item);
        });
    }

    renderSpaceJsonView() {
        const state = this.stateManager.state;
        if (!state || !this.elements.spaceJsonView) return;
        const space = (state.topology?.spaces || []).find((s) => String(s.id) === String(this.selectedSpaceId));
        if (!space) {
            this.elements.spaceJsonView.value = '';
            return;
        }
        this.elements.spaceJsonView.value = JSON.stringify(space, null, 2);
    }

    renderAssets() {
        const state = this.stateManager.state;
        if (!state || !this.elements.assetsList) return;
        this.elements.assetsList.innerHTML = '';
        (state.assets || []).filter((asset) => !this.isBackgroundAsset(asset)).forEach((asset) => {
            const row = document.createElement('div');
            row.className = 'map-editor-list-item';
            const name = document.createElement('span');
            name.textContent = asset.name;
            const buttonRow = document.createElement('div');
            buttonRow.className = 'map-editor-row';
            const useButton = document.createElement('button');
            useButton.className = 'button button-secondary';
            useButton.textContent = 'Use on Space';
            useButton.disabled = !this.selectedSpaceId;
            useButton.addEventListener('click', (event) => {
                event.stopPropagation();
                this.applyAssetToSelectedSpace(asset.path);
            });
            const previewButton = document.createElement('button');
            previewButton.className = 'button button-secondary';
            previewButton.textContent = 'Set Preview';
            previewButton.addEventListener('click', (event) => {
                event.stopPropagation();
                this.setPreviewFromAsset(asset);
            });
            const removeButton = document.createElement('button');
            removeButton.className = 'button button-secondary';
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', (event) => {
                event.stopPropagation();
                this.removeAsset(asset.path);
            });
            buttonRow.appendChild(useButton);
            buttonRow.appendChild(previewButton);
            buttonRow.appendChild(removeButton);
            row.appendChild(name);
            row.appendChild(buttonRow);
            this.elements.assetsList.appendChild(row);
        });
        this.renderVisualAssetOptions();
        if (this.elements.previewName) {
            this.elements.previewName.textContent = state.preview?.name
                ? `Preview: ${state.preview.name}`
                : 'Preview: none';
        }
        this.renderBackgroundInfo();
    }

    renderVisualAssetOptions() {
        const state = this.stateManager.state;
        if (!state || !this.elements.visualImageSelect) return;
        const search = this.elements.visualImageSearch?.value?.toLowerCase() || '';
        const assets = (state.assets || []).filter((asset) => !this.isBackgroundAsset(asset));
        const filtered = assets.filter((asset) => {
            const name = asset.name?.toLowerCase() || '';
            const path = asset.path?.toLowerCase() || '';
            return !search || name.includes(search) || path.includes(search);
        });

        this.elements.visualImageSelect.innerHTML = '';
        if (!filtered.length) {
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = assets.length ? 'No matches' : 'No assets uploaded';
            this.elements.visualImageSelect.appendChild(emptyOption);
        } else {
            filtered.forEach((asset) => {
                const option = document.createElement('option');
                option.value = asset.path;
                option.textContent = asset.name;
                this.elements.visualImageSelect.appendChild(option);
            });
        }

        if (this.selectedVisualImagePath) {
            const matching = filtered.find((asset) => asset.path === this.selectedVisualImagePath);
            if (matching) {
                this.elements.visualImageSelect.value = this.selectedVisualImagePath;
            }
        }

        this.updateSelectedVisualImageDisplay();
    }

    renderBackgroundInfo() {
        if (!this.elements.backgroundName) return;
        const state = this.stateManager.state;
        if (!state?.background) {
            const configured = state?.metadata?.renderConfig?.backgroundImage;
            this.elements.backgroundName.textContent = configured
                ? `Background: ${configured}`
                : 'Background: none';
            return;
        }
        this.elements.backgroundName.textContent = `Background: ${state.background.name}`;
    }

    isBackgroundAsset(asset) {
        const state = this.stateManager.state;
        if (!asset) return false;
        if (state?.background?.path && asset.path === state.background.path) return true;
        return (asset.name || '').toLowerCase().startsWith(BACKGROUND_ASSET_NAME);
    }

    updateSelectedVisualImage() {
        const select = this.elements.visualImageSelect;
        if (!select) return;
        const value = select.value;
        this.selectedVisualImagePath = value || null;
        this.updateSelectedVisualImageDisplay();
    }

    clearSelectedVisualImage() {
        this.selectedVisualImagePath = null;
        if (this.elements.visualImageSelect) {
            this.elements.visualImageSelect.value = '';
        }
        this.updateSelectedVisualImageDisplay();
    }

    updateSelectedVisualImageDisplay() {
        if (!this.elements.visualImageSelected) return;
        this.elements.visualImageSelected.textContent = this.selectedVisualImagePath
            ? `Selected: ${this.selectedVisualImagePath}`
            : 'Selected: none';
    }

    renderSchemaForm(container, schema, value) {
        if (!container || !schema) return;
        const normalized = this.normalizeSchema(schema);
        container.innerHTML = '';
        const group = document.createElement('div');
        group.className = 'map-editor-form';
        group.dataset.fieldsContainer = 'true';
        if (normalized.type === 'object' && normalized.ui?.allowAdditional && !Object.keys(normalized.properties || {}).length) {
            this.renderKeyValueEditor(group, value || {});
        } else {
            this.appendSchemaFields(group, normalized.properties || {}, value || {});
        }
        if (!group.children.length) {
            const note = document.createElement('div');
            note.className = 'map-editor-form-note';
            note.textContent = 'No editable fields for this section yet.';
            group.appendChild(note);
        }
        container.appendChild(group);
    }

    appendSchemaFields(container, properties, value) {
        Object.entries(properties || {}).forEach(([key, fieldSchema]) => {
            if (key.startsWith('_')) return;
            const fieldValue = value ? value[key] : undefined;
            const field = this.createSchemaField(key, fieldSchema, fieldValue);
            if (field) {
                container.appendChild(field);
            }
        });
    }

    createSchemaField(fieldName, fieldSchema, fieldValue) {
        const schema = this.normalizeSchema(fieldSchema);
        const wrapper = document.createElement('div');
        wrapper.dataset.fieldKey = fieldName;

        if (schema.type === 'object') {
            wrapper.className = 'map-editor-form-group';
            const collapsible = schema.ui?.collapsible !== false;
            const labelText = this.formatLabel(fieldName);
            if (collapsible) {
                const details = document.createElement('details');
                details.className = 'map-editor-collapsible';
                if (schema.ui?.open || schema.ui?.collapsed === false) {
                    details.open = true;
                }
                const summary = document.createElement('summary');
                summary.textContent = labelText;
                details.appendChild(summary);
                const body = document.createElement('div');
                body.className = 'map-editor-form';
                body.dataset.fieldsContainer = 'true';
                this.populateObjectFields(body, schema, fieldValue);
                details.appendChild(body);
                wrapper.appendChild(details);
            } else {
                const label = document.createElement('label');
                label.textContent = labelText;
                wrapper.appendChild(label);
                const body = document.createElement('div');
                body.className = 'map-editor-form';
                body.dataset.fieldsContainer = 'true';
                this.populateObjectFields(body, schema, fieldValue);
                wrapper.appendChild(body);
            }
        } else if (schema.type === 'array') {
            wrapper.className = 'map-editor-field';
            const label = document.createElement('label');
            label.textContent = this.formatLabel(fieldName);
            wrapper.appendChild(label);
            if (schema.ui?.widget === 'multiselect' && Array.isArray(schema.items?.enum)) {
                const select = document.createElement('select');
                select.className = 'input map-editor-select-list';
                select.dataset.fieldInput = 'true';
                select.dataset.multiselect = 'true';
                select.multiple = true;
                const selectedValues = Array.isArray(fieldValue)
                    ? fieldValue.map((entry) => String(entry))
                    : Array.isArray(schema.default) ? schema.default.map((entry) => String(entry)) : [];
                schema.items.enum.forEach((optionValue) => {
                    const option = document.createElement('option');
                    option.value = optionValue;
                    option.textContent = schema.items.enumLabels?.[optionValue] || optionValue;
                    option.selected = selectedValues.includes(String(optionValue));
                    select.appendChild(option);
                });
                wrapper.appendChild(select);
            } else {
            const list = document.createElement('div');
            list.className = 'map-editor-form';
            list.dataset.arrayItems = 'true';
            const items = Array.isArray(fieldValue) ? fieldValue : [];
            const itemSchema = schema.items || { type: 'string' };
            items.forEach((item) => {
                list.appendChild(this.createArrayItem(itemSchema, item));
            });
            const addButton = document.createElement('button');
            addButton.type = 'button';
            addButton.className = 'button button-secondary';
            addButton.textContent = 'Add Item';
            addButton.addEventListener('click', () => {
                list.appendChild(this.createArrayItem(itemSchema, this.defaultForSchema(itemSchema)));
            });
            wrapper.appendChild(list);
            wrapper.appendChild(addButton);
            }
        } else {
            wrapper.className = 'map-editor-field';
            const label = document.createElement('label');
            label.textContent = this.formatLabel(fieldName);
            wrapper.appendChild(label);
            const input = this.createSchemaInput(schema, fieldName, fieldValue);
            if (input) {
                wrapper.appendChild(input);
            }
        }

        if (schema.description) {
            const note = document.createElement('div');
            note.className = 'map-editor-form-note';
            note.textContent = schema.description;
            wrapper.appendChild(note);
        }

        return wrapper;
    }

    populateObjectFields(container, schema, fieldValue) {
        const properties = schema.properties || {};
        if (Object.keys(properties).length) {
            this.appendSchemaFields(container, properties, fieldValue || {});
            return;
        }
        if (schema.ui?.allowAdditional) {
            this.renderKeyValueEditor(container, fieldValue || {});
            return;
        }
        const note = document.createElement('div');
        note.className = 'map-editor-form-note';
        note.textContent = 'No fields defined for this object.';
        container.appendChild(note);
    }

    createSchemaInput(schema, fieldName, fieldValue) {
        const widget = schema.ui?.widget;
        const lowerName = (fieldName || '').toLowerCase();
        const useTextarea = widget === 'textarea'
            || (schema.type === 'string' && (lowerName.includes('message') || lowerName.includes('description')));
        const input = useTextarea ? document.createElement('textarea') : document.createElement('input');
        input.dataset.fieldInput = 'true';
        input.className = useTextarea ? 'map-editor-textarea' : 'input';

        const resolvedValue = fieldValue !== undefined ? fieldValue : schema.default;

        if (schema.enum && Array.isArray(schema.enum)) {
            const select = document.createElement('select');
            select.className = 'input';
            select.dataset.fieldInput = 'true';
            schema.enum.forEach((option) => {
                const entry = document.createElement('option');
                entry.value = option;
                entry.textContent = schema.enumLabels?.[option] || option;
                select.appendChild(entry);
            });
            if (resolvedValue !== undefined) {
                select.value = String(resolvedValue);
            }
            return select;
        }

        if (useTextarea) {
            input.rows = 4;
            input.value = resolvedValue ?? '';
            return this.wrapInputWithPlaceholders(input, schema);
        }

        if (schema.type === 'number') {
            input.type = 'number';
            if (schema.min !== undefined) input.min = String(schema.min);
            if (schema.max !== undefined) input.max = String(schema.max);
            if (schema.integer) input.step = '1';
            input.value = resolvedValue ?? '';
            return input;
        }

        if (schema.type === 'boolean') {
            input.type = 'checkbox';
            input.checked = Boolean(resolvedValue);
            return input;
        }

        if (schema.ui?.widget === 'datetime') {
            input.type = 'datetime-local';
            if (resolvedValue) {
                const date = new Date(resolvedValue);
                if (!Number.isNaN(date.getTime())) {
                    input.value = date.toISOString().slice(0, 16);
                }
            }
            return input;
        }

        input.type = 'text';
        input.placeholder = schema.example ? String(schema.example) : '';
        input.value = resolvedValue ?? '';
        return this.wrapInputWithPlaceholders(input, schema);
    }

    wrapInputWithPlaceholders(input, schema) {
        if (schema.type !== 'string' || !schema.ui?.placeholders) {
            return input;
        }
        const placeholders = this.getPlaceholderOptions();
        if (!placeholders.length) {
            return input;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'map-editor-input-with-tools';
        wrapper.appendChild(input);

        const toolbar = document.createElement('div');
        toolbar.className = 'map-editor-placeholder-toolbar';

        const select = document.createElement('select');
        select.className = 'input map-editor-placeholder-select';

        const description = document.createElement('div');
        description.className = 'map-editor-form-note';

        placeholders.forEach((entry, index) => {
            const option = document.createElement('option');
            option.value = entry.type;
            option.textContent = entry.label;
            if (index === 0) {
                description.textContent = entry.description || 'Insert a placeholder tag into this field.';
            }
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            const entry = placeholders.find((item) => item.type === select.value);
            description.textContent = entry?.description || 'Insert a placeholder tag into this field.';
        });

        const insertButton = document.createElement('button');
        insertButton.type = 'button';
        insertButton.className = 'button button-secondary';
        insertButton.textContent = 'Insert Placeholder';
        insertButton.addEventListener('click', () => {
            const entry = placeholders.find((item) => item.type === select.value);
            if (!entry) return;
            this.insertTextAtCursor(input, entry.template);
        });

        toolbar.appendChild(select);
        toolbar.appendChild(insertButton);
        wrapper.appendChild(toolbar);
        wrapper.appendChild(description);
        return wrapper;
    }

    getPlaceholderOptions() {
        const metadata = this.placeholderMetadata || {};
        return Object.values(metadata)
            .map((entry) => ({
                type: entry.type,
                label: entry.displayName || entry.type,
                description: entry.description || '',
                template: entry.template || entry.example || this.buildPlaceholderTemplate(entry)
            }))
            .filter((entry) => entry.type)
            .sort((a, b) => a.label.localeCompare(b.label));
    }

    buildPlaceholderTemplate(entry) {
        const args = Array.isArray(entry.args) ? entry.args : [];
        const renderedArgs = args.map((arg) => {
            if (arg.example !== undefined) return String(arg.example);
            if (arg.default !== undefined) return String(arg.default);
            return arg.name || 'value';
        });
        const argList = renderedArgs.length ? `(${renderedArgs.join(', ')})` : '';
        return `{{${entry.type}${argList}}}`;
    }

    insertTextAtCursor(input, text) {
        const start = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
        const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : input.value.length;
        const before = input.value.slice(0, start);
        const after = input.value.slice(end);
        input.value = `${before}${text}${after}`;
        const nextPosition = start + text.length;
        if (typeof input.setSelectionRange === 'function') {
            input.setSelectionRange(nextPosition, nextPosition);
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
    }

    createArrayItem(itemSchema, itemValue) {
        const schema = this.normalizeSchema(itemSchema);
        const item = document.createElement('div');
        item.className = 'map-editor-array-item';
        item.dataset.arrayItem = 'true';
        if (schema.type === 'object') {
            this.appendSchemaFields(item, schema.properties || {}, itemValue || {});
        } else {
            const input = this.createSchemaInput(schema, '', itemValue);
            if (input) {
                item.appendChild(input);
            }
        }
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'button button-secondary';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => item.remove());
        item.appendChild(removeButton);
        return item;
    }

    renderKeyValueEditor(container, value) {
        container.dataset.keyValueRoot = 'true';
        const list = document.createElement('div');
        list.className = 'map-editor-form';
        list.dataset.keyValueList = 'true';
        const entries = Object.entries(value || {});
        entries.forEach(([key, val]) => {
            list.appendChild(this.createKeyValueRow(key, val));
        });
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'button button-secondary';
        addButton.textContent = 'Add Field';
        addButton.addEventListener('click', () => {
            list.appendChild(this.createKeyValueRow('', ''));
        });
        container.appendChild(list);
        container.appendChild(addButton);
    }

    createKeyValueRow(key, value) {
        const row = document.createElement('div');
        row.className = 'map-editor-row';
        row.dataset.keyValueRow = 'true';
        const keyInput = document.createElement('input');
        keyInput.className = 'input';
        keyInput.placeholder = 'Key';
        keyInput.dataset.keyInput = 'true';
        keyInput.value = key || '';
        const valueInput = document.createElement('input');
        valueInput.className = 'input';
        valueInput.placeholder = 'Value';
        valueInput.dataset.valueInput = 'true';
        valueInput.value = value !== undefined && value !== null ? String(value) : '';
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'button button-secondary';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => row.remove());
        row.appendChild(keyInput);
        row.appendChild(valueInput);
        row.appendChild(removeButton);
        return row;
    }

    collectSchemaValue(schema, container) {
        if (!schema || !container) return {};
        const normalized = this.normalizeSchema(schema);
        if (normalized.type === 'object') {
            const result = {};
            const fieldsRoot = container.matches?.('[data-fields-container="true"]')
                ? container
                : container.querySelector(':scope > [data-fields-container="true"], :scope > details > [data-fields-container="true"]') || container;
            const properties = normalized.properties || {};
            Object.entries(properties).forEach(([key, fieldSchema]) => {
                if (key.startsWith('_')) return;
                const fieldEl = fieldsRoot.querySelector(`:scope > [data-field-key="${key}"]`);
                if (!fieldEl) return;
                const value = this.collectSchemaValue(fieldSchema, fieldEl);
                if (value !== undefined) {
                    result[key] = value;
                }
            });
            if (normalized.ui?.allowAdditional) {
                const extra = this.collectKeyValuePairs(fieldsRoot);
                return { ...result, ...extra };
            }
            return result;
        }

        if (normalized.type === 'array') {
            const multiSelect = container.querySelector('[data-multiselect="true"]');
            if (multiSelect) {
                return Array.from(multiSelect.selectedOptions || []).map((option) => option.value);
            }
            const list = container.querySelector(':scope > [data-array-items="true"]');
            if (!list) return [];
            const itemSchema = normalized.items || { type: 'string' };
            const items = Array.from(list.querySelectorAll('[data-array-item="true"]'));
            return items.map((itemEl) => this.collectSchemaValue(itemSchema, itemEl));
        }

        const input = container.querySelector('[data-field-input="true"]');
        if (!input) return undefined;
        if (normalized.enum) {
            return input.value || undefined;
        }
        if (normalized.type === 'number') {
            const value = input.value;
            if (value === '') return undefined;
            const numberValue = Number(value);
            return Number.isNaN(numberValue) ? undefined : numberValue;
        }
        if (normalized.type === 'boolean') {
            return Boolean(input.checked);
        }
        if (normalized.ui?.widget === 'datetime') {
            if (!input.value) return undefined;
            const date = new Date(input.value);
            return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
        }
        return input.value !== '' ? input.value : undefined;
    }

    collectKeyValuePairs(container) {
        const root = container.dataset.keyValueRoot === 'true'
            ? container
            : container.querySelector(':scope > [data-key-value-root="true"]');
        if (!root) return {};
        const list = root.querySelector(':scope > [data-key-value-list="true"]');
        if (!list) return {};
        const rows = Array.from(list.querySelectorAll('[data-key-value-row="true"]'));
        const result = {};
        rows.forEach((row) => {
            const keyInput = row.querySelector('[data-key-input="true"]');
            const valueInput = row.querySelector('[data-value-input="true"]');
            if (!keyInput || !valueInput) return;
            const key = keyInput.value.trim();
            if (!key) return;
            result[key] = this.parseFreeformValue(valueInput.value);
        });
        return result;
    }

    normalizeSchema(schema) {
        if (!schema) return { type: 'object', properties: {} };
        if (schema.type || schema.properties) {
            return this.resolveRegisteredEnums(schema);
        }
        const properties = {};
        Object.entries(schema).forEach(([key, value]) => {
            if (key.startsWith('_')) return;
            properties[key] = value;
        });
        return this.resolveRegisteredEnums({ type: 'object', properties });
    }

    resolveRegisteredEnums(schema) {
        if (!schema || typeof schema !== 'object') return schema;
        const normalized = { ...schema };
        const registryFactory = normalized.ui?.registryFactory;
        if (registryFactory && !normalized.enum) {
            const factory = this.factoryManager?.getFactory?.(registryFactory);
            normalized.enum = (factory?.getRegisteredTypes?.() || []).slice().sort();
        }
        if (normalized.properties) {
            normalized.properties = Object.fromEntries(
                Object.entries(normalized.properties).map(([key, value]) => [key, this.resolveRegisteredEnums(value)])
            );
        }
        if (normalized.items) {
            normalized.items = this.resolveRegisteredEnums(normalized.items);
        }
        return normalized;
    }

    defaultForSchema(schema) {
        if (!schema) return null;
        if (schema.default !== undefined) return schema.default;
        if (schema.type === 'boolean') return false;
        if (schema.type === 'number') return 0;
        if (schema.type === 'array') return [];
        if (schema.type === 'object') return {};
        return '';
    }

    formatLabel(value) {
        return value
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\b\w/g, (match) => match.toUpperCase());
    }

    parseFreeformValue(value) {
        const trimmed = value.trim();
        if (trimmed === '') return '';
        if (trimmed === 'true') return true;
        if (trimmed === 'false') return false;
        const numberValue = Number(trimmed);
        if (!Number.isNaN(numberValue) && trimmed !== '') {
            return numberValue;
        }
        return trimmed;
    }

    normalizeColor(value, fallback) {
        if (typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
            return value;
        }
        return fallback;
    }

    buildLabelMap(metadataByType) {
        const labels = {};
        Object.entries(metadataByType || {}).forEach(([type, metadata]) => {
            labels[type] = metadata.displayName || metadata.type || type;
        });
        return labels;
    }

    getEngineSchema(typeOverride = null) {
        const engineTypes = GameEngineFactory.getRegisteredTypes().sort();
        const selectedType = typeOverride || this.stateManager.state?.engine?.type || engineTypes[0] || 'turn-based';
        return {
            ...ENGINE_SCHEMA,
            properties: {
                ...ENGINE_SCHEMA.properties,
                type: {
                    ...ENGINE_SCHEMA.properties.type,
                    enum: engineTypes
                },
                config: {
                    ...GameEngineFactory.getEditorConfigSchema(selectedType),
                    description: 'Engine configuration'
                }
            }
        };
    }

    handleEngineFormChange(event) {
        const field = event.target?.closest?.('[data-field-key="type"]');
        if (!field || !this.elements.engineForm) return;
        const nextType = event.target.value;
        const currentValue = this.collectSchemaValue(this.getEngineSchema(), this.elements.engineForm) || {};
        const nextValue = {
            ...currentValue,
            type: nextType,
            config: {}
        };
        this.formCache.engine = null;
        this.renderSectionForm('engine', this.getEngineSchema(nextType), nextValue, this.elements.engineForm);
    }

    getRulesSchema() {
        const spaces = this.stateManager.state?.topology?.spaces || [];
        const spaceOptions = spaces.map((space) => ({
            value: String(space.id),
            label: space.name ? `${space.name} (${space.id})` : String(space.id)
        }));
        const selectedWinConditionType = this.stateManager.state?.rules?.winCondition?.type || 'REACH_SPACE';
        return GameRules.getEditorSchema({ spaceOptions, selectedWinConditionType });
    }

    handleRulesFormChange(event) {
        if (!this.elements.rulesForm) return;
        const target = event.target;
        const typeField = target?.closest?.('[data-field-key="type"]');
        const winConditionField = target?.closest?.('[data-field-key="winCondition"]');
        if (!typeField || !winConditionField) {
            return;
        }
        const nextType = target.value;
        const currentValue = this.collectSchemaValue(this.getRulesSchema(), this.elements.rulesForm) || {};
        const nextSchema = GameRules.getEditorSchema({
            spaceOptions: (this.stateManager.state?.topology?.spaces || []).map((space) => ({
                value: String(space.id),
                label: space.name ? `${space.name} (${space.id})` : String(space.id)
            })),
            selectedWinConditionType: nextType
        });
        const nextValue = {
            ...currentValue,
            winCondition: {
                ...(currentValue.winCondition || {}),
                type: nextType,
                config: {}
            }
        };
        this.formCache.rules = null;
        this.renderSectionForm('rules', nextSchema, nextValue, this.elements.rulesForm);
    }

    getTriggerSchema(triggerType) {
        return this.triggerMetadataByType?.[triggerType]?.payloadSchema || {};
    }

    getActionSchema(actionType) {
        return this.actionMetadataByType?.[actionType]?.payloadSchema || {};
    }

    getEffectSchema(effectType) {
        return this.effectMetadataByType?.[effectType]?.payloadSchema || {};
    }

    schemaUsesEffectWidget(schema) {
        const normalized = this.normalizeSchema(schema);
        if (normalized.ui?.widget === 'effect') {
            return true;
        }
        const effectField = normalized.properties?.effect;
        return effectField?.ui?.widget === 'effect';
    }

    renderPayloadForm(container, schema, payload, emptyMessage) {
        if (!container) return;
        const normalized = this.normalizeSchema(schema);
        const properties = normalized.properties || {};
        container.innerHTML = '';
        if (!Object.keys(properties).length && !normalized.ui?.allowAdditional) {
            const note = document.createElement('div');
            note.className = 'map-editor-form-note';
            note.textContent = emptyMessage || 'No payload required.';
            container.appendChild(note);
            return;
        }
        this.renderSchemaForm(container, normalized, payload);
    }

    renderTriggerPayloadForm(triggerType, payload) {
        const schema = this.getTriggerSchema(triggerType);
        this.renderPayloadForm(this.elements.triggerPayloadForm, schema, payload, 'No trigger payload required.');
    }

    renderActionPayloadForm(actionType, payload) {
        if (!this.elements.actionPayloadForm) return;
        const schema = this.getActionSchema(actionType);
        if (this.schemaUsesEffectWidget(schema)) {
            this.renderEffectPayloadForm(payload);
            return;
        }
        this.effectTypeSelect = null;
        this.effectPayloadContainer = null;
        this.effectPayloadSchema = null;
        this.renderPayloadForm(this.elements.actionPayloadForm, schema, payload, 'No action payload required.');
    }

    renderEffectPayloadForm(payload) {
        const container = this.elements.actionPayloadForm;
        if (!container) return;
        container.innerHTML = '';
        if (!this.availableEffects.length) {
            const note = document.createElement('div');
            note.className = 'map-editor-form-note';
            note.textContent = 'No effects available to configure.';
            container.appendChild(note);
            return;
        }

        const effectData = payload?.effect || {};
        const effectType = effectData.type || this.availableEffects[0];
        const effectLabels = this.buildLabelMap(this.effectMetadataByType);

        const typeField = document.createElement('div');
        typeField.className = 'map-editor-field';
        const label = document.createElement('label');
        label.textContent = 'Effect Type';
        const select = document.createElement('select');
        select.className = 'input';
        this.fillSelect(select, this.availableEffects, effectLabels);
        select.value = effectType;
        typeField.appendChild(label);
        typeField.appendChild(select);

        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'map-editor-form';

        container.appendChild(typeField);
        container.appendChild(fieldsContainer);

        this.effectTypeSelect = select;
        this.effectPayloadContainer = fieldsContainer;
        this.effectPayloadSchema = this.getEffectSchema(effectType);

        const initialPayload = this.buildEffectPayloadFromArgs(effectData, this.effectPayloadSchema);
        this.renderSchemaForm(fieldsContainer, this.effectPayloadSchema, initialPayload);

        select.addEventListener('change', () => {
            const nextType = select.value;
            this.effectPayloadSchema = this.getEffectSchema(nextType);
            this.renderSchemaForm(fieldsContainer, this.effectPayloadSchema, {});
        });
    }

    collectEffectPayload() {
        const effectType = this.effectTypeSelect?.value || this.availableEffects[0];
        if (!effectType) return {};
        const schema = this.effectPayloadSchema || this.getEffectSchema(effectType);
        const payload = this.collectSchemaValue(schema, this.effectPayloadContainer);
        const args = this.buildEffectArgs(schema, payload);
        return {
            effect: {
                type: effectType,
                args
            }
        };
    }

    buildEffectPayloadFromArgs(effectData, schema) {
        const normalized = this.normalizeSchema(schema);
        const keys = Object.keys(normalized.properties || {});
        const args = effectData?.args;
        if (!Array.isArray(args) || !args.length) {
            return {};
        }
        if (typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
            return args.reduce((acc, entry) => ({ ...acc, ...entry }), {});
        }
        const payload = {};
        keys.forEach((key, index) => {
            payload[key] = args[index];
        });
        return payload;
    }

    buildEffectArgs(schema, payload) {
        const normalized = this.normalizeSchema(schema);
        const keys = Object.keys(normalized.properties || {});
        return keys.map((key) => {
            const fieldSchema = normalized.properties[key];
            const value = payload && payload[key] !== undefined ? payload[key] : this.defaultForSchema(fieldSchema);
            return { [key]: value };
        });
    }


    renderCanvas() {
        const state = this.stateManager.state;
        if (!state || !this.renderer) return;
        const assetsByPath = this.buildAssetMap();
        const backgroundUrl = state.background?.dataUrl
            || assetsByPath[state.metadata?.renderConfig?.backgroundImage]
            || null;
        this.renderer.render(state.topology, assetsByPath, this.selectedSpaceId, {
            backgroundUrl,
            gridEnabled: this.gridEnabled,
            gridSize: this.gridSize,
            snapEnabled: this.snapToGridEnabled,
            showHiddenConnections: this.showHiddenConnections,
            drawConnectionMode: this.drawConnectionMode,
            selectedConnection: this.selectedConnection
        });
    }

    createConnection(fromId, toId) {
        const state = this.stateManager.state;
        const spaces = state?.topology?.spaces || [];
        if (!spaces.length || !fromId || !toId || String(fromId) === String(toId)) {
            return;
        }
        const fromSpace = spaces.find((space) => String(space.id) === String(fromId));
        if (!fromSpace) return;
        const alreadyExists = (fromSpace.connections || []).some((connection) => String(connection.targetId) === String(toId));
        if (alreadyExists) {
            this.setStatus('Connection already exists');
            return;
        }
        const updatedSpaces = spaces.map((space) => {
            if (String(space.id) !== String(fromId)) return space;
            return {
                ...space,
                connections: [
                    ...(space.connections || []),
                    {
                        targetId: toId,
                        draw: true
                    }
                ]
            };
        });
        this.updateStateSection('topology', {
            ...state.topology,
            spaces: updatedSpaces
        });
        this.selectedConnection = { fromId: String(fromId), toId: String(toId) };
        this.renderCanvas();
        this.setStatus(`Connected ${fromId} → ${toId}`);
    }

    getSelectedConnection() {
        const selected = this.selectedConnection;
        const spaces = this.stateManager.state?.topology?.spaces || [];
        if (!selected) return null;
        const fromSpace = spaces.find((space) => String(space.id) === String(selected.fromId));
        if (!fromSpace) return null;
        const config = (fromSpace.connections || []).find((connection) => String(connection.targetId) === String(selected.toId));
        if (!config) return null;
        return {
            fromId: String(selected.fromId),
            toId: String(selected.toId),
            reverseExists: this.connectionExists(selected.toId, selected.fromId),
            config
        };
    }

    connectionExists(fromId, toId) {
        const spaces = this.stateManager.state?.topology?.spaces || [];
        const fromSpace = spaces.find((space) => String(space.id) === String(fromId));
        return Boolean((fromSpace?.connections || []).some((connection) => String(connection.targetId) === String(toId)));
    }

    updateConnectionSettings(fromId, toId, updates = {}) {
        const state = this.stateManager.state;
        const spaces = state?.topology?.spaces || [];
        const updatedSpaces = spaces.map((space) => {
            if (String(space.id) !== String(fromId)) return space;
            return {
                ...space,
                connections: (space.connections || []).map((connection) => (
                    String(connection.targetId) === String(toId)
                        ? { ...connection, ...updates }
                        : connection
                ))
            };
        });
        this.updateStateSection('topology', { ...state.topology, spaces: updatedSpaces });
        this.selectedConnection = { fromId: String(fromId), toId: String(toId) };
        this.renderCanvas();
    }

    setBidirectionalConnection(fromId, toId, enabled) {
        if (enabled) {
            this.createConnection(toId, fromId);
            this.selectedConnection = { fromId: String(fromId), toId: String(toId) };
            return;
        }
        this.removeConnection(toId, fromId, { preserveSelection: true, silent: true });
        this.selectedConnection = { fromId: String(fromId), toId: String(toId) };
        this.renderCanvas();
    }

    removeConnection(fromId, toId, { preserveSelection = false, silent = false } = {}) {
        const state = this.stateManager.state;
        const spaces = state?.topology?.spaces || [];
        const updatedSpaces = spaces.map((space) => {
            if (String(space.id) !== String(fromId)) return space;
            return {
                ...space,
                connections: (space.connections || []).filter((connection) => String(connection.targetId) !== String(toId))
            };
        });
        this.updateStateSection('topology', { ...state.topology, spaces: updatedSpaces });
        if (!preserveSelection) {
            this.selectedConnection = null;
        }
        this.renderCanvas();
        if (!silent) {
            this.setStatus(`Removed connection ${fromId} → ${toId}`);
        }
    }

    applyConnectionEdits() {
        const selected = this.getSelectedConnection();
        if (!selected) return;
        const { fromId, toId } = selected;
        const direction = this.elements.connectionDirection?.value || 'forward';
        const color = this.elements.connectionColor?.value || '#4a90e2';
        const draw = Boolean(this.elements.connectionVisible?.checked);

        this.updateConnectionSettings(fromId, toId, { color, draw });

        if (direction === 'forward') {
            this.removeConnection(toId, fromId, { preserveSelection: true, silent: true });
            this.selectedConnection = { fromId: String(fromId), toId: String(toId) };
        } else if (direction === 'reverse') {
            if (!this.connectionExists(toId, fromId)) {
                this.createConnection(toId, fromId);
            }
            this.updateConnectionSettings(toId, fromId, { color, draw });
            this.removeConnection(fromId, toId, { preserveSelection: true, silent: true });
            this.selectedConnection = { fromId: String(toId), toId: String(fromId) };
        } else if (direction === 'bidirectional') {
            if (!this.connectionExists(toId, fromId)) {
                this.createConnection(toId, fromId);
            }
            this.updateConnectionSettings(toId, fromId, { color, draw });
            this.selectedConnection = { fromId: String(fromId), toId: String(toId) };
        }

        this.populateConnectionEditor();
        this.renderCanvas();
        this.setStatus('Connection updated');
    }

    removeSelectedConnection() {
        const selected = this.getSelectedConnection();
        if (!selected) return;
        this.removeConnection(selected.fromId, selected.toId);
        this.closeConnectionEditor();
    }

    handleWindowKeyDown = (event) => {
        const tagName = event.target?.tagName;
        const isEditable = event.target?.isContentEditable
            || tagName === 'INPUT'
            || tagName === 'TEXTAREA'
            || tagName === 'SELECT';
        if (isEditable) return;

        if (event.key === 'Delete' && this.selectedSpaceId) {
            event.preventDefault();
            this.deleteSelectedSpace();
        }
    };

    handleWindowKeyUp = () => {};

    updateUndoRedoButtons() {
        if (this.elements.undoButton) {
            this.elements.undoButton.disabled = !this.stateManager.canUndo();
        }
        if (this.elements.redoButton) {
            this.elements.redoButton.disabled = !this.stateManager.canRedo();
        }
    }

    async exportBundle() {
        const state = this.stateManager.state;
        if (!state) return;
        try {
            this.flushSectionForms();
            const latestState = this.stateManager.state;
            const zip = new JSZip();
            const assetsRoot = latestState.manifest?.assetsRoot || this.assetsRootFallback;
            const metadata = {
                ...(latestState.metadata || {})
            };
            if (latestState.background?.path) {
                metadata.renderConfig = {
                    ...(metadata.renderConfig || {}),
                    backgroundImage: latestState.background.path
                };
            }
            const manifest = {
                schema_version: 2,
                id: latestState.manifest?.id || latestState.metadata?.id || 'custom-map',
                assetsRoot,
                paths: {
                    metadata: 'metadata.json',
                    engine: 'engine.json',
                    rules: 'rules.json',
                    ui: 'ui.json',
                    topology: 'topology.json',
                    dependencies: 'dependencies.json'
                }
            };

            zip.file('board.json', JSON.stringify(manifest, null, 2));
            zip.file('metadata.json', JSON.stringify(metadata, null, 2));
            zip.file('engine.json', JSON.stringify(latestState.engine || {}, null, 2));
            zip.file('rules.json', JSON.stringify(latestState.rules || {}, null, 2));
            zip.file('ui.json', JSON.stringify(latestState.ui || {}, null, 2));
            zip.file('topology.json', JSON.stringify(latestState.topology || {}, null, 2));
            zip.file('dependencies.json', JSON.stringify(latestState.dependencies || { plugins: [] }, null, 2));

            (latestState.assets || []).forEach((asset) => {
                const path = asset.path || `${assetsRoot}${asset.name}`;
                const base64 = asset.dataUrl?.split(',')[1];
                if (!base64) return;
                zip.file(path, base64, { base64: true });
            });

            if (latestState.background?.dataUrl) {
                const base64 = latestState.background.dataUrl.split(',')[1];
                if (base64) {
                    zip.file(latestState.background.path, base64, { base64: true });
                }
            }

            if (latestState.preview?.dataUrl) {
                const base64 = latestState.preview.dataUrl.split(',')[1];
                if (base64) {
                    zip.file('preview.png', base64, { base64: true });
                }
            }

            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${manifest.id}.zip`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            this.setStatus('Bundle exported');
        } catch (error) {
            console.error('[MapEditor] Export failed', error);
            this.setStatus('Export failed');
        }
    }

    flushSectionForms() {
        Object.keys(this.sectionAutoSaveTimers || {}).forEach((section) => {
            const timer = this.sectionAutoSaveTimers[section];
            if (timer) {
                clearTimeout(timer);
                this.sectionAutoSaveTimers[section] = null;
            }
        });
        this.applyFormSection('metadata');
        this.applyFormSection('rules');
        this.applyFormSection('engine');
    }

    setTextareaValue(textarea, value) {
        if (!textarea) return;
        if (document.activeElement === textarea) return;
        textarea.value = JSON.stringify(value || {}, null, 2);
    }

    setStatus(message) {
        if (!this.elements.status) return;
        this.elements.status.textContent = message;
    }

    safeJsonParse(text) {
        try {
            return JSON.parse(text);
        } catch (error) {
            this.setStatus('Invalid JSON');
            return null;
        }
    }

    generateSpaceId(spaces) {
        const numericIds = spaces
            .map((space) => parseInt(space.id, 10))
            .filter((value) => !Number.isNaN(value));
        if (numericIds.length) {
            return String(Math.max(...numericIds) + 1);
        }
        return `space-${Date.now()}`;
    }

    async fetchJson(path) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${path}`);
        }
        return response.json();
    }

    async fetchDataUrl(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) return null;
            const blob = await response.blob();
            return await this.blobToDataUrl(blob);
        } catch (_) {
            return null;
        }
    }

    blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}
