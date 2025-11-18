# Game Engine Architecture

## Overview

The game engine architecture is now organized into clear layers of abstraction, from generic to specific:

```
IGameEngine (interface)
    ↓
BaseGameEngine (core foundation)
    ↓
Mixins (reusable behaviors)
    ↓
Abstract Engines (common patterns)
    ↓
Concrete Implementations (specific games)
```

## Layers

### 1. Interface Layer: `IGameEngine`
Located in: [src/js/core/interfaces/IGameEngine.js](../../../core/interfaces/IGameEngine.js)

Defines the contract all game engines must implement:
- Lifecycle methods (init, start, stop, pause, resume, cleanup)
- State management (updateGameState, getEngineState)
- Player actions (onPlayerAction)
- UI requirements (getRequiredUIComponents, getOptionalUIComponents)

**Design Philosophy:** Game engines should NOT declare capabilities upfront. Instead, they expose what UI components they need. This allows for organic growth as new game types emerge.

### 2. Base Layer: `BaseGameEngine`
Located in: [src/js/core/base/BaseGameEngine.js](../../../core/base/BaseGameEngine.js)

Provides common foundation for all game engines:
- Dependency injection (gameState, eventBus, registries, factories)
- UI component management
- State change proposals
- Event emission
- Logging helpers

### 3. Mixin Layer: Reusable Behaviors
Located in: [abstractions/](./abstractions/)

Mixins provide specific, composable behaviors that many engines need:

#### `BoardInteractionMixin`
For engines that need players to select spaces on a board:
- `highlightSpaces(spaces)` - Highlight multiple spaces
- `clearHighlights()` - Remove all highlights
- `setupSpaceSelection(spaces, onSelect)` - Make spaces clickable
- `cleanupSpaceSelection()` - Clean up event handlers

**Use when:** Your engine needs to let players click on board spaces to move or perform actions.

#### `PhaseManagementMixin`
For engines using phase-based state machines:
- `changePhase({ newGamePhase, newTurnPhase, delay })` - Change phases
- `getCurrentPhase()` - Get current phase string
- `isInGamePhase(phase)` - Check game phase
- `isInTurnPhase(phase)` - Check turn phase

**Use when:** Your engine has distinct game/turn phases.

#### `DiceRollMixin`
For engines that use dice rolling:
- `rollDiceForCurrentPlayer(numDice, sides)` - Roll dice
- `activateRollButton()` - Enable roll button
- `deactivateRollButton()` - Disable roll button

**Use when:** Your engine needs dice rolls for movement or actions.

### 4. Abstract Engine Layer
These are "almost concrete" base classes for common game patterns. They compose multiple mixins and add game-type-specific logic.

**Examples to create:**
- `AbstractPhaseBasedEngine` - Combines phase management + event processing
- `AbstractMovementEngine` - Combines dice rolling + board interaction + movement
- `AbstractResourceEngine` - For engines with resource management

### 5. Concrete Implementations
Located in: [./](.)

Specific game engines that implement complete game logic:
- `TurnBasedGameEngine` - Classic turn-based board game
- `MultiPieceGameEngine` - Games with multiple pieces per player (like Sorry!)

## How to Create a New Game Engine

### Option 1: From Scratch
1. Extend `BaseGameEngine`
2. Mix in needed behaviors (optional)
3. Implement all required methods
4. Define UI requirements

```javascript
import BaseGameEngine from '../../core/base/BaseGameEngine.js';
import { DiceRollMixin } from './abstractions/DiceRollMixin.js';

class MyGameEngine extends DiceRollMixin(BaseGameEngine) {
    init() {
        // Initialize your engine
    }

    getEngineType() {
        return 'my-game';
    }

    getRequiredUIComponents() {
        return [/* component specs */];
    }

    // ... implement other required methods
}
```

### Option 2: From Existing Abstract Engine
When abstract engines are created, you can extend them:

```javascript
import AbstractMovementEngine from './AbstractMovementEngine.js';

class MyMovementGameEngine extends AbstractMovementEngine {
    // Only need to implement game-specific logic
    // Movement, dice, board interaction already handled
}
```

## Migration from Old Architecture

### What Changed
1. **Removed:** `getCapabilities()` - No more predicting all possible features
2. **Added:** Mixin layers for composable behaviors
3. **Reorganized:** Clear separation of concerns
4. **Simplified:** Engines declare what they need, not what they support

### Migration Steps
1. Remove `getCapabilities()` from your engine
2. Identify reusable patterns in your engine
3. Extract them to mixins or abstract classes
4. Compose your engine from base + mixins + specific logic

## Design Principles

1. **Composition over Inheritance:** Use mixins for horizontal reuse
2. **Declare Needs, Not Capabilities:** Engines expose UI requirements
3. **Organic Growth:** System adapts to engines, not vice versa
4. **Single Responsibility:** Each layer has one clear purpose
5. **Progressive Enhancement:** Start simple, add complexity as needed

## Future Additions

As more game engines are built, common patterns will emerge:
- Extract common patterns into new mixins
- Create abstract engines for recurring game types
- Document patterns in this README
- Keep the interface minimal and stable
