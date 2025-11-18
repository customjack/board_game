# Modular Game State Architecture

## Overview

The game now uses a modular state system where each game type can have its own GameState class. This allows different game engines to have custom state structures while maintaining a common interface.

## State Class Hierarchy

```
BaseGameState (base class)
├── TurnBasedGameState (for turn-based games)
└── TroubleGameState (for Trouble game)
```

## How It Works

### 1. GameStateFactory Registration

Each plugin registers its state class in `GameStateFactory`:

```javascript
// In TroublePlugin.initialize()
if (!GameStateFactory.isRegistered('trouble')) {
    GameStateFactory.register('trouble', TroubleGameState);
}
```

### 2. Board Configuration

Board JSON files specify which state type to use:

```json
{
  "metadata": {
    "engine": {
      "type": "trouble"
    }
  }
}
```

### 3. State Creation

When loading a board, the appropriate state class is instantiated:

```javascript
// In MapStorageManager or similar
const StateClass = GameStateFactory.get(engineType) || BaseGameState;
const gameState = new StateClass({ board, factoryManager, players, ... });
```

## Current State Classes

### BaseGameState

**Location:** `src/js/models/gameStates/BaseGameState.js`

**Purpose:** Default state for all games

**Key Features:**
- Board reference
- Player management
- Game phase tracking
- Plugin state container
- Version tracking for state synchronization
- Base `getDeltaFields()` implementation

**Used By:** Games that don't need custom state structure

---

### TurnBasedGameState

**Location:** `src/js/models/gameStates/TurnBasedGameState.js`

**Extends:** `BaseGameState`

**Purpose:** State for classic turn-based board games

**Additional Features:**
- `remainingMoves` - Tracks moves left in current turn
- `turnPhase` - Current phase of the turn (BEGIN_TURN, WAITING_FOR_MOVE, etc.)
- Turn management based on `turnsTaken` per player
- `getCurrentPlayer()` - Returns player with fewest turns taken
- `nextPlayerTurn()` - Advances to next player

**Delta Fields:**
```javascript
['stateType', 'gamePhase', 'remainingMoves', 'turnPhase']
```

**Used By:** TurnBasedGameEngine (default board game type)

---

### TroubleGameState

**Location:** `src/js/models/gameStates/TroubleGameState.js`

**Extends:** `BaseGameState`

**Purpose:** State for Trouble (Pop-O-Matic) game

**Current Implementation:**
- Lightweight type marker
- Returns `'trouble'` from `getStateType()`
- Compatible with existing TroubleGameEngine

**Actual Game Data:**
Currently stored in `gameState.pluginState.trouble`:
```javascript
{
  currentPlayerId: string,
  pendingRoll: number | null,
  pendingSelection: boolean,
  pieces: [
    {
      id: string,
      playerId: string,
      pieceIndex: number,
      status: 'HOME' | 'TRACK' | 'FINISH' | 'DONE',
      spaceId: string,  // e.g., "home-0-0", "track-5", "finish-1-2"
      stepsFromStart: number
    }
  ]
}
```

**Why `pluginState.trouble`?**
- TroublePieceManager expects this structure
- Pieces need `spaceId` mappings to board spaces
- Preserves working UI integration
- Allows incremental refactoring

**Future Enhancement:**
Can gradually move data from `pluginState` to class properties while maintaining compatibility.

**Used By:** TroubleGameEngine

---

## Delta Synchronization

Each state class defines which fields should be included in delta updates via `getDeltaFields()`:

```javascript
// BaseGameState
getDeltaFields() {
    return ['stateType', 'gamePhase'];
}

// TurnBasedGameState
getDeltaFields() {
    return [
        ...super.getDeltaFields(),  // Includes parent fields
        'remainingMoves',
        'turnPhase'
    ];
}
```

`StateDelta.createGameStateDelta()` uses this to determine which fields to check for changes.

## Plugin State vs Class Properties

### When to use `pluginState`

✅ **Use for:**
- Complex nested data structures
- Data that needs special serialization
- Backwards compatibility during refactoring
- Engine-specific data that doesn't fit base schema

### When to use class properties

✅ **Use for:**
- Core game state (turn tracking, phases, etc.)
- Data that all engines share
- Data that needs to be in deltas
- Well-defined state structures

### Example: Trouble's Hybrid Approach

```javascript
class TroubleGameState extends BaseGameState {
    constructor(config) {
        super(config);
        // Core state as properties (future enhancement)
        // this.lastRoll = null;
        // this.pieces = [];
    }

    // Actual data still in pluginState.trouble (current)
    // Accessed via: this.pluginState.trouble.pieces
}
```

This allows incremental migration from `pluginState` to typed properties.

## Creating a New Game State

### Step 1: Create State Class

```javascript
// src/js/models/gameStates/MyGameState.js
import BaseGameState from './BaseGameState.js';

export default class MyGameState extends BaseGameState {
    constructor(config = {}) {
        super(config);

        // Add custom properties
        this.myCustomField = config.myCustomField || 0;
    }

    getStateType() {
        return 'my-game';
    }

    getDeltaFields() {
        return [
            ...super.getDeltaFields(),
            'myCustomField'  // Include in sync
        ];
    }

    toJSON() {
        return {
            ...super.toJSON(),
            myCustomField: this.myCustomField
        };
    }

    static fromJSON(json, factoryManager) {
        const state = super.fromJSON(json, factoryManager);
        state.myCustomField = json.myCustomField || 0;
        return state;
    }
}
```

### Step 2: Register in Plugin

```javascript
// src/js/plugins/MyGamePlugin.js
import GameStateFactory from '../factories/GameStateFactory.js';
import MyGameState from '../models/gameStates/MyGameState.js';

export default class MyGamePlugin extends Plugin {
    initialize(eventBus, registryManager, factoryManager) {
        // Register state
        if (!GameStateFactory.isRegistered('my-game')) {
            GameStateFactory.register('my-game', MyGameState);
        }
    }
}
```

### Step 3: Configure Board

```json
{
  "metadata": {
    "engine": {
      "type": "my-game"
    }
  }
}
```

## Benefits of Modular States

1. **Type Safety** - Each game has its own state class
2. **Encapsulation** - Game logic stays with game state
3. **Delta Efficiency** - Only relevant fields synced
4. **Plugin Architecture** - No core code modifications
5. **Incremental Migration** - Can refactor piece by piece
6. **Testability** - Can test state classes independently

## Current Status

- ✅ BaseGameState - Complete
- ✅ TurnBasedGameState - Complete
- ✅ TroubleGameState - Basic implementation, uses `pluginState.trouble`
- ⏳ Future: Move Trouble data from `pluginState` to class properties

## See Also

- [Plugin Development Guide](./PLUGIN_DEVELOPMENT_GUIDE.md)
- [Trouble Refactor Plan](./TROUBLE_REFACTOR_PLAN.md)
- [Trigger System Architecture](./TRIGGER_SYSTEM_ARCHITECTURE.md)
