# Modular Board Bundle Format - Implementation Summary

## Overview

This implementation adds support for a modular, multi-file board bundle format stored in ZIP files. Instead of a single monolithic JSON file, board data is now split across focused JSON files (metadata, engine, rules, ui, topology, etc.) within a ZIP archive.

## Key Components

### 1. BoardBundleLoader (`src/js/systems/storage/BoardBundleLoader.js`)

The core loader class that:
- Extracts ZIP files
- Parses the `board.json` manifest
- Loads all referenced JSON files
- Processes assets and converts them to Blob URLs
- Rewrites asset paths in JSON data
- Normalizes into game definition format compatible with `Board.fromJSON()`

**Key Methods:**
- `loadBundle(zipFile)` - Main entry point for loading a bundle
- `extractPreview(zipFile)` - Extracts preview.png if available
- `normalizeBundleData()` - Converts bundle data to game definition format

### 2. MapStorageManager Updates

Added support for ZIP bundle loading:
- `addCustomMapFromBundle(zipFile)` - New method to add maps from ZIP bundles
- Existing `addCustomMap()` continues to work for JSON files
- Both formats are stored identically in localStorage

### 3. MapManagerModal Updates

Updated file upload to support both formats:
- File input now accepts both `.json` and `.zip` files
- Automatically detects ZIP files and uses bundle loader
- Falls back to JSON parsing for legacy files

### 4. Migration Tool (`scripts/migrate-board-to-bundle.js`)

Command-line tool to convert monolithic JSON files to modular format:
```bash
node scripts/migrate-board-to-bundle.js <input.json> <output-dir>
```

The tool:
- Extracts all components from monolithic JSON
- Creates separate files for each component
- Generates a `board.json` manifest
- Creates the directory structure ready for ZIP creation

## Bundle Format

A valid bundle contains:

**Required Files:**
- `board.json` - Root manifest
- `metadata.json` - Board info & tags
- `engine.json` - Engine type + config
- `rules.json` - Rule configuration
- `ui.json` - UI layout + components
- `topology.json` - Spaces + connections

**Optional Files:**
- `settings.json` - Board-specific settings
- `dependencies.json` - Plugin requirements
- `assets/` - Directory with images
- `preview.png` - Thumbnail image

## Compatibility

- **Backward Compatible**: Existing JSON board files continue to work unchanged
- **Forward Compatible**: Bundle-loaded boards work identically to JSON-loaded boards
- **No Engine Changes**: The bundle loader produces normalized game definitions that work with existing `Board.fromJSON()` method
- **Plugin Support**: Plugin-bundled maps (JS-exported) continue to work alongside ZIP bundles

## Usage

### Loading a Bundle

```javascript
import BoardBundleLoader from './systems/storage/BoardBundleLoader.js';

const zipFile = // ... File or Blob from user input
const boardData = await BoardBundleLoader.loadBundle(zipFile);
const board = Board.fromJSON(boardData, factoryManager);
```

### Uploading via UI

Users can upload ZIP bundles through the Map Manager modal:
1. Click "Upload Map" button
2. Select either a `.json` or `.zip` file
3. System automatically detects format and loads appropriately

### Migration

To convert an existing board to bundle format:

```bash
# Convert to modular format
node scripts/migrate-board-to-bundle.js src/assets/maps/defaultBoard.json dist/boards/default-board

# Create ZIP file
cd dist/boards
zip -r default-board.zip default-board/*
```

## Dependencies

- **jszip** (^3.10.1) - For ZIP file extraction (added to package.json)

## Files Created/Modified

### New Files
- `src/js/systems/storage/BoardBundleLoader.js` - Bundle loader implementation
- `scripts/migrate-board-to-bundle.js` - Migration tool
- `docs/board-bundle-spec.md` - Format specification
- `docs/IMPLEMENTATION_SUMMARY.md` - This file

### Modified Files
- `package.json` - Added jszip dependency
- `src/js/systems/storage/MapStorageManager.js` - Added bundle loading support
- `src/js/ui/modals/MapManagerModal.js` - Updated to accept ZIP files

## Testing

To test the implementation:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Migrate default board:**
   ```bash
   node scripts/migrate-board-to-bundle.js src/assets/maps/defaultBoard.json dist/boards/default-board
   ```

3. **Create ZIP bundle:**
   ```bash
   cd dist/boards
   zip -r default-board.zip default-board/*
   ```

4. **Test in application:**
   - Open the Map Manager
   - Click "Upload Map"
   - Select the created ZIP file
   - Verify the map loads correctly

## Future Enhancements

Potential improvements:
- JSON schema validation for individual component files
- Bundle builder tool (create bundles from UI)
- Asset optimization (compress images, etc.)
- Bundle versioning and migration
- CDN support for bundle hosting

## Notes

- Asset paths are converted to Blob URLs when bundles are loaded
- Preview images are extracted and stored as Blob URLs
- The bundle format is designed to be human-editable (all JSON files remain readable)
- All processing is done client-side (no server required)

