import JSZip from 'jszip';
import MapEditorStateManager from './MapEditorStateManager.js';
import MapEditorBundleLoader from './MapEditorBundleLoader.js';
import MapEditorRenderer from './MapEditorRenderer.js';

export default class MapEditorController {
    constructor({ pageRegistry, eventBus, factoryManager, pluginManager }) {
        this.pageRegistry = pageRegistry;
        this.eventBus = eventBus;
        this.factoryManager = factoryManager;
        this.pluginManager = pluginManager;
        this.stateManager = new MapEditorStateManager();
        this.renderer = null;
        this.selectedSpaceId = null;
        this.missingDependencies = [];
        this.assetsRootFallback = 'assets/';
    }

    async init() {
        this.cacheElements();
        this.bindEvents();
        this.renderer = new MapEditorRenderer({
            container: this.elements.canvas,
            onSelectSpace: (spaceId) => this.selectSpace(spaceId),
            onMoveSpace: (spaceId, position) => this.updateSpacePosition(spaceId, position)
        });

        const draft = this.stateManager.loadDraft();
        if (draft) {
            this.setState(draft, { pushHistory: false });
            this.setStatus('Draft loaded');
        } else {
            await this.loadDefaultTemplate();
        }

        this.renderAll();
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
            metadataJson: document.getElementById('mapEditorMetadataJson'),
            metadataApply: document.getElementById('mapEditorMetadataApply'),
            rulesJson: document.getElementById('mapEditorRulesJson'),
            rulesApply: document.getElementById('mapEditorRulesApply'),
            engineJson: document.getElementById('mapEditorEngineJson'),
            engineApply: document.getElementById('mapEditorEngineApply'),
            uiJson: document.getElementById('mapEditorUiJson'),
            uiApply: document.getElementById('mapEditorUiApply'),
            dependenciesList: document.getElementById('mapEditorDependenciesList'),
            spaceList: document.getElementById('mapEditorSpaceList'),
            addSpaceButton: document.getElementById('mapEditorAddSpaceButton'),
            deleteSpaceButton: document.getElementById('mapEditorDeleteSpaceButton'),
            spaceJson: document.getElementById('mapEditorSpaceJson'),
            spaceApply: document.getElementById('mapEditorSpaceApply'),
            assetsInput: document.getElementById('mapEditorAssetsInput'),
            assetsList: document.getElementById('mapEditorAssetsList'),
            previewInput: document.getElementById('mapEditorPreviewInput'),
            previewName: document.getElementById('mapEditorPreviewName'),
            actionList: document.getElementById('mapEditorActionList'),
            triggerList: document.getElementById('mapEditorTriggerList'),
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
            this.elements.metadataApply.addEventListener('click', () => this.applyJsonSection('metadata'));
        }
        if (this.elements.rulesApply) {
            this.elements.rulesApply.addEventListener('click', () => this.applyJsonSection('rules'));
        }
        if (this.elements.engineApply) {
            this.elements.engineApply.addEventListener('click', () => this.applyJsonSection('engine'));
        }
        if (this.elements.uiApply) {
            this.elements.uiApply.addEventListener('click', () => this.applyJsonSection('ui'));
        }
        if (this.elements.addSpaceButton) {
            this.elements.addSpaceButton.addEventListener('click', () => this.addSpace());
        }
        if (this.elements.deleteSpaceButton) {
            this.elements.deleteSpaceButton.addEventListener('click', () => this.deleteSelectedSpace());
        }
        if (this.elements.spaceApply) {
            this.elements.spaceApply.addEventListener('click', () => this.applySpaceJson());
        }
        if (this.elements.assetsInput) {
            this.elements.assetsInput.addEventListener('change', (event) => this.handleAssetUpload(event));
        }
        if (this.elements.previewInput) {
            this.elements.previewInput.addEventListener('change', (event) => this.handlePreviewUpload(event));
        }
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
        this.renderSpaceJson();
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

    applySpaceJson() {
        const state = this.stateManager.state;
        if (!state?.topology?.spaces || !this.selectedSpaceId) return;
        const nextSpace = this.safeJsonParse(this.elements.spaceJson.value);
        if (!nextSpace) return;

        const existingSpace = state.topology.spaces.find((space) => space.id === this.selectedSpaceId);
        const oldId = existingSpace?.id;
        const newId = nextSpace.id || oldId;
        const updatedSpaces = state.topology.spaces.map((space) => {
            if (space.id !== oldId) return space;
            return {
                ...space,
                ...nextSpace,
                id: newId
            };
        }).map((space) => ({
            ...space,
            connections: (space.connections || []).map((conn) => ({
                ...conn,
                targetId: conn.targetId === oldId ? newId : conn.targetId
            }))
        }));

        this.selectedSpaceId = newId;
        this.updateStateSection('topology', { ...state.topology, spaces: updatedSpaces });
    }

    applyJsonSection(section) {
        const textMap = {
            metadata: this.elements.metadataJson,
            rules: this.elements.rulesJson,
            engine: this.elements.engineJson,
            ui: this.elements.uiJson
        };
        const target = textMap[section];
        if (!target) return;
        const parsed = this.safeJsonParse(target.value);
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

    renderAll() {
        this.renderJsonEditors();
        this.renderSpaceList();
        this.renderSpaceJson();
        this.renderAssets();
        this.renderDependencies();
        this.renderAvailableTypes();
        this.renderCanvas();
        this.updateUndoRedoButtons();
    }

    renderJsonEditors() {
        const state = this.stateManager.state;
        if (!state) return;
        this.setTextareaValue(this.elements.metadataJson, state.metadata);
        this.setTextareaValue(this.elements.rulesJson, state.rules);
        this.setTextareaValue(this.elements.engineJson, state.engine);
        this.setTextareaValue(this.elements.uiJson, state.ui);
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

    renderSpaceJson() {
        const state = this.stateManager.state;
        if (!state || !this.elements.spaceJson) return;
        const space = (state.topology?.spaces || []).find((s) => s.id === this.selectedSpaceId);
        if (!space) {
            if (document.activeElement !== this.elements.spaceJson) {
                this.elements.spaceJson.value = '';
            }
            return;
        }
        this.setTextareaValue(this.elements.spaceJson, space);
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
        if (this.elements.previewName) {
            this.elements.previewName.textContent = state.preview?.name
                ? `Preview: ${state.preview.name}`
                : 'Preview: none';
        }
    }

    renderDependencies() {
        const state = this.stateManager.state;
        if (!state || !this.elements.dependenciesList) return;
        this.elements.dependenciesList.innerHTML = '';
        const plugins = state.dependencies?.plugins || [];
        plugins.forEach((plugin) => {
            const row = document.createElement('div');
            row.className = 'map-editor-list-item';
            const label = document.createElement('span');
            label.textContent = `${plugin.id} ${plugin.version || ''}`.trim();
            const detail = document.createElement('span');
            detail.textContent = plugin.source || '';
            row.appendChild(label);
            row.appendChild(detail);
            this.elements.dependenciesList.appendChild(row);
        });
        if (this.missingDependencies.length) {
            const warn = document.createElement('div');
            warn.className = 'map-editor-list-item';
            warn.textContent = `Missing providers: ${this.missingDependencies.map((item) => item.type).join(', ')}`;
            this.elements.dependenciesList.appendChild(warn);
        }
    }

    renderAvailableTypes() {
        const actionFactory = this.factoryManager?.getFactory?.('ActionFactory');
        const triggerFactory = this.factoryManager?.getFactory?.('TriggerFactory');
        const actions = actionFactory?.getAllMetadata?.() || {};
        const triggers = triggerFactory?.getAllMetadata?.() || {};

        if (this.elements.actionList) {
            this.elements.actionList.innerHTML = '';
            Object.values(actions).forEach((meta) => {
                const row = document.createElement('div');
                row.className = 'map-editor-list-item';
                row.textContent = `${meta.type} - ${meta.displayName}`;
                this.elements.actionList.appendChild(row);
            });
        }

        if (this.elements.triggerList) {
            this.elements.triggerList.innerHTML = '';
            Object.values(triggers).forEach((meta) => {
                const row = document.createElement('div');
                row.className = 'map-editor-list-item';
                row.textContent = `${meta.type} - ${meta.displayName}`;
                this.elements.triggerList.appendChild(row);
            });
        }
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
