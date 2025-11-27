# Board Schema Documentation

This document describes the JSON schema for creating custom board games. With this schema, you can define entirely new board games without writing code.

## Table of Contents
- [Overview](#overview)
- [Schema Structure](#schema-structure)
- [Metadata](#metadata)
- [Game Engine Configuration](#game-engine-configuration)
- [Render Configuration](#render-configuration)
- [Spaces](#spaces)
- [Connections](#connections)
- [Events](#events)
- [Actions](#actions)
- [Triggers](#triggers)
- [Examples](#examples)

## Overview

A board game is defined by a JSON file with the following top-level structure:

```json
{
  "metadata": { /* Board metadata */ },
  "spaces": [ /* Array of space definitions */ ]
}
```

## Schema Structure

### Complete Example

```json
{
  "metadata": {
    "name": "My Custom Board Game",
    "author": "John Doe",
    "description": "A fun drinking board game",
    "createdDate": "2025-01-27T00:00:00.000Z",
    "gameEngine": {
      "type": "turn-based",
      "config": {
        "turnManager": {
          "skipInactivePlayers": true,
          "maxTurns": 0
        },
        "eventProcessor": {
          "autoSort": true,
          "maxEventsPerTurn": 100
        },
        "uiController": {
          "autoHideModals": true,
          "modalDuration": 3000
        }
      }
    },
    "renderConfig": {
      "connectionColor": "#FF5733",
      "connectionThickness": 3,
      "arrowColor": "#FF5733",
      "arrowSize": 12
    }
  },
  "spaces": [
    {
      "id": "start",
      "name": "Start",
      "visualDetails": {
        "x": 100,
        "y": 100,
        "size": 50,
        "color": "#00FF00"
      },
      "connections": [
        {
          "targetId": "space1",
          "bidirectional": false
        }
      ],
      "events": [
        {
          "trigger": {
            "type": "ON_LAND",
            "data": {}
          },
          "action": {
            "type": "PROMPT",
            "payload": {
              "message": "Welcome to the game!"
            }
          },
          "priority": "HIGH"
        }
      ]
    }
  ]
}
```

## Metadata

The `metadata` object describes the board and its configuration.

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | No | "Default Board" | Display name of the board |
| `author` | string | No | "Unknown" | Creator of the board |
| `description` | string | No | "" | Brief description of the board |
| `createdDate` | string (ISO 8601) | No | Current date | When the board was created |
| `gameEngine` | object | No | See below | Game engine configuration |
| `renderConfig` | object | No | {} | Board rendering overrides |

### Example

```json
{
  "metadata": {
    "name": "College Party Board",
    "author": "PartyMaster",
    "description": "A wild ride through college adventures",
    "createdDate": "2025-01-27T00:00:00.000Z"
  }
}
```

## Game Engine Configuration

The `gameEngine` object within metadata specifies which game engine to use and how to configure it.

### Structure

```json
{
  "gameEngine": {
    "type": "turn-based",
    "config": {
      "turnManager": { /* Turn management settings */ },
      "eventProcessor": { /* Event processing settings */ },
      "uiController": { /* UI control settings */ }
    }
  }
}
```

### Engine Types

Currently available engine types:

| Type | Description | Use Case |
|------|-------------|----------|
| `turn-based` | Players take turns sequentially | Traditional board games |

*Future engine types may include: `realtime`, `cooperative`, `competitive`, etc.*

### Turn Manager Config

Controls turn order and player management:

```json
{
  "turnManager": {
    "skipInactivePlayers": true,
    "maxTurns": 0
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `skipInactivePlayers` | boolean | true | Auto-skip disconnected/spectating players |
| `maxTurns` | number | 0 | Maximum turns before game ends (0 = unlimited) |

### Event Processor Config

Controls how game events are processed:

```json
{
  "eventProcessor": {
    "autoSort": true,
    "maxEventsPerTurn": 100,
    "trackHistory": true
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `autoSort` | boolean | true | Automatically sort events by priority |
| `maxEventsPerTurn` | number | 100 | Max events to process per turn |
| `trackHistory` | boolean | true | Track event execution history |

### UI Controller Config

Controls UI behavior:

```json
{
  "uiController": {
    "autoHideModals": true,
    "modalDuration": 3000
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `autoHideModals` | boolean | true | Auto-hide modals after interactions |
| `modalDuration` | number | 3000 | Default modal display duration (ms) |

## Render Configuration

The `renderConfig` object allows you to customize board appearance. These override the theme's default values.

### Structure

```json
{
  "renderConfig": {
    "backgroundImage": "assets/images/board-background.png",
    "backgroundColor": "#f0f0f0",
    "connectionColor": "#333333",
    "connectionThickness": 2,
    "arrowColor": "#333333",
    "arrowSize": 10,
    "arrowPositionSingle": 0.85,
    "arrowPositionBidirectional": 0.5,
    "spaceDefaults": {
      "borderColor": "transparent",
      "borderWidth": 0,
      "textColor": "#000000"
    }
  }
}
```

### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `backgroundImage` | string (URL) | null | Path to background image (scales to fit board) |
| `backgroundColor` | string (color) | Theme default | Fallback color if no image |
| `connectionColor` | string (color) | Theme default | Color of connection lines |
| `connectionThickness` | number | 2 | Thickness of connection lines (px) |
| `arrowColor` | string (color) | Theme default | Color of arrows |
| `arrowSize` | number | 10 | Size of arrow heads (px) |
| `arrowPositionSingle` | number | 0.85 | Arrow position for one-way (0-1) |
| `arrowPositionBidirectional` | number | 0.5 | Arrow position for two-way (0-1) |
| `spaceDefaults` | object | See below | Default space styling |

**Background Image Notes:**
- Image will scale to fit the board dimensions while maintaining aspect ratio
- Supports PNG, JPG, GIF formats
- Relative paths are resolved from the board JSON location
- Use transparent PNGs for custom shapes

**Note:** If not specified, render config values fall back to CSS theme variables.

## Spaces

Spaces are the nodes on the board where players can land.

### Structure

```json
{
  "id": "unique_space_id",
  "name": "Space Name",
  "visualDetails": {
    "x": 100,
    "y": 100,
    "size": 50,
    "color": "#FF0000"
  },
  "connections": [ /* Array of connections */ ],
  "events": [ /* Array of events */ ]
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the space |
| `name` | string | Yes | Display name of the space |
| `visualDetails` | object | Yes | Visual rendering information |
| `connections` | array | No | Connections to other spaces |
| `events` | array | No | Events that can trigger on this space |

### Visual Details

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `x` | number | Yes | - | X coordinate (pixels) |
| `y` | number | Yes | - | Y coordinate (pixels) |
| `size` | number | No | 40 | Size of the space (pixels) |
| `color` | string | No | "#3498db" | Background color |
| `textColor` | string | No | From theme | Text color |
| `borderColor` | string | No | From theme | Border color |
| `borderWidth` | number | No | From theme | Border width (px) |

### Example

```json
{
  "id": "tavern",
  "name": "The Tavern",
  "visualDetails": {
    "x": 250,
    "y": 150,
    "size": 60,
    "color": "#8B4513"
  },
  "connections": [
    { "targetId": "marketplace", "bidirectional": false }
  ],
  "events": [
    {
      "trigger": { "type": "ON_LAND" },
      "action": {
        "type": "PROMPT",
        "payload": { "message": "Welcome to the tavern! Take a drink." }
      },
      "priority": "MID"
    }
  ]
}
```

## Connections

Connections define how players can move between spaces.

### Structure

```json
{
  "targetId": "destination_space_id",
  "bidirectional": false
}
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `targetId` | string | Yes | - | ID of the destination space |
| `bidirectional` | boolean | No | false | Whether connection works both ways |

### Examples

**One-way connection:**
```json
{ "targetId": "nextSpace", "bidirectional": false }
```

**Two-way connection:**
```json
{ "targetId": "neighborSpace", "bidirectional": true }
```

**Multiple connections (branching paths):**
```json
[
  { "targetId": "leftPath", "bidirectional": false },
  { "targetId": "rightPath", "bidirectional": false },
  { "targetId": "centerPath", "bidirectional": false }
]
```

## Events

Events are triggered when certain conditions are met (usually landing on a space).

### Structure

```json
{
  "trigger": { /* Trigger definition */ },
  "action": { /* Action definition */ },
  "priority": "MID"
}
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `trigger` | object | Yes | - | Condition that triggers the event |
| `action` | object | Yes | - | What happens when triggered |
| `priority` | string | No | "MID" | Event priority (LOW, MID, HIGH, CRITICAL) |

### Priority Levels

Events are processed in priority order (highest first):

| Priority | Value | Use Case |
|----------|-------|----------|
| `CRITICAL` | 1000 | Game-ending events, critical state changes |
| `HIGH` | 100 | Important events that affect gameplay significantly |
| `MID` | 50 | Standard game events |
| `LOW` | 10 | Minor flavor events, notifications |

## Actions

Actions define what happens when an event is triggered.

### Available Action Types

#### PROMPT
Display a message to the player.

```json
{
  "type": "PROMPT",
  "payload": {
    "message": "You found treasure!"
  }
}
```

#### MOVE
Move the player to a specific space.

```json
{
  "type": "MOVE",
  "payload": {
    "spaceId": "jail"
  }
}
```

#### MODIFY_STAT
Change a player's stat.

```json
{
  "type": "MODIFY_STAT",
  "payload": {
    "statName": "drinks",
    "delta": 2
  }
}
```

#### ADD_EFFECT
Add a temporary or permanent effect to the player.

```json
{
  "type": "ADD_EFFECT",
  "payload": {
    "effectType": "SkipTurnEffect",
    "duration": 1,
    "data": {}
  }
}
```

#### CHOICE
Present the player with choices.

```json
{
  "type": "CHOICE",
  "payload": {
    "message": "Choose your path:",
    "choices": [
      {
        "text": "Left",
        "action": { "type": "MOVE", "payload": { "spaceId": "left" } }
      },
      {
        "text": "Right",
        "action": { "type": "MOVE", "payload": { "spaceId": "right" } }
      }
    ]
  }
}
```

#### MINI_GAME
Start a mini-game.

```json
{
  "type": "MINI_GAME",
  "payload": {
    "gameType": "RockPaperScissors",
    "config": {},
    "onWin": { "type": "MODIFY_STAT", "payload": { "statName": "score", "delta": 10 } },
    "onLose": { "type": "MODIFY_STAT", "payload": { "statName": "drinks", "delta": 1 } }
  }
}
```

#### SET_STATE
Change the player's state.

```json
{
  "type": "SET_STATE",
  "payload": {
    "state": "SPECTATING"
  }
}
```

**Available States:** `ACTIVE`, `COMPLETED_GAME`, `SKIPPING_TURN`, `SPECTATING`, `DISCONNECTED`

#### MODIFY_MOVES
Change remaining moves for the current turn.

```json
{
  "type": "MODIFY_MOVES",
  "payload": {
    "delta": -1
  }
}
```

## Triggers

Triggers define when events should fire.

### Available Trigger Types

#### ON_LAND
Trigger when a player lands on the space.

```json
{
  "type": "ON_LAND",
  "data": {}
}
```

#### ON_PASS
Trigger when a player passes through the space (without landing).

```json
{
  "type": "ON_PASS",
  "data": {}
}
```

#### ON_TURN_START
Trigger at the start of any player's turn if they're on this space.

```json
{
  "type": "ON_TURN_START",
  "data": {}
}
```

#### CONDITION
Trigger when a custom condition is met.

```json
{
  "type": "CONDITION",
  "data": {
    "condition": "player.stats.drinks > 5"
  }
}
```

#### RANDOM
Trigger randomly with a certain probability.

```json
{
  "type": "RANDOM",
  "data": {
    "probability": 0.5
  }
}
```

## Examples

### Example 1: Simple Linear Board

A basic board with 5 spaces in a line:

```json
{
  "metadata": {
    "name": "Simple Game",
    "author": "Beginner",
    "description": "A simple 5-space board"
  },
  "spaces": [
    {
      "id": "start",
      "name": "Start",
      "visualDetails": { "x": 100, "y": 300, "size": 50, "color": "#00FF00" },
      "connections": [{ "targetId": "space1", "bidirectional": false }],
      "events": []
    },
    {
      "id": "space1",
      "name": "Space 1",
      "visualDetails": { "x": 250, "y": 300, "size": 50, "color": "#3498db" },
      "connections": [{ "targetId": "space2", "bidirectional": false }],
      "events": [
        {
          "trigger": { "type": "ON_LAND" },
          "action": { "type": "PROMPT", "payload": { "message": "Welcome to Space 1!" } },
          "priority": "MID"
        }
      ]
    },
    {
      "id": "space2",
      "name": "Space 2",
      "visualDetails": { "x": 400, "y": 300, "size": 50, "color": "#e74c3c" },
      "connections": [{ "targetId": "space3", "bidirectional": false }],
      "events": [
        {
          "trigger": { "type": "ON_LAND" },
          "action": { "type": "MODIFY_STAT", "payload": { "statName": "drinks", "delta": 1 } },
          "priority": "MID"
        }
      ]
    },
    {
      "id": "space3",
      "name": "Space 3",
      "visualDetails": { "x": 550, "y": 300, "size": 50, "color": "#f39c12" },
      "connections": [{ "targetId": "end", "bidirectional": false }],
      "events": []
    },
    {
      "id": "end",
      "name": "Finish",
      "visualDetails": { "x": 700, "y": 300, "size": 50, "color": "#2ecc71" },
      "connections": [],
      "events": [
        {
          "trigger": { "type": "ON_LAND" },
          "action": { "type": "SET_STATE", "payload": { "state": "COMPLETED_GAME" } },
          "priority": "CRITICAL"
        }
      ]
    }
  ]
}
```

### Example 2: Branching Paths

A board with choices:

```json
{
  "metadata": {
    "name": "Choose Your Adventure",
    "author": "GameMaster"
  },
  "spaces": [
    {
      "id": "start",
      "name": "Crossroads",
      "visualDetails": { "x": 400, "y": 300, "size": 50, "color": "#95a5a6" },
      "connections": [
        { "targetId": "leftPath", "bidirectional": false },
        { "targetId": "rightPath", "bidirectional": false }
      ],
      "events": [
        {
          "trigger": { "type": "ON_LAND" },
          "action": {
            "type": "PROMPT",
            "payload": { "message": "Choose your path wisely!" }
          },
          "priority": "MID"
        }
      ]
    },
    {
      "id": "leftPath",
      "name": "Dark Forest",
      "visualDetails": { "x": 250, "y": 200, "size": 50, "color": "#2c3e50" },
      "connections": [{ "targetId": "end", "bidirectional": false }],
      "events": [
        {
          "trigger": { "type": "ON_LAND" },
          "action": {
            "type": "MODIFY_STAT",
            "payload": { "statName": "drinks", "delta": 3 }
          },
          "priority": "HIGH"
        }
      ]
    },
    {
      "id": "rightPath",
      "name": "Sunny Meadow",
      "visualDetails": { "x": 550, "y": 200, "size": 50, "color": "#f1c40f" },
      "connections": [{ "targetId": "end", "bidirectional": false }],
      "events": [
        {
          "trigger": { "type": "ON_LAND" },
          "action": {
            "type": "MODIFY_STAT",
            "payload": { "statName": "drinks", "delta": 1 }
          },
          "priority": "MID"
        }
      ]
    },
    {
      "id": "end",
      "name": "Finish",
      "visualDetails": { "x": 400, "y": 100, "size": 50, "color": "#2ecc71" },
      "connections": [],
      "events": [
        {
          "trigger": { "type": "ON_LAND" },
          "action": { "type": "SET_STATE", "payload": { "state": "COMPLETED_GAME" } },
          "priority": "CRITICAL"
        }
      ]
    }
  ]
}
```

### Example 3: Custom Engine Configuration

A board with custom engine settings:

```json
{
  "metadata": {
    "name": "Speed Game",
    "author": "FastPlayer",
    "description": "A fast-paced game with time limits",
    "gameEngine": {
      "type": "turn-based",
      "config": {
        "turnManager": {
          "skipInactivePlayers": true,
          "maxTurns": 20
        },
        "eventProcessor": {
          "autoSort": true,
          "maxEventsPerTurn": 50
        },
        "uiController": {
          "autoHideModals": true,
          "modalDuration": 2000
        }
      }
    },
    "renderConfig": {
      "connectionColor": "#e74c3c",
      "connectionThickness": 3,
      "arrowColor": "#e74c3c",
      "arrowSize": 12
    }
  },
  "spaces": [
    /* ... space definitions ... */
  ]
}
```

## Best Practices

1. **Unique IDs**: Always use unique, descriptive IDs for spaces
2. **Clear Names**: Use clear, concise names that fit in the space circles
3. **Balanced Events**: Mix different priority levels for interesting gameplay
4. **Test Paths**: Ensure all paths lead somewhere (no dead ends unless intentional)
5. **Visual Layout**: Plan your visual layout before setting coordinates
6. **Event Variety**: Use different action types to keep gameplay interesting
7. **Progressive Difficulty**: Consider making later spaces more challenging
8. **Theme Consistency**: Use consistent colors and styling
9. **Mobile Friendly**: Keep space sizes and spacing comfortable for touch screens
10. **Performance**: Avoid too many high-frequency events that could slow the game

## Validation

When creating a board, ensure:

- All `targetId` references point to existing space IDs
- Visual coordinates don't overlap (spaces should be at least 60px apart)
- At least one space exists
- All required fields are present
- Colors are valid CSS color strings
- Priority values are valid (LOW, MID, HIGH, CRITICAL)
- Action and trigger types are supported

## Future Enhancements

Planned additions to the schema:

- **Custom Effects**: Define custom effects in JSON
- **Variables**: Board-level variables for complex logic
- **Plugins**: Reference external plugins for custom behaviors
- **Animations**: Specify custom animations for events
- **Sound Effects**: Add audio cues to events
- **Multiplayer Modes**: Team-based and competitive modes
- **Dynamic Boards**: Boards that change based on gameplay
- **Achievements**: Define achievements within the board
- **Localization**: Multi-language support

## Schema Version

Current schema version: **1.0.0**

When making breaking changes to the schema, the version will be incremented and documented here.
