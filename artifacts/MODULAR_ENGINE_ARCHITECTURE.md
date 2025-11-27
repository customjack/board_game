# Modular Game Engine Architecture

## Overview

This document describes the new modular game engine architecture that decouples game logic from UI, enabling:
- Multiple game engine types (turn-based, real-time, multi-piece, etc.)
- Headless engine operation (for AI, simulations, server-side)
- Plugin-based UI components
- CDN-loadable game engines and components
- Visual game creator/editor

## Architecture Layers

```
┌─────────────────────────────────────────────────────┐
│                  GAME LAYER                         │
│  (Board JSON + Engine Config + Plugin Requirements) │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│                 PLUGIN LAYER                        │
│    (Modular components loaded dynamically)          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Engine   │  │   UI     │  │  Rules   │         │
│  │ Plugin   │  │ Plugin   │  │  Plugin  │         │
│  └──────────┘  └──────────┘  └──────────┘         │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│                  CORE LAYER                         │
│   (Event bus, registries, factories, networking)    │
└─────────────────────────────────────────────────────┘
```

## Core Abstractions

### IGameEngine

The game engine interface that all engines must implement:

```javascript
interface IGameEngine {
    // Lifecycle
    init(gameState, config): void
    start(): void
    pause(): void
    resume(): void
    stop(): void
    cleanup(): void

    // State management
    updateGameState(gameState): void
    getEngineState(): EngineState

    // Player actions
    onPlayerAction(playerId, actionType, actionData): Promise<Result>

    // UI requirements
    getRequiredUIComponents(): UIComponentSpec[]
    getOptionalUIComponents(): UIComponentSpec[]
    registerUIComponents(uiRegistry): void

    // Metadata
    getEngineType(): string
    getCapabilities(): EngineCapabilities
    canRunHeadless(): boolean
}
```

### EngineCapabilities

Describes what an engine can do:

```javascript
{
    supportsDiceRoll: boolean,
    supportsCardDraw: boolean,
    supportsPieceSelection: boolean,
    supportsMultiplePiecesPerPlayer: boolean,
    supportsResourceManagement: boolean,
    supportsSimultaneousTurns: boolean,
    supportsTurnPhases: boolean,
    supportsPlayerVoting: boolean,
    supportsRealTime: boolean,
    supportsTeams: boolean
}
```

### UIComponentSpec

Declarative UI component specification:

```javascript
{
    id: 'roll-button',              // Unique identifier
    type: 'button',                  // Component type
    required: true,                  // Is this required?
    config: {                        // Component-specific config
        position: 'bottom-center',
        label: 'Roll Dice',
        icon: 'dice'
    },
    events: {
        emits: ['rollDice'],         // Events emitted
        listens: ['turnStarted']     // Events listened to
    }
}
```

### UIComponentRegistry

Manages UI component registration and instantiation:

```javascript
class UIComponentRegistry {
    registerComponentClass(id, ComponentClass, metadata)
    createComponent(spec, context): Component
    getOrCreateComponent(id, context): Component
    destroyInstance(instanceId)
    searchComponents(criteria): Component[]
}
```

## BaseGameEngine Refactoring

The `BaseGameEngine` now:
- ✅ Implements `IGameEngine` interface
- ✅ Has optional UI dependencies (can run headless)
- ✅ Manages UI components through registry
- ✅ Provides helper methods for UI interaction
- ✅ Can detect and report headless mode

Key changes:

```javascript
class BaseGameEngine extends IGameEngine {
    constructor(dependencies, config) {
        // UI registry is now optional
        this.uiRegistry = dependencies.uiRegistry || null;
        this.uiComponents = new Map();

        // Can detect headless mode
        if (!this.uiRegistry) {
            console.log('Running in headless mode');
        }
    }

    // UI components are created from specs
    registerUIComponents(uiRegistry) {
        const specs = this.getRequiredUIComponents();
        specs.forEach(spec => {
            const component = uiRegistry.createComponent(spec, context);
            this.uiComponents.set(spec.id, component);
        });
    }

    // Safe UI access
    getUIComponent(id) {
        return this.uiComponents.get(id) || null;
    }

    isHeadless() {
        return this.uiRegistry === null;
    }
}
```

## Enhanced Board JSON Format (v3.0)

Boards now include engine configuration:

```json
{
    "version": "3.0.0",
    "type": "game",

    "metadata": {
        "name": "My Game",
        "author": "...",
        "description": "...",
        "tags": ["party", "strategy"]
    },

    "requirements": {
        "plugins": [
            {
                "id": "core-turn-based-engine",
                "version": "^1.0.0",
                "source": "builtin"
            },
            {
                "id": "dice-mechanics",
                "version": "^2.1.0",
                "source": "https://cdn.example.com/plugins/dice@2.1.0.js"
            }
        ],
        "minPlayers": 2,
        "maxPlayers": 8
    },

    "engine": {
        "type": "turn-based",
        "config": {
            "phaseStateMachine": "default",
            "turnManager": "default",
            "turnTimer": true
        }
    },

    "ui": {
        "layout": "standard-board",
        "components": [
            {
                "id": "roll-button",
                "enabled": true,
                "position": { "bottom": 20, "centerX": true },
                "config": { "animation": "dice-roll" }
            }
        ],
        "theme": {
            "primaryColor": "#4CAF50",
            "backgroundColor": "#FFF"
        }
    },

    "rules": {
        "startingPositions": { "mode": "spread" },
        "winCondition": { "type": "reach-end" }
    },

    "board": {
        "topology": {
            "spaces": [...],
            "connections": [...]
        }
    }
}
```

## Implementation Status

### ✅ Completed
1. **IGameEngine interface** - Full interface with capabilities, UI specs, etc.
2. **EngineCapabilities typedef** - Comprehensive capability descriptor
3. **UIComponentSpec typedef** - Declarative UI component specification
4. **UIComponentRegistry** - Full implementation with lifecycle management
5. **BaseGameEngine refactor** - Now extends IGameEngine, UI-optional
6. **Headless mode support** - Engines can run without UI
7. **TurnBasedGameEngine refactor** - Fully adapted to new architecture
8. **Board JSON v3.0 format** - Enhanced format with engine config
9. **MultiPieceGameEngine** - Example engine demonstrating different game type

### 📋 Next Steps
10. **Additional example engines**:
   - ResourceManagementEngine (Monopoly-style)
   - SimultaneousTurnEngine (Diplomacy-style)
   - RealTimeEngine (Action game style)
11. **Update board loader** - Parse and handle v3.0 format
12. **Update DefaultCorePlugin** - Register UI components with registry
13. **Plugin loader system** - CDN loading with dynamic imports
14. **Game creator tool** - Visual editor for games
15. **Plugin marketplace** - Discovery and distribution

## Benefits

### For Developers
- **Modularity**: Engines, UI, and rules are completely separate
- **Testability**: Engines can run headless for unit tests
- **Extensibility**: New engines/components via plugins
- **Type Safety**: Clear interfaces and contracts

### For Game Creators
- **Flexibility**: Mix and match engines, UI, themes
- **Discoverability**: Browse available plugins and components
- **Visual Tools**: Game creator with drag-and-drop
- **Validation**: Real-time validation of game configurations

### For Players
- **Variety**: More game types possible
- **Customization**: Choose UI themes and layouts
- **Performance**: Engines optimized for their specific type
- **Accessibility**: UI can be swapped for accessibility needs

## Example: Creating a New Engine

We've implemented a `MultiPieceGameEngine` to demonstrate how different game types work with the new architecture. Here's a simplified view:

```javascript
class MultiPieceGameEngine extends BaseGameEngine {
    constructor(dependencies, config = {}) {
        super(dependencies, config);
        this.piecesPerPlayer = config.piecesPerPlayer || 4;
        this.allowCapture = config.allowCapture !== false;
        this.selectedPieceId = null;
    }

    getEngineType() {
        return 'multi-piece';
    }

    getCapabilities() {
        return {
            supportsDiceRoll: true,
            supportsPieceSelection: true,           // ← Different from turn-based!
            supportsMultiplePiecesPerPlayer: true,  // ← Different from turn-based!
            supportsTurnPhases: true,
            supportsCardDraw: false,
            supportsResourceManagement: false,
            supportsSimultaneousTurns: false,
            supportsPlayerVoting: false,
            supportsRealTime: false,
            supportsTeams: false
        };
    }

    getRequiredUIComponents() {
        return [
            {
                id: 'pieceSelector',               // ← Unique to this engine type!
                type: 'selector',
                required: true,
                description: 'Selector for choosing which piece to move',
                config: { maxPieces: 4 },
                events: {
                    emits: ['pieceSelected', 'pieceDeselected'],
                    listens: ['turnStarted', 'turnEnded', 'piecesMoved']
                }
            },
            {
                id: 'boardInteraction',             // ← Multi-piece specific config
                type: 'board',
                required: true,
                config: {
                    showMultiplePieces: true,
                    highlightMovablePieces: true
                }
            },
            {
                id: 'rollButton',
                type: 'button',
                required: false
            }
        ];
    }

    async onPlayerAction(playerId, actionType, actionData) {
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.playerId !== playerId) {
            return { success: false, error: 'Not your turn' };
        }

        switch (actionType) {
            case 'SELECT_PIECE':                    // ← Different actions!
                return this.handleSelectPiece(playerId, actionData);
            case 'ROLL_DICE':
                return this.handleRollDice(playerId);
            case 'MOVE_PIECE':                      // ← Different from SELECT_SPACE!
                return this.handleMovePiece(playerId, actionData);
            case 'END_TURN':
                return this.handleEndTurn(playerId);
            default:
                return { success: false, error: 'Unknown action' };
        }
    }

    // Engine-specific methods
    handleCaptures(piece, spaceId) {
        if (this.safeSpaces.has(spaceId)) return;

        const otherPieces = this.findPiecesOnSpace(spaceId)
            .filter(p => p.playerId !== piece.playerId);

        otherPieces.forEach(capturedPiece => {
            capturedPiece.currentSpaceId = capturedPiece.startSpaceId;
            this.emitEvent('pieceCaptured', {
                capturingPieceId: piece.id,
                capturedPieceId: capturedPiece.id,
                spaceId
            });
        });
    }
}
```

**Key Differences from TurnBasedGameEngine:**
- Requires `pieceSelector` UI component (turn-based doesn't need this)
- Handles `SELECT_PIECE` and `MOVE_PIECE` actions (vs. just `SELECT_SPACE`)
- Has capture mechanics for piece interactions
- Manages multiple pieces per player
- Different capability flags

**Board JSON Configuration:**
```json
{
  "engine": {
    "type": "multi-piece",
    "config": {
      "piecesPerPlayer": 4,
      "allowCapture": true,
      "safeSpaces": ["1", "5", "9"]
    }
  },
  "ui": {
    "components": [
      {
        "id": "pieceSelector",
        "enabled": true,
        "config": {
          "maxPieces": 4,
          "showPieceColors": true
        }
      }
    ]
  }
}
```

See [MultiPieceGameEngine.js](../src/js/engines/MultiPieceGameEngine.js) and [example-multi-piece-game.json](../src/assets/maps/examples/example-multi-piece-game.json) for full implementation.

## Migration Guide

### From Old Architecture

**Old (tightly coupled to UI):**
```javascript
class OldEngine {
    constructor(deps) {
        this.rollButton = deps.rollButtonManager; // Required!
        this.timer = deps.timerManager;           // Required!
    }

    activateRollButton() {
        this.rollButton.activate(); // Breaks if no UI
    }
}
```

**New (UI-optional):**
```javascript
class NewEngine extends BaseGameEngine {
    activateRollButton() {
        const rollButton = this.getUIComponent('roll-button');
        if (rollButton && rollButton.activate) {
            rollButton.activate();
        }
        // Still works in headless mode!
    }
}
```

### For Plugin Authors

1. Define your engine class extending `BaseGameEngine`
2. Implement required interface methods
3. Specify UI component requirements
4. Handle headless mode gracefully
5. Publish to CDN with manifest

## Future Enhancements

- **Visual debugging**: Real-time engine state visualization
- **AI integration**: Headless mode perfect for AI training
- **Server-side games**: Run engines server-side for validation
- **Hot reloading**: Swap engines/UI without page reload
- **Performance profiling**: Built-in metrics for each engine
- **A/B testing**: Run multiple engine configs simultaneously
