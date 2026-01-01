import JSZip from 'jszip';

export default class MapEditorBundleLoader {
    static async loadBundle(zipFile) {
        if (!zipFile) {
            throw new Error('Bundle file is required.');
        }

        const zip = await JSZip.loadAsync(zipFile);
        const manifest = await this.readJson(zip, 'board.json');

        if (!manifest?.paths) {
            throw new Error('Invalid bundle manifest: missing paths.');
        }

        const assetsRoot = manifest.assetsRoot || 'assets/';
        const files = {
            metadata: await this.readJson(zip, manifest.paths.metadata),
            engine: await this.readJson(zip, manifest.paths.engine),
            rules: await this.readJson(zip, manifest.paths.rules),
            ui: await this.readJson(zip, manifest.paths.ui),
            topology: await this.readJson(zip, manifest.paths.topology)
        };

        if (manifest.paths.dependencies && zip.file(manifest.paths.dependencies)) {
            files.dependencies = await this.readJson(zip, manifest.paths.dependencies);
        } else {
            files.dependencies = { plugins: [] };
        }

        const assets = await this.readAssets(zip, assetsRoot);
        const preview = await this.readPreview(zip);

        return {
            manifest,
            assetsRoot,
            files,
            assets,
            preview
        };
    }

    static async readJson(zip, path) {
        if (!path) {
            throw new Error('Missing bundle path.');
        }
        const file = zip.file(path);
        if (!file) {
            throw new Error(`Missing bundle file: ${path}`);
        }
        const text = await file.async('string');
        return JSON.parse(text);
    }

    static async readAssets(zip, assetsRoot) {
        const assets = [];
        const assetFiles = Object.keys(zip.files).filter((path) => {
            if (path.endsWith('/')) return false;
            if (!path.startsWith(assetsRoot)) return false;
            return /\.(png|jpe?g|gif|svg|webp)$/i.test(path);
        });

        for (const path of assetFiles) {
            const file = zip.file(path);
            if (!file) continue;
            const base64 = await file.async('base64');
            const contentType = this.getContentType(path);
            const dataUrl = `data:${contentType};base64,${base64}`;
            assets.push({
                id: path,
                name: path.split('/').pop(),
                path,
                dataUrl,
                contentType
            });
        }

        return assets;
    }

    static async readPreview(zip) {
        const previewFile = zip.file('preview.png');
        if (!previewFile) return null;
        const base64 = await previewFile.async('base64');
        return {
            path: 'preview.png',
            name: 'preview.png',
            dataUrl: `data:image/png;base64,${base64}`
        };
    }

    static getContentType(path) {
        const lower = path.toLowerCase();
        if (lower.endsWith('.png')) return 'image/png';
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
        if (lower.endsWith('.gif')) return 'image/gif';
        if (lower.endsWith('.svg')) return 'image/svg+xml';
        if (lower.endsWith('.webp')) return 'image/webp';
        return 'application/octet-stream';
    }
}
