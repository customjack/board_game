import JSZip from 'jszip';
import MapEditorStateManager from './MapEditorStateManager.js';
import MapEditorBundleLoader from './MapEditorBundleLoader.js';
import MapEditorRenderer from './MapEditorRenderer.js';
import GameEngineFactory from '../infrastructure/factories/GameEngineFactory.js';

const METADATA_SCHEMA = {
    type: 'object',
    properties: {
        name: { type: 'string', required: true, description: 'Display name for the board' },
        author: { type: 'string', description: 'Creator or studio name' },
        version: { type: 'string', description: 'Semantic version, e.g. 1.0.0' },
        description: { type: 'string', description: 'Short description', ui: { widget: 'textarea' } },
        tags: { type: 'array', description: 'Searchable tags', items: { type: 'string' } },
        created: { type: 'string', description: 'ISO date string', ui: { widget: 'datetime' } },
        modified: { type: 'string', description: 'ISO date string', ui: { widget: 'datetime' } }
    }
};

const RULES_SCHEMA = {
    type: 'object',
    properties: {
        turnOrder: {
            type: 'string',
            enum: ['sequential', 'random', 'custom'],
            description: 'How turns are ordered'
        },
        startingPositions: {
            type: 'object',
            description: 'Where players begin',
            properties: {
                mode: {
                    type: 'string',
                    enum: ['single', 'spread', 'random', 'custom', 'multiple'],
                    description: 'How starting spaces are selected'
                },
                spaceIds: {
                    type: 'array',
                    description: 'Space IDs used for starting positions',
                    items: { type: 'string' }
                }
            }
        },
        recommendedPlayers: {
            type: 'object',
            description: 'Suggested player range',
            properties: {
                min: { type: 'number', description: 'Recommended minimum players' },
                max: { type: 'number', description: 'Recommended maximum players' }
            }
        },
        diceRolling: {
            type: 'object',
            description: 'Dice rolling behavior',
            properties: {
                enabled: { type: 'boolean', description: 'Allow dice rolling' },
                diceCount: { type: 'number', description: 'Number of dice', min: 1, integer: true },
                diceSides: { type: 'number', description: 'Sides per die', min: 2, integer: true },
                rollAgainOn: {
                    type: 'array',
                    description: 'Roll again when landing on these values',
                    items: { type: 'number', integer: true }
                }
            }
        },
        winCondition: {
            type: 'object',
            description: 'Victory configuration',
            properties: {
                type: { type: 'string', description: 'Win condition type' },
                config: { type: 'object', description: 'Win condition config', ui: { allowAdditional: true } }
            }
        },
        minPlayers: { type: 'number', description: 'Minimum players' },
        maxPlayers: { type: 'number', description: 'Maximum players' }
    }
};

const ENGINE_SCHEMA = {
    type: 'object',
    properties: {
        type: { type: 'string', description: 'Engine type', enum: [] },
        config: { type: 'object', description: 'Engine configuration', ui: { allowAdditional: true } }
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
        this.currentEventIndex = null;
        this.availableActions = [];
        this.availableTriggers = [];
        this.availableEffects = [];
        this.actionMetadataByType = {};
        this.triggerMetadataByType = {};
        this.effectMetadataByType = {};
        this.missingDependencies = [];
        this.assetsRootFallback = 'assets/';
        this.selectedVisualImagePath = null;
        this.effectPayloadSchema = null;
        this.effectPayloadContainer = null;
        this.effectTypeSelect = null;
        this.formCache = {};
    }

    async init() {
        this.cacheElements();
        this.bindEvents();
        this.renderer = new MapEditorRenderer({
            container: this.elements.canvas,
            onSelectSpace: (spaceId) => this.selectSpace(spaceId),
            onMoveSpace: (spaceId, position) => this.updateSpacePosition(spaceId, position),
            onContextSpace: (spaceId, position) => this.openSpaceEditor(spaceId, position)
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
        const buttons = Array.from(tabBar.querySelectorAll('.map-editor-tab-button'));
        buttons.forEach((btn) => {
            btn.addEventListener('click', () => this.activateTab(tabBar, btn.dataset.tab));
        });
        this.activateTab(tabBar, defaultTab || buttons[0]?.dataset.tab);
    }

    activateTab(tabBar, tabName) {
        if (!tabBar) return;
        const buttons = Array.from(tabBar.querySelectorAll('.map-editor-tab-button'));
        buttons.forEach((btn) => {
            const isActive = btn.dataset.tab === tabName;
            btn.classList.toggle('active', isActive);
        });
        const container = tabBar.parentElement;
        if (!container) return;
        const panels = Array.from(container.querySelectorAll('.map-editor-tab-content'));
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
            configTabs: document.getElementById('mapEditorConfigTabs'),
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
            spaceEditor: document.getElementById('mapEditorSpaceEditor'),
            spaceEditorTitle: document.getElementById('mapEditorSpaceTitle'),
            spaceEditorClose: document.getElementById('mapEditorSpaceClose'),
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
        if (this.elements.rulesApply) {
            this.elements.rulesApply.addEventListener('click', () => this.applyFormSection('rules'));
        }
        if (this.elements.engineApply) {
            this.elements.engineApply.addEventListener('click', () => this.applyFormSection('engine'));
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
        this.setupTabs(this.elements.configTabs, 'metadata');
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
                preview: preview ? { name: 'preview.png', path: 'preview.png', dataUrl: preview } : null
            };

            this.setState(state, { pushHistory: false });
            this.selectedSpaceId = topology?.spaces?.[0]?.id || null;
        } catch (error) {
            console.error('[MapEditor] Failed to load default template', error);
        }
    }

    buildStateFromBundle(bundle) {
        return {
            manifest: bundle.manifest,
            metadata: bundle.files.metadata,
            engine: bundle.files.engine,
            rules: bundle.files.rules,
            ui: bundle.files.ui,
            topology: bundle.files.topology,
            dependencies: bundle.files.dependencies || { plugins: [] },
            assets: bundle.assets || [],
            preview: bundle.preview || null
        };
    }

    setState(state, { pushHistory = true } = {}) {
        const normalized = {
            ...state,
            dependencies: state.dependencies || { plugins: [] },
            assets: state.assets || []
        };
        this.stateManager.setState(normalized, { pushHistory });
        this.updateDependenciesFromUsage();
        this.renderAll();
    }

    updateStateSection(key, value) {
        this.stateManager.updateSection(key, value);
        this.updateDependenciesFromUsage();
        this.renderAll();
    }

    selectSpace(spaceId) {
        this.selectedSpaceId = spaceId;
        this.renderSpaceList();
        this.renderSpaceJsonView();
        if (this.elements.spaceEditor?.style.display === 'block') {
            this.populateSpaceEditor();
        }
    }

    updateSpacePosition(spaceId, position) {
        const state = this.stateManager.state;
        if (!state?.topology?.spaces) return;
        const updatedSpaces = state.topology.spaces.map((space) => {
            if (space.id !== spaceId) return space;
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
        const remaining = state.topology.spaces.filter((space) => space.id !== this.selectedSpaceId);
        const cleaned = remaining.map((space) => ({
            ...space,
            connections: (space.connections || []).filter((conn) => conn.targetId !== this.selectedSpaceId)
        }));
        this.updateStateSection('topology', { ...state.topology, spaces: cleaned });
        this.selectedSpaceId = cleaned[0]?.id || null;
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
            rules: RULES_SCHEMA,
            engine: this.getEngineSchema()
        };
        const container = formMap[section];
        const schema = schemaMap[section];
        if (!container || !schema) return;
        const parsed = this.collectSchemaValue(schema, container);
        if (!parsed) return;
        this.updateStateSection(section, parsed);
        this.setStatus(`${section} updated`);
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

    applyAssetToSelectedSpace(assetPath) {
        const state = this.stateManager.state;
        if (!state?.topology?.spaces || !this.selectedSpaceId) return;
        const updatedSpaces = state.topology.spaces.map((space) => {
            if (space.id !== this.selectedSpaceId) return space;
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
        this.elements.spaceEditor.style.display = 'block';
        this.activateTab(this.elements.spaceTabs, 'visual');
        this.populateSpaceEditor();

        if (position) {
            this.positionSpaceEditor(position);
        }
    }

    closeSpaceEditor() {
        if (this.elements.spaceEditor) {
            this.elements.spaceEditor.style.display = 'none';
        }
    }

    clearSelection() {
        this.selectedSpaceId = null;
        this.currentEventIndex = null;
        this.closeSpaceEditor();
        this.renderSpaceList();
        this.renderSpaceJsonView();
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

    getSelectedSpace() {
        const state = this.stateManager.state;
        if (!state?.topology?.spaces || !this.selectedSpaceId) return null;
        return state.topology.spaces.find((space) => space.id === this.selectedSpaceId) || null;
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
        if (actionType === 'APPLY_EFFECT') {
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
            space.id === updatedSpace.id ? updatedSpace : space
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
        this.renderSectionForm('rules', RULES_SCHEMA, state.rules, this.elements.rulesForm);
        this.renderSectionForm('engine', this.getEngineSchema(), state.engine, this.elements.engineForm);
    }

    renderSectionForm(key, schema, value, container) {
        if (!container) return;
        const serialized = JSON.stringify(value || {});
        if (this.formCache[key] === serialized && container.childElementCount) {
            return;
        }
        this.formCache[key] = serialized;
        this.renderSchemaForm(container, schema, value);
    }

    renderSpaceList() {
        const state = this.stateManager.state;
        if (!state || !this.elements.spaceList) return;
        this.elements.spaceList.innerHTML = '';
        (state.topology?.spaces || []).forEach((space) => {
            const item = document.createElement('li');
            item.className = 'map-editor-list-item';
            if (space.id === this.selectedSpaceId) {
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
        const space = (state.topology?.spaces || []).find((s) => s.id === this.selectedSpaceId);
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
        (state.assets || []).forEach((asset) => {
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
    }

    renderVisualAssetOptions() {
        const state = this.stateManager.state;
        if (!state || !this.elements.visualImageSelect) return;
        const search = this.elements.visualImageSearch?.value?.toLowerCase() || '';
        const assets = state.assets || [];
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
        wrapper.className = schema.type === 'object' ? 'map-editor-form-group' : 'map-editor-field';
        wrapper.dataset.fieldKey = fieldName;

        const label = document.createElement('label');
        label.textContent = this.formatLabel(fieldName);
        wrapper.appendChild(label);

        if (schema.type === 'object') {
            const body = document.createElement('div');
            body.className = 'map-editor-form';
            const properties = schema.properties || {};
            if (Object.keys(properties).length) {
                this.appendSchemaFields(body, properties, fieldValue || {});
            } else if (schema.ui?.allowAdditional) {
                this.renderKeyValueEditor(body, fieldValue || {});
            } else {
                const note = document.createElement('div');
                note.className = 'map-editor-form-note';
                note.textContent = 'No fields defined for this object.';
                body.appendChild(note);
            }
            wrapper.appendChild(body);
        } else if (schema.type === 'array') {
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
        } else {
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
                entry.textContent = option;
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
            return input;
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
        return input;
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
            const properties = normalized.properties || {};
            Object.entries(properties).forEach(([key, fieldSchema]) => {
                if (key.startsWith('_')) return;
                const fieldEl = container.querySelector(`:scope > [data-field-key="${key}"]`);
                if (!fieldEl) return;
                const value = this.collectSchemaValue(fieldSchema, fieldEl);
                if (value !== undefined) {
                    result[key] = value;
                }
            });
            if (normalized.ui?.allowAdditional) {
                const extra = this.collectKeyValuePairs(container);
                return { ...result, ...extra };
            }
            return result;
        }

        if (normalized.type === 'array') {
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
            return schema;
        }
        const properties = {};
        Object.entries(schema).forEach(([key, value]) => {
            if (key.startsWith('_')) return;
            properties[key] = value;
        });
        return { type: 'object', properties };
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

    getEngineSchema() {
        const engineTypes = GameEngineFactory.getRegisteredTypes().sort();
        return {
            ...ENGINE_SCHEMA,
            properties: {
                ...ENGINE_SCHEMA.properties,
                type: {
                    ...ENGINE_SCHEMA.properties.type,
                    enum: engineTypes
                }
            }
        };
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
        if (actionType === 'APPLY_EFFECT') {
            this.renderEffectPayloadForm(payload);
            return;
        }
        this.effectTypeSelect = null;
        this.effectPayloadContainer = null;
        this.effectPayloadSchema = null;
        const schema = this.getActionSchema(actionType);
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
        this.renderer.render(state.topology, assetsByPath, this.selectedSpaceId);
    }

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
            const zip = new JSZip();
            const assetsRoot = state.manifest?.assetsRoot || this.assetsRootFallback;
            const manifest = {
                schema_version: 2,
                id: state.manifest?.id || state.metadata?.id || 'custom-map',
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
            zip.file('metadata.json', JSON.stringify(state.metadata || {}, null, 2));
            zip.file('engine.json', JSON.stringify(state.engine || {}, null, 2));
            zip.file('rules.json', JSON.stringify(state.rules || {}, null, 2));
            zip.file('ui.json', JSON.stringify(state.ui || {}, null, 2));
            zip.file('topology.json', JSON.stringify(state.topology || {}, null, 2));
            zip.file('dependencies.json', JSON.stringify(state.dependencies || { plugins: [] }, null, 2));

            (state.assets || []).forEach((asset) => {
                const path = asset.path || `${assetsRoot}${asset.name}`;
                const base64 = asset.dataUrl?.split(',')[1];
                if (!base64) return;
                zip.file(path, base64, { base64: true });
            });

            if (state.preview?.dataUrl) {
                const base64 = state.preview.dataUrl.split(',')[1];
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
