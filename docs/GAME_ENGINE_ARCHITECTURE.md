# Game Engine Architecture Design

## Overview

This document outlines the refactored game engine architecture that separates concerns and makes the system pluggable and extensible.

## Current Problems

1. **GameEngine does too much** (~490 lines)
   - UI management (buttons, timers, modals)
   - State machine logic (game phases, turn phases)
   - Game rules enforcement
   - Event processing
   - Player turn management
   - Network state proposals

2. **Tightly coupled to one game type**
   - Hardcoded turn-based logic
   - Specific phase enums
   - Cannot support different game modes

3. **Not configurable**
   - Game rules baked into code
   - No way to define custom game types
   - Board files can't specify game engine type

## New Architecture

### Core Concept: Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│                     GameEngineFactory                        │
│  (Creates appropriate engine based on config/board type)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  BaseGameEngine  │ (Abstract)
                    │  - Core interface│
                    │  - Common logic  │
                    └──────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌──────────────────┐          ┌──────────────────┐
    │ TurnBasedEngine  │          │  RealtimeEngine  │
    │ (Current impl)   │          │  (Future)        │
    └──────────────────┘          └──────────────────┘
              │
              ├─── PhaseStateMachine
              ├─── TurnManager
              ├─── EventProcessor
              └─── UIController
```

## Component Breakdown

### 1. BaseGameEngine (Abstract Class)

**Responsibilities:**
- Define common interface all engines must implement
- Manage game state reference
- Handle state proposals
- Emit lifecycle events
- Coordinate with managers

**Key Methods:**
```javascript
abstract init()
abstract updateGameState(gameState)
abstract onPlayerAction(action)
abstract cleanup()
```

**Properties:**
```javascript
- gameState
- peerId
- eventBus
- registryManager
- factoryManager
- isHost
- proposeGameState (callback)
```

### 2. TurnBasedGameEngine (Concrete Implementation)

**Responsibilities:**
- Implement turn-based game logic
- Manage phase transitions
- Handle dice rolling
- Process events in sequence
- Manage timers for turns

**Components It Uses:**
- `PhaseStateMachine` - Handles game/turn phase transitions
- `TurnManager` - Manages whose turn it is, turn order
- `EventProcessor` - Processes game events
- `UIController` - Manages UI elements (buttons, timers, modals)

### 3. PhaseStateMachine

**Responsibilities:**
- Define states and transitions
- Validate state changes
- Emit state change events
- Handle state-specific logic

**Configurable via:**
```json
{
  "states": {
    "IN_LOBBY": {...},
    "IN_GAME": {...},
    "PAUSED": {...}
  },
  "transitions": {
    "startGame": { "from": "IN_LOBBY", "to": "IN_GAME" },
    "pauseGame": { "from": "IN_GAME", "to": "PAUSED" }
  }
}
```

### 4. TurnManager

**Responsibilities:**
- Determine current player
- Manage turn order
- Handle turn transitions
- Track turn counts

**Methods:**
```javascript
- getCurrentPlayer()
- nextTurn()
- skipTurn(playerId)
- resetTurnOrder()
```

### 5. EventProcessor

**Responsibilities:**
- Queue events
- Process events by priority
- Handle event state transitions
- Execute event actions

**Decouples event processing from game engine**

### 6. UIController

**Responsibilities:**
- Manage UI elements (buttons, timers, modals)
- Bind UI callbacks to engine actions
- Update UI based on state
- Handle user input

**Decouples UI from game logic**

### 7. GameEngineFactory

**Responsibilities:**
- Instantiate appropriate engine based on config
- Register available engine types
- Validate engine configuration

```javascript
class GameEngineFactory {
  static create(config, dependencies) {
    const engineType = config.engineType || 'turn-based';
    const EngineClass = this.registry[engineType];
    return new EngineClass(dependencies, config);
  }
}
```

## Configuration Schema

### Board Metadata Extension

```json
{
  "metadata": {
    "name": "Drinking Board Game",
    "author": "Jack Carlton",
    "gameEngine": {
      "type": "turn-based",
      "config": {
        "turnTimer": 60,
        "moveDelay": 500,
        "phases": {
          "game": ["IN_LOBBY", "IN_GAME", "PAUSED", "GAME_ENDED"],
          "turn": ["CHANGE_TURN", "BEGIN_TURN", "WAITING_FOR_MOVE", ...]
        },
        "rules": {
          "diceRange": [1, 6],
          "simultaneousTurns": false,
          "skipDisconnectedPlayers": true
        }
      }
    }
  }
}
```

## Migration Path

### Phase 1: Extract Components (This PR)
1. Create `BaseGameEngine` abstract class
2. Extract `PhaseStateMachine`
3. Extract `TurnManager`
4. Extract `EventProcessor`
5. Extract `UIController`

### Phase 2: Refactor Current Engine
1. Create `TurnBasedGameEngine` extending `BaseGameEngine`
2. Migrate current GameEngine logic
3. Use extracted components

### Phase 3: Add Factory
1. Create `GameEngineFactory`
2. Register engine types
3. Update Host/Client to use factory

### Phase 4: Configuration
1. Add engine config to board schema
2. Support engine-specific settings
3. Validate configurations

## Benefits

### Extensibility
- ✅ Add new game engine types without modifying existing code
- ✅ Different boards can use different engines
- ✅ Easy to experiment with new game modes

### Maintainability
- ✅ Each component has single responsibility
- ✅ Easier to test individual components
- ✅ Clearer code organization

### Flexibility
- ✅ UI can be swapped without changing logic
- ✅ State machines can be configured
- ✅ Rules can be customized per-game

### Reusability
- ✅ Components can be shared across engine types
- ✅ Common logic in base class
- ✅ Mixins for shared behaviors

## Future Engine Types

### RealtimeGameEngine
- No turns, all players act simultaneously
- Event queue with timestamps
- Conflict resolution

### SimultaneousTurnEngine
- All players plan moves
- Moves execute simultaneously
- Collision detection

### CooperativeEngine
- Shared goals
- Combined actions
- Difficulty scaling

### CompetitiveEngine
- Player vs player
- Resource management
- Win conditions

## API Examples

### Creating an Engine

```javascript
// Current (hardcoded)
const engine = new GameEngine(gameState, peerId, ...);

// New (pluggable)
const engine = GameEngineFactory.create({
  type: 'turn-based',
  config: boardMetadata.gameEngine?.config
}, {
  gameState,
  peerId,
  proposeGameState,
  eventBus,
  registryManager,
  factoryManager,
  isHost
});
```

### Defining a Custom Engine

```javascript
class MyCustomEngine extends BaseGameEngine {
  init() {
    // Custom initialization
  }

  updateGameState(gameState) {
    // Custom state handling
  }

  onPlayerAction(action) {
    // Custom action handling
  }
}

GameEngineFactory.register('my-custom', MyCustomEngine);
```

## Testing Strategy

### Unit Tests
- Test each component in isolation
- Mock dependencies
- Verify state transitions

### Integration Tests
- Test engine with components
- Verify phase transitions
- Test event processing

### E2E Tests
- Test full game flow
- Multiple engine types
- Network synchronization

## Performance Considerations

- **State Machine**: O(1) state lookups via hash maps
- **Turn Manager**: O(1) current player lookup (cached)
- **Event Processor**: O(n log n) for priority sorting
- **UIController**: Debounce updates to prevent thrashing

## Migration Checklist

- [ ] Create BaseGameEngine abstract class
- [ ] Extract PhaseStateMachine
- [ ] Extract TurnManager
- [ ] Extract EventProcessor
- [ ] Extract UIController
- [ ] Create TurnBasedGameEngine
- [ ] Migrate current logic
- [ ] Create GameEngineFactory
- [ ] Update Host.js to use factory
- [ ] Update Client.js to use factory
- [ ] Add engine config to board schema
- [ ] Write tests
- [ ] Update documentation

## Backward Compatibility

All changes will be backward compatible:
- Default engine type: `'turn-based'`
- Existing boards work without changes
- Current behavior preserved
- New config is optional

---

**Status**: Design approved ✅
**Implementation**: In progress 🚧
**Target Completion**: Current sprint 🎯
