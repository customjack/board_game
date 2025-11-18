# Refactoring Plan

## Current Issues
1. Too flat - everything in top-level folders without logical subgrouping
2. Trouble implementation is premature and incomplete ✅
3. The "supports" capability system is trying to predict every possible game engine feature
4. Only 3-4 layers of abstraction for game engines, lacking intermediate abstractions

## Proposed Folder Structure

### Core (`src/js/core/`)
- Base classes and interfaces that everything depends on
- `interfaces/` - IGameEngine, etc.
- `base/` - BaseGameEngine, BaseFactory, BaseRegistry, etc.
- `events/` - EventBus

### Game Logic (`src/js/game/`)
- Game-specific logic organized by concern
- `engines/` - TurnBasedGameEngine, MultiPieceGameEngine
- `state/` - GameState classes
- `rules/` - GameRules
- `phases/` - GamePhases, TurnPhases enums, PhaseStateMachine

### Game Elements (`src/js/elements/`)
- Individual game elements (organized by type)
- `actions/` - All Action classes
- `effects/` - All PlayerEffect classes
- `triggers/` - All Trigger classes
- `stats/` - All Stat classes
- `models/` - Player, Piece, Space, Board

### Systems (`src/js/systems/`)
- High-level systems that coordinate multiple concerns
- `networking/` - Host, Client, protocol, handlers
- `plugins/` - Plugin manager and core plugins
- `storage/` - MapStorageManager, LocalStorageManager

### Infrastructure (`src/js/infrastructure/`)
- Supporting infrastructure
- `factories/` - All factories
- `registries/` - All registries
- `managers/` - Specialized managers (TimerManager, SettingsManager, etc.)
- `validation/` - Validators
- `utils/` - Utility functions

### UI (`src/js/ui/`)
- Everything UI-related (already relatively well organized)
- Keep current structure but maybe add subfolders

### Controllers (`src/js/controllers/`)
- Move to deprecated - this is legacy and should be refactored into components

## Phase 1: Move everything to preserve git history
## Phase 2: Remove "supports" capability system
## Phase 3: Add intermediate abstract layers for engines
