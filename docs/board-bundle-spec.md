# Board Bundle Format Specification

## Overview

The board bundle format is a modular, multi-file structure for board game definitions. Instead of a single monolithic JSON file, board data is split across focused JSON files within a ZIP archive.

## Bundle Structure

A valid board bundle is a ZIP file containing:

```
<boardName>.zip
    board.json                     ← root manifest (required)
    metadata.json                  ← board info & tags (required)
    engine.json                    ← engine type + config (required)
    rules.json                     ← rule config (required)
    ui.json                        ← UI layout + components (required)
    topology.json                  ← spaces + connections (required)
    settings.json                  ← board settings (optional)
    dependencies.json              ← plugin requirements (optional)
    assets/                         ← images directory (optional)
        *.png / *.jpg / *.svg
    preview.png                    ← thumbnail (optional)
```

## File Specifications

### board.json (Root Manifest)

The root manifest links all component files together:

```json
{
  "schema_version": 2,
  "id": "trouble-classic",
  "paths": {
    "metadata": "metadata.json",
    "engine": "engine.json",
    "rules": "rules.json",
    "ui": "ui.json",
    "topology": "topology.json",
    "settings": "settings.json",
    "dependencies": "dependencies.json"
  },
  "assetsRoot": "assets/"
}
```

**Fields:**
- `schema_version` (number, required): Must be 2 or higher
- `id` (string, required): Unique identifier for the board
- `paths` (object, required): Maps component names to file paths
  - Required: `metadata`, `engine`, `rules`, `ui`, `topology`
  - Optional: `settings`, `dependencies`
- `assetsRoot` (string, optional): Root directory for assets (default: "assets/")

### metadata.json

Board metadata and information:

```json
{
  "name": "Trouble Classic",
  "author": "Jack Carlton",
  "version": "1.0.0",
  "description": "Four-player race to your finish lane.",
  "tags": ["trouble", "race", "multi-piece"],
  "created": "2025-11-22T00:00:00Z",
  "modified": "2025-11-22T08:00:00Z"
}
```

**Fields:**
- `name` (string, required): Display name
- `author` (string, required): Author name
- `version` (string, optional): Version string
- `description` (string, optional): Description text
- `tags` (array of strings, optional): Tags for categorization
- `created` (ISO 8601 string, optional): Creation date
- `modified` (ISO 8601 string, optional): Last modification date

### engine.json

Game engine configuration:

```json
{
  "type": "trouble",
  "config": {
    "piecesPerPlayer": 4,
    "allowCapture": true,
    "trackLength": 28,
    "startOffsets": [0, 7, 14, 21],
    "finishLength": 4
  }
}
```

**Fields:**
- `type` (string, required): Engine type (e.g., "turn-based", "trouble", "multi-piece")
- `config` (object, optional): Engine-specific configuration

### dependencies.json

Plugin and player requirements:

```json
{
  "plugins": [
    { "id": "core", "version": "^1.0.0", "source": "builtin" },
    { "id": "trouble-plugin", "version": "^1.0.0", "source": "remote" }
  ],
  "minPlayers": 2,
  "maxPlayers": 4
}
```

**Fields:**
- `plugins` (array, optional): Required plugins
  - `id` (string, required): Plugin identifier
  - `version` (string, optional): Version requirement
  - `source` (string, optional): "builtin" or "remote"
- `minPlayers` (number, optional): Minimum player count
- `maxPlayers` (number, optional): Maximum player count

### ui.json

UI layout and component configuration:

```json
{
  "layout": "multi-piece-board",
  "theme": {
    "primaryColor": "#e53935",
    "secondaryColor": "#1e88e5",
    "backgroundColor": "#0f172a",
    "textColor": "#e2e8f0",
    "boardStyle": "bold"
  },
  "components": [
    {
      "id": "rollButton",
      "enabled": true,
      "position": { "bottom": 20, "centerX": true },
      "config": { "label": "Pop", "hotkey": "space" }
    }
  ]
}
```

**Fields:**
- `layout` (string, optional): Layout type (default: "standard-board")
- `theme` (object, optional): Theme colors and styles
- `components` (array, optional): UI component configurations

### rules.json

Gameplay rules and mechanics:

```json
{
  "startingPositions": {
    "mode": "custom",
    "startZones": {
      "player1": ["p0-home-0", "p0-home-1", "p0-home-2", "p0-home-3"],
      "player2": ["p1-home-0", "p1-home-1", "p1-home-2", "p1-home-3"]
    }
  },
  "diceRolling": {
    "enabled": true,
    "diceCount": 1,
    "diceSides": 6,
    "rollAgainOn": [6]
  },
  "winCondition": {
    "type": "all-pieces-home",
    "config": {
      "homeZones": {
        "player1": ["p0-f0", "p0-f1", "p0-f2", "p0-f3"]
      }
    }
  }
}
```

**Fields:**
- `turnOrder` (string, optional): Turn order type (default: "sequential")
- `startingPositions` (object, optional): Starting position configuration
- `recommendedPlayers` (object, optional): Recommended player counts
- `diceRolling` (object, optional): Dice configuration
- `winCondition` (object, optional): Victory condition

### topology.json

Board spaces, connections, and visual data:

See the detailed topology specification in the agent instructions for the full structure. Key fields:

- `board` (object): Board-level configuration
  - `pixelWidth`, `pixelHeight` (numbers): Board dimensions
  - `background` (string): Background image path
  - `grid` (object, optional): Grid configuration
- `spaces` (array, required): Array of space definitions
  - Each space has: `id`, `type`, `position`, `visual`, `connections`, `triggers`

### settings.json

Board-specific runtime settings:

```json
{
  "showConnections": true,
  "gridSize": 40,
  "spaceBorderWidth": 2,
  "spaceBorderColor": "#000000"
}
```

These settings are board-specific and may vary per board. They are passed to the engine for interpretation.

## Asset Handling

All assets (images, sprites, etc.) should be placed in the `assets/` directory (or the directory specified by `assetsRoot` in `board.json`).

Asset paths in JSON files (e.g., in `topology.json` or `ui.json`) should be relative to the bundle root or use the `assets/` prefix. The loader will convert these to Blob URLs when the bundle is loaded.

## Loading Process

1. Extract ZIP file
2. Parse `board.json` manifest
3. Load all referenced JSON files
4. Process assets and convert to Blob URLs
5. Rewrite asset paths in JSON data
6. Normalize into game definition format
7. Return normalized board definition compatible with `Board.fromJSON()`

## Compatibility

The bundle loader produces a normalized game definition that is compatible with the existing `Board.fromJSON()` method. This means:

- Existing JSON board files continue to work
- Bundle-loaded boards work identically to JSON-loaded boards
- No changes needed to game engine or board rendering code

## Migration

Use the migration tool to convert existing monolithic JSON files:

```bash
node scripts/migrate-board-to-bundle.js <input.json> <output-dir>
```

This will:
1. Extract all components from the monolithic JSON
2. Create separate files for each component
3. Generate a `board.json` manifest
4. Create the directory structure

Then create a ZIP file from the output directory.

