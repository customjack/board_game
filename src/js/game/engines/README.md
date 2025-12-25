# Game Engine Architecture

## Overview

The game engine architecture is now organized into clear layers of abstraction, from generic to specific:

```
IGameEngine (interface)
    ↓
BaseGameEngine (core foundation)
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

### 3. Concrete Implementations
Located in: [./](.)

Specific game engines that implement complete game logic:
- `TurnBasedGameEngine` - Classic turn-based board game
- `MultiPieceGameEngine` - Games with multiple pieces per player (like Sorry!)

## How to Create a New Game Engine

### Option 1: From Scratch
1. Extend `BaseGameEngine`
2. Implement all required methods
3. Define UI requirements

```javascript
import BaseGameEngine from '../../core/base/BaseGameEngine.js';

class MyGameEngine extends BaseGameEngine {
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

## Migration from Old Architecture

### What Changed
1. **Removed:** `getCapabilities()` - No more predicting all possible features
2. **Reorganized:** Clear separation of concerns
3. **Simplified:** Engines declare what they need, not what they support

### Migration Steps
1. Remove `getCapabilities()` from your engine
2. Identify reusable patterns in your engine
3. Extract common helpers where needed
4. Compose your engine from base + specific logic

## Design Principles

1. **Composition over Inheritance:** Keep engines focused and reuse helpers where it makes sense
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
