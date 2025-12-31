#!/usr/bin/env node

/**
 * Build bundled map ZIPs for plugin-provided boards.
 *
 * Reads the new modular map directories (board.json + component JSON files)
 * and zips them into dist/maps for CDN hosting.
 */

const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');

const ROOT = path.join(__dirname, '..');

const examplePkg = readJson(path.join(ROOT, 'plugins', 'example', 'package.json'));
const troublePkg = readJson(path.join(ROOT, 'plugins', 'trouble', 'package.json'));

// Allow overriding CDN base for local dev (e.g., http://localhost:8080)
const LOCAL_CDN_BASE = process.env.LOCAL_CDN_BASE || null;

const MAP_TARGETS = [
    {
        name: 'example-demo',
        dir: path.join(ROOT, 'plugins', 'example', 'maps', 'demo-board'),
        output: 'demo-board.zip',
        version: examplePkg.version,
        dependencyOverrides: [
            {
                pluginId: 'example-everything-plugin',
                versionFrom: (version) => `^${version}`,
                cdnFrom: (version) => LOCAL_CDN_BASE
                    ? `${LOCAL_CDN_BASE}/plugins/example-plugin.js`
                    : `https://cdn.jsdelivr.net/gh/customjack/board_game_plugin_example@v${version}/dist/plugins/example-plugin.js`
            }
        ]
    },
    {
        name: 'trouble-classic',
        dir: path.join(ROOT, 'plugins', 'trouble', 'maps', 'trouble-classic'),
        output: 'trouble-classic.zip',
        version: troublePkg.version,
        dependencyOverrides: [
            {
                pluginId: 'trouble-plugin',
                versionFrom: (version) => `^${version}`,
                cdnFrom: (version) => LOCAL_CDN_BASE
                    ? `${LOCAL_CDN_BASE}/plugins/trouble-plugin.js`
                    : `https://cdn.jsdelivr.net/gh/customjack/board_game_plugin_trouble@v${version}/dist/plugins/trouble-plugin.js`
            }
        ]
    }
];

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function ensureDir(dirPath) {
    await fs.promises.mkdir(dirPath, { recursive: true });
}

async function collectFiles(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await collectFiles(fullPath));
        } else {
            files.push(fullPath);
        }
    }
    return files;
}

function applyDependencyOverrides(deps, targetVersion, overrides = []) {
    return deps.map(dep => {
        const match = overrides.find(o => o.pluginId === dep.id);
        if (!match) return dep;
        const versionToUse = targetVersion || dep.version;
        return {
            ...dep,
            version: match.versionFrom ? match.versionFrom(versionToUse) : dep.version,
            ...(match.cdnFrom ? { cdn: match.cdnFrom(versionToUse) } : {})
        };
    });
}

async function addAssets(zip, baseDir, assetsRoot) {
    const assetsDir = path.join(baseDir, assetsRoot);
    if (!fs.existsSync(assetsDir)) return;

    const files = await collectFiles(assetsDir);
    for (const filePath of files) {
        const relPath = path.relative(baseDir, filePath).split(path.sep).join('/');
        const data = await fs.promises.readFile(filePath);
        zip.file(relPath, data);
    }
}

async function bundleFromDirectory(target) {
    const manifestPath = path.join(target.dir, 'board.json');
    const manifest = readJson(manifestPath);
    const paths = manifest.paths || {};

    const metadata = readJson(path.join(target.dir, paths.metadata));
    const engine = readJson(path.join(target.dir, paths.engine));
    const rules = readJson(path.join(target.dir, paths.rules));
    const ui = readJson(path.join(target.dir, paths.ui));
    const topology = readJson(path.join(target.dir, paths.topology));

    const depsPath = paths.dependencies ? path.join(target.dir, paths.dependencies) : null;
    const dependencies = depsPath && fs.existsSync(depsPath) ? readJson(depsPath) : { plugins: [] };

    const settingsPath = paths.settings ? path.join(target.dir, paths.settings) : null;
    const settings = settingsPath && fs.existsSync(settingsPath) ? readJson(settingsPath) : null;

    const updatedManifest = {
        ...manifest,
        id: manifest.id || metadata.id || target.name,
        paths: { ...paths }
    };

    if (settings && !updatedManifest.paths.settings) {
        updatedManifest.paths.settings = 'settings.json';
    } else if (!settings) {
        delete updatedManifest.paths.settings;
    }

    const updatedMetadata = {
        ...metadata,
        version: target.version || metadata.version,
        id: metadata.id || updatedManifest.id
    };

    const updatedDependencies = {
        ...dependencies,
        plugins: applyDependencyOverrides(dependencies.plugins || [], target.version, target.dependencyOverrides)
    };

    const zip = new JSZip();
    zip.file('board.json', JSON.stringify(updatedManifest, null, 2));
    zip.file(updatedManifest.paths.metadata, JSON.stringify(updatedMetadata, null, 2));
    zip.file(updatedManifest.paths.engine, JSON.stringify(engine, null, 2));
    zip.file(updatedManifest.paths.rules, JSON.stringify(rules, null, 2));
    zip.file(updatedManifest.paths.ui, JSON.stringify(ui, null, 2));
    zip.file(updatedManifest.paths.topology, JSON.stringify(topology, null, 2));

    if (updatedManifest.paths.dependencies) {
        zip.file(updatedManifest.paths.dependencies, JSON.stringify(updatedDependencies, null, 2));
    }

    if (settings && updatedManifest.paths.settings) {
        zip.file(updatedManifest.paths.settings, JSON.stringify(settings, null, 2));
    }

    const previewPath = path.join(target.dir, 'preview.png');
    if (fs.existsSync(previewPath)) {
        const data = await fs.promises.readFile(previewPath);
        zip.file('preview.png', data);
    }

    await addAssets(zip, target.dir, updatedManifest.assetsRoot || 'assets/');

    return zip.generateAsync({ type: 'nodebuffer' });
}

async function buildMaps() {
    const distDir = path.join(ROOT, 'dist', 'maps');
    await ensureDir(distDir);

    for (const target of MAP_TARGETS) {
        try {
            const buffer = await bundleFromDirectory(target);
            const outPath = path.join(distDir, target.output);
            await fs.promises.writeFile(outPath, buffer);
            console.log(`[build-plugin-maps] Wrote ${outPath} (${buffer.length} bytes)`);
        } catch (err) {
            console.error(`[build-plugin-maps] Failed to build ${target.name}:`, err);
        }
    }
}

buildMaps();
