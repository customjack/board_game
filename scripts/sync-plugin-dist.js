#!/usr/bin/env node

/**
 * sync-plugin-dist.js
 *
 * Copies built plugin bundles (and their emitted assets) into the root dist/plugins
 * directory so they're served by the webpack dev server and the local CDN alike.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const outputDir = path.join(projectRoot, 'dist', 'plugins');
const pluginOutputs = [
    path.join(projectRoot, 'plugins', 'example', 'dist', 'plugins'),
    path.join(projectRoot, 'plugins', 'trouble', 'dist', 'plugins'),
];

function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.cpSync(src, dest, { recursive: true, force: true });
}

function main() {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    pluginOutputs.forEach((srcDir) => {
        const pluginName = path.basename(path.dirname(srcDir));
        copyDir(srcDir, outputDir);
        console.log(`[sync-plugin-dist] Synced ${pluginName} assets to ${outputDir}`);
    });
}

main();
