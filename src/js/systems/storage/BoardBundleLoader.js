/**
 * BoardBundleLoader - Loads modular board bundles from ZIP files
 * 
 * Supports the new modular board bundle format where board data is split
 * across multiple JSON files within a ZIP archive:
 * - board.json (root manifest)
 * - metadata.json
 * - engine.json
 * - rules.json
 * - ui.json
 * - topology.json
 * - settings.json (optional)
 * - dependencies.json (optional)
 * - assets/ (directory with images)
 * - preview.png (optional)
 * 
 * The loader extracts the ZIP, parses all JSON files, converts asset paths
 * to Blob URLs, and produces a normalized board definition compatible with
 * the existing Board.fromJSON() method.
 */

import JSZip from 'jszip';

export default class BoardBundleLoader {
    /**
     * Load a board bundle from a ZIP file
     * @param {File|Blob} zipFile - The ZIP file containing the board bundle
     * @returns {Promise<Object>} Normalized board definition compatible with Board.fromJSON()
     */
    static async loadBundle(zipFile) {
        if (!zipFile) {
            throw new Error('ZIP file is required');
        }

        // Load ZIP file
        const zip = await JSZip.loadAsync(zipFile);
        
        // Parse board.json (root manifest)
        const boardManifest = await this.loadManifest(zip);
        
        // Load all referenced files
        const bundleData = await this.loadBundleFiles(zip, boardManifest);
        
        // Process assets and convert to Blob URLs
        const assets = await this.processAssets(zip, boardManifest, bundleData);
        
        // Rewrite asset paths to use blob URLs
        this.rewriteAssetPaths(bundleData, assets, boardManifest.assetsRoot || 'assets/');
        
        // Normalize into game definition format
        const normalized = this.normalizeBundleData(boardManifest, bundleData, assets);
        
        return normalized;
    }

    /**
     * Load and parse the board.json manifest
     * @param {JSZip} zip - The loaded ZIP archive
     * @returns {Promise<Object>} The board manifest
     */
    static async loadManifest(zip) {
        const manifestFile = zip.file('board.json');
        if (!manifestFile) {
            throw new Error('board.json not found in bundle');
        }

        const manifestText = await manifestFile.async('string');
        const manifest = JSON.parse(manifestText);

        // Validate manifest structure
        if (!manifest.schema_version || manifest.schema_version < 2) {
            throw new Error('Invalid bundle schema version. Expected schema_version >= 2');
        }

        if (!manifest.id) {
            throw new Error('board.json must contain an "id" field');
        }

        if (!manifest.paths) {
            throw new Error('board.json must contain a "paths" object');
        }

        return manifest;
    }

    /**
     * Load all referenced JSON files from the bundle
     * @param {JSZip} zip - The loaded ZIP archive
     * @param {Object} manifest - The board manifest
     * @returns {Promise<Object>} Object containing all loaded bundle data
     */
    static async loadBundleFiles(zip, manifest) {
        const bundleData = {};
        const paths = manifest.paths;

        // Required files
        const requiredFiles = ['metadata', 'engine', 'rules', 'ui', 'topology'];
        for (const key of requiredFiles) {
            const filePath = paths[key];
            if (!filePath) {
                throw new Error(`Required file "${key}" not specified in board.json paths`);
            }

            const file = zip.file(filePath);
            if (!file) {
                throw new Error(`File "${filePath}" not found in bundle`);
            }

            const text = await file.async('string');
            bundleData[key] = JSON.parse(text);
        }

        // Optional files
        if (paths.settings) {
            const file = zip.file(paths.settings);
            if (file) {
                const text = await file.async('string');
                bundleData.settings = JSON.parse(text);
            }
        }

        if (paths.dependencies) {
            const file = zip.file(paths.dependencies);
            if (file) {
                const text = await file.async('string');
                bundleData.dependencies = JSON.parse(text);
            }
        }

        return bundleData;
    }

    /**
     * Process assets from the bundle and convert to Blob URLs
     * @param {JSZip} zip - The loaded ZIP archive
     * @param {Object} manifest - The board manifest
     * @param {Object} bundleData - The loaded bundle data
     * @returns {Promise<Object>} Map of asset paths to Blob URLs
     */
    static async processAssets(zip, manifest, bundleData) {
        const assets = {};
        const assetsRoot = manifest.assetsRoot || 'assets/';

        // Find all files in the assets directory
        const assetFiles = Object.keys(zip.files).filter(path => 
            path.startsWith(assetsRoot) && 
            !path.endsWith('/') &&
            this.isImageFile(path)
        );

        // Convert each asset to a Blob URL
        for (const assetPath of assetFiles) {
            const file = zip.file(assetPath);
            if (file) {
                const blob = await file.async('blob');
                const blobUrl = URL.createObjectURL(blob);
                
                // Store multiple path variations for easy lookup
                const relativePath = assetPath.replace(assetsRoot, '');
                const filename = assetPath.split('/').pop();
                
                // Store with full path
                assets[assetPath] = blobUrl;
                // Store with relative path (no assetsRoot)
                assets[relativePath] = blobUrl;
                // Store with assets/ prefix
                assets[`assets/${relativePath}`] = blobUrl;
                // Store by filename only
                assets[filename] = blobUrl;
                // Store with assets/ and filename
                assets[`assets/${filename}`] = blobUrl;
            }
        }

        // Process preview.png if it exists
        const previewFile = zip.file('preview.png');
        if (previewFile) {
            const blob = await previewFile.async('blob');
            assets['preview.png'] = URL.createObjectURL(blob);
        }

        // Don't rewrite asset paths here - we'll do it when loading
        // This allows us to store original paths and recreate blob URLs on reload
        // this.rewriteAssetPaths(bundleData, assets, assetsRoot);

        return assets;
    }

    /**
     * Check if a file path is an image file
     * @param {string} path - File path
     * @returns {boolean} True if the file is an image
     */
    static isImageFile(path) {
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
        const lowerPath = path.toLowerCase();
        return imageExtensions.some(ext => lowerPath.endsWith(ext));
    }

    /**
     * Rewrite asset paths in bundle data to use Blob URLs
     * @param {Object} bundleData - The bundle data to modify
     * @param {Object} assets - Map of asset paths to Blob URLs
     * @param {string} assetsRoot - The assets root directory
     */
    static rewriteAssetPaths(bundleData, assets, assetsRoot) {
        const rewrite = (obj) => {
            if (obj === null || obj === undefined) {
                return obj;
            }

            if (typeof obj === 'string') {
                // Check if this string looks like an asset path
                // Try multiple path variations to find the blob URL
                if (obj.startsWith(assetsRoot) || obj.startsWith('assets/') || obj.includes('.png') || obj.includes('.jpg') || obj.includes('.svg')) {
                    // Try exact match first
                    let blobUrl = assets[obj];
                    
                    // Try without assetsRoot prefix
                    if (!blobUrl && obj.startsWith(assetsRoot)) {
                        blobUrl = assets[obj.replace(assetsRoot, '')];
                    }
                    
                    // Try with assets/ prefix
                    if (!blobUrl && !obj.startsWith('assets/')) {
                        blobUrl = assets[`assets/${obj}`];
                    }
                    
                    // Try matching by filename
                    if (!blobUrl) {
                        const filename = obj.split('/').pop();
                        blobUrl = assets[filename] || assets[`assets/${filename}`] || assets[`${assetsRoot}${filename}`];
                    }
                    
                    if (blobUrl) {
                        return blobUrl;
                    }
                }
                return obj;
            }

            if (Array.isArray(obj)) {
                return obj.map(item => rewrite(item));
            }

            if (typeof obj === 'object') {
                const result = {};
                for (const [key, value] of Object.entries(obj)) {
                    result[key] = rewrite(value);
                }
                return result;
            }

            return obj;
        };

        // Rewrite paths in topology (spaces, connections, etc.)
        // This includes space visual.image and visual.sprite.image paths
        if (bundleData.topology) {
            bundleData.topology = rewrite(bundleData.topology);
            // Also rewrite nested visual properties in spaces array
            if (bundleData.topology.spaces && Array.isArray(bundleData.topology.spaces)) {
                bundleData.topology.spaces = bundleData.topology.spaces.map(space => rewrite(space));
            }
        }

        // Rewrite paths in UI config
        if (bundleData.ui) {
            bundleData.ui = rewrite(bundleData.ui);
        }

        // Rewrite paths in settings
        if (bundleData.settings) {
            bundleData.settings = rewrite(bundleData.settings);
        }
    }

    /**
     * Normalize bundle data into the game definition format expected by Board.fromJSON()
     * @param {Object} manifest - The board manifest
     * @param {Object} bundleData - The loaded bundle data
     * @param {Object} assets - Map of asset paths to Blob URLs
     * @returns {Object} Normalized game definition
     */
    static normalizeBundleData(manifest, bundleData, assets) {
        const metadata = bundleData.metadata || {};
        const engine = bundleData.engine || {};
        const rules = bundleData.rules || {};
        const ui = bundleData.ui || {};
        const topology = bundleData.topology || {};
        const settings = bundleData.settings || {};
        const dependencies = bundleData.dependencies || {};

        // Build the normalized game definition
        const gameDefinition = {
            $schema: "https://boardgame.example.com/schemas/game-v3.json",
            version: metadata.version || "1.0.0",
            type: "game",
            metadata: {
                name: metadata.name || "Untitled Board",
                author: metadata.author || "Unknown",
                description: metadata.description || "",
                created: metadata.created || new Date().toISOString(),
                modified: metadata.modified || metadata.created || new Date().toISOString(),
                tags: metadata.tags || [],
                id: manifest.id
            },
            requirements: {
                plugins: dependencies.plugins || [],
                minPlayers: dependencies.minPlayers,
                maxPlayers: dependencies.maxPlayers
            },
            engine: {
                type: engine.type || "turn-based",
                config: engine.config || {}
            },
            ui: {
                layout: ui.layout || "standard-board",
                theme: ui.theme || {},
                components: ui.components || []
            },
            rules: {
                turnOrder: rules.turnOrder || "sequential",
                startingPositions: rules.startingPositions || {},
                recommendedPlayers: rules.recommendedPlayers || {},
                diceRolling: rules.diceRolling || {},
                winCondition: rules.winCondition || {}
            },
            board: {
                topology: {
                    spaces: topology.spaces || [], // Blob URLs should already be in these spaces from rewriteAssetPaths
                    connections: topology.connections || []
                },
                rendering: settings.renderConfig || {}
            }
        };

        // Add board-level settings if present
        if (Object.keys(settings).length > 0 && !settings.renderConfig) {
            gameDefinition.board.settings = settings;
        }

        // Store assets for later reference (e.g., for preview)
        gameDefinition._assets = assets;
        
        // Store preview URL in metadata for easy access
        if (assets['preview.png']) {
            gameDefinition.metadata.preview = assets['preview.png'];
        }

        return gameDefinition;
    }

    /**
     * Extract preview image from bundle if available
     * @param {File|Blob} zipFile - The ZIP file
     * @returns {Promise<string|null>} Blob URL of preview image or null
     */
    static async extractPreview(zipFile) {
        try {
            const zip = await JSZip.loadAsync(zipFile);
            const previewFile = zip.file('preview.png');
            if (previewFile) {
                const blob = await previewFile.async('blob');
                return URL.createObjectURL(blob);
            }
        } catch (error) {
            console.warn('[BoardBundleLoader] Failed to extract preview:', error);
        }
        return null;
    }
}

