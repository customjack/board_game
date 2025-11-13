# Board JSON Format Specification v2.0

## Overview

This document specifies the standardized JSON format for board configuration files in the drinking board game. The format follows industry-standard practices from game engines and tilemap editors while maintaining backward compatibility.

## Design Principles

1. **Industry Standard**: Follows patterns from Tiled, Unity, Unreal Engine asset formats
2. **Self-Documenting**: Field names are clear and consistent
3. **Extensible**: Easy to add new properties without breaking existing boards
4. **Versioned**: Include schema version for future migrations
5. **Validated**: Can be validated against JSON Schema
6. **Minimal**: No redundant or deprecated fields

## Changes from v1.0

### Simplified Structure
- **Removed nested `metadata` wrapper** - Top-level properties are cleaner
- **Renamed `events` to `triggers`** - More semantic (triggers contain events)
- **Standardized property names** - Consistent camelCase throughout
- **Added schema version** - Enable future migrations

### Action/Effect Format
- **Simplified effect args** - From array of objects to simple object
- **Consistent payload structure** - All actions use `payload` object

## Format Specification

### Root Object

```json
{
  "$schema": "https://example.com/schemas/board-v2.json",
  "version": "2.0.0",
  "name": "Board Name",
  "author": "Creator Name",
  "description": "Board description",
  "created": "2025-01-09T00:00:00Z",
  "modified": "2025-01-09T00:00:00Z",
  "tags": ["tag1", "tag2"],

  "gameEngine": {
    "type": "turn-based",
    "config": {}
  },

  "gameRules": { ... },
  "renderConfig": { ... },
  "spaces": [ ... ]
}
```

### Field Descriptions

#### Required Fields

- **`$schema`** (string): URL to JSON Schema for validation
- **`version`** (string): Board format version (semver)
- **`name`** (string): Display name of the board
- **`spaces`** (array): Array of space objects

#### Optional Fields

- **`author`** (string): Creator's name
- **`description`** (string): Board description
- **`created`** (string): ISO 8601 timestamp of creation
- **`modified`** (string): ISO 8601 timestamp of last modification
- **`tags`** (array of strings): Categorization tags
- **`gameEngine`** (object): Game engine configuration
- **`gameRules`** (object): Game rules and constraints
- **`renderConfig`** (object): Visual rendering settings

### Game Rules

```json
{
  "gameRules": {
    "minPlayers": 2,
    "maxPlayers": 8,
    "recommendedPlayers": {
      "min": 3,
      "max": 6
    },
    "startingPositions": {
      "mode": "single",  // "single" | "spread" | "random" | "custom"
      "spaceIds": [1]
    },
    "winCondition": "reach_end",  // Optional: "reach_end" | "highest_score" | "custom"
    "turnOrder": "sequential"  // Optional: "sequential" | "random" | "score_based"
  }
}
```

### Render Config

```json
{
  "renderConfig": {
    "connectionColor": "#000000",
    "connectionThickness": 2,
    "arrowColor": "#000000",
    "arrowSize": 10,
    "backgroundColor": "#FFFFFF",
    "gridEnabled": false,
    "gridSize": 50
  }
}
```

### Space Object

```json
{
  "id": 1,
  "name": "Space Name",
  "type": "normal",  // "start" | "end" | "action" | "normal" | "special"

  "position": {
    "x": 300,
    "y": 300
  },

  "visual": {
    "size": 60,
    "color": "#ffcccc",
    "textColor": "#000000",
    "font": "12px Arial",
    "textAlign": "center",
    "textBaseline": "middle",
    "borderColor": "#000000",
    "borderWidth": 2,
    "shape": "circle"  // "circle" | "square" | "hexagon"
  },

  "connections": [
    {
      "targetId": 2,
      "condition": null,  // Optional: conditional connection
      "draw": true,
      "weight": 1  // Optional: for weighted pathfinding
    }
  ],

  "triggers": [
    {
      "when": {
        "type": "ON_ENTER",
        "payload": null
      },
      "action": {
        "type": "PROMPT_ALL_PLAYERS",
        "payload": {
          "message": "Welcome to {{SPACE_NAME}}!"
        }
      },
      "priority": "MID"
    }
  ]
}
```

### Key Changes in Space Object

1. **`position` object** instead of flat `x`, `y` - More structured
2. **`visual` object** instead of `visualDetails` - Shorter, clearer name
3. **`triggers` array** instead of `events` - More semantic
4. **`when`** instead of `trigger` in trigger objects - More readable
5. **`draw`** instead of `drawConnection` - Shorter
6. **Added `shape`** to visual - Support different space shapes

### Trigger Object

```json
{
  "when": {
    "type": "ON_ENTER|ON_LAND|ON_EXIT|CODE",
    "payload": null  // Required for CODE type
  },
  "action": {
    "type": "ACTION_TYPE",
    "payload": {
      // Action-specific payload
    }
  },
  "priority": "LOW|MID|HIGH|CRITICAL",  // Default: "MID"
  "enabled": true  // Optional: can disable without removing
}
```

### Effect Format (Simplified)

**Old Format (v1.0):**
```json
{
  "type": "APPLY_EFFECT",
  "payload": {
    "effect": {
      "type": "SkipTurnEffect",
      "args": [
        { "id": "SkipTurnEffect_1" },
        { "duration": 1 }
      ]
    }
  }
}
```

**New Format (v2.0):**
```json
{
  "type": "APPLY_EFFECT",
  "payload": {
    "effectType": "SkipTurnEffect",
    "config": {
      "id": "SkipTurnEffect_1",
      "duration": 1
    }
  }
}
```

### Complete Example

```json
{
  "$schema": "https://example.com/schemas/board-v2.json",
  "version": "2.0.0",
  "name": "Drinking Board Game",
  "author": "Jack Carlton",
  "description": "Game to drink with your friends while playing",
  "created": "2024-10-28T12:00:00Z",
  "modified": "2025-01-09T00:00:00Z",
  "tags": ["default", "party", "drinking"],

  "gameEngine": {
    "type": "turn-based",
    "config": {}
  },

  "gameRules": {
    "minPlayers": 2,
    "maxPlayers": 8,
    "recommendedPlayers": {
      "min": 3,
      "max": 6
    },
    "startingPositions": {
      "mode": "single",
      "spaceIds": [1]
    }
  },

  "renderConfig": {
    "connectionColor": "#000000",
    "arrowColor": "#000000",
    "connectionThickness": 2,
    "arrowSize": 10
  },

  "spaces": [
    {
      "id": 1,
      "name": "Start",
      "type": "start",

      "position": {
        "x": 300,
        "y": 300
      },

      "visual": {
        "size": 60,
        "color": "#ffcccc",
        "textColor": "#000000",
        "font": "12px Arial",
        "textAlign": "center",
        "textBaseline": "middle"
      },

      "connections": [
        {
          "targetId": 2,
          "draw": true
        }
      ],

      "triggers": []
    },
    {
      "id": 2,
      "name": "Take a Drink",
      "type": "action",

      "position": {
        "x": 400,
        "y": 300
      },

      "visual": {
        "size": 60,
        "color": "#ccffcc",
        "textColor": "#000000",
        "font": "12px Arial",
        "textAlign": "center",
        "textBaseline": "middle"
      },

      "connections": [
        {
          "targetId": 3,
          "draw": true
        }
      ],

      "triggers": [
        {
          "when": {
            "type": "ON_ENTER"
          },
          "action": {
            "type": "PROMPT_ALL_PLAYERS",
            "payload": {
              "message": "{{CURRENT_PLAYER_NAME}} takes a drink!"
            }
          },
          "priority": "MID"
        }
      ]
    }
  ]
}
```

## Migration Strategy

### Backward Compatibility

The `Board.fromJSON()` method should support both v1.0 and v2.0 formats:

1. Detect version from `version` field (or absence of field = v1.0)
2. If v1.0 detected, run migration transform
3. Transform v1.0 structure to v2.0 structure
4. Continue with normal parsing

### Migration Transforms

```javascript
// v1.0 → v2.0 transformations
{
  "metadata.*" → top-level properties
  "visualDetails" → "visual"
  "events" → "triggers"
  "trigger" → "when" (in trigger objects)
  "drawConnection" → "draw"
  "x, y" → "position": { "x", "y" }
  "effect.args[]" → "effect.config{}"
}
```

## Validation

JSON Schema should validate:
- Required fields present
- Field types correct
- Enum values valid (trigger types, action types, etc.)
- Space IDs are unique
- Connection targetIds reference existing spaces
- No circular dependencies in connections (optional warning)

## Benefits of v2.0 Format

1. **Cleaner Structure**: Removed unnecessary nesting
2. **More Semantic**: Field names match their purpose
3. **Easier to Read**: `when` and `action` are clearer than nested `trigger`/`action`
4. **Industry Standard**: Follows patterns from Tiled, Unity, Unreal
5. **Versioned**: Can evolve format over time
6. **Validated**: JSON Schema support
7. **Extensible**: Easy to add new fields without breaking old boards
8. **Self-Documenting**: Field names explain their purpose

## Implementation Checklist

- [ ] Update Board.fromJSON() to detect version
- [ ] Create v1 → v2 migration function
- [ ] Update all demo boards to v2.0 format
- [ ] Update BoardSchemaValidator for v2.0
- [ ] Create JSON Schema definition file
- [ ] Update documentation
- [ ] Add migration tests
