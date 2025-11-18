# Trouble Engine Refactor Plan

## Current Problems

### 1. Duplicate State Tracking
- Engine has `this.turnIndex`
- GameState has `currentPlayerIndex`
- These get out of sync, causing "not your turn" bugs

### 2. Missing State in Deltas
- Piece positions stored in `pluginState.trouble` only
- Not in main game state like TurnBasedGameState does
- Clients don't see piece movements

### 3. No Proper State Machine
- Custom phases (`WAITING_FOR_ROLL`, `WAITING_FOR_MOVE`, etc.)
- Should use standard `TurnPhases` like TurnBasedGameEngine
- No proper phase transition handlers

### 4. Missing UI Logic
- No modal for "move piece out vs move existing piece" when rolling 6
- No highlighted spaces showing possible moves
- Client always rolls 0 (animation issue)

## Solution: Proper State Machine Pattern

### Use TurnPhases (like TurnBasedGameEngine)

```javascript
TurnPhases.BEGIN_TURN          // Select current player
TurnPhases.WAITING_FOR_MOVE    // Show roll button, wait for roll
TurnPhases.PROCESSING_MOVE     // Process roll, determine options
TurnPhases.PLAYER_CHOOSING_DESTINATION  // Show highlighted spaces OR modal for piece-out choice
TurnPhases.END_TURN            // Clean up, advance turn (or give extra turn for 6)
```

### State Flow

#### Case 1: No pieces out, didn't roll 6
```
BEGIN_TURN → WAITING_FOR_MOVE → (roll) → PROCESSING_MOVE → (no moves) → END_TURN
```

#### Case 2: Pieces out, didn't roll 6
```
BEGIN_TURN → WAITING_FOR_MOVE → (roll) → PROCESSING_MOVE →
  → PLAYER_CHOOSING_DESTINATION → (click space) → END_TURN
```

#### Case 3: No pieces out, rolled 6
```
BEGIN_TURN → WAITING_FOR_MOVE → (roll 6) → PROCESSING_MOVE →
  → (auto move piece out) → BEGIN_TURN (same player, extra turn)
```

#### Case 4: Some pieces out, rolled 6
```
BEGIN_TURN → WAITING_FOR_MOVE → (roll 6) → PROCESSING_MOVE →
  → (show modal: "Move piece out OR move existing?") →
  → PLAYER_CHOOSING_DESTINATION → (click space OR piece-out button) →
  → BEGIN_TURN (same player, extra turn)
```

#### Case 5: All pieces out, rolled 6
```
BEGIN_TURN → WAITING_FOR_MOVE → (roll 6) → PROCESSING_MOVE →
  → PLAYER_CHOOSING_DESTINATION → (click space) →
  → BEGIN_TURN (same player, extra turn)
```

### TroubleGameState Changes

Extend TurnBasedGameState instead of BaseGameState:

```javascript
class TroubleGameState extends TurnBasedGameState {
    constructor(config) {
        super(config);
        this.pieces = [];  // Array of {playerId, pieceIndex, position, status}
    }

    getDeltaFields() {
        return [
            ...super.getDeltaFields(),
            'pieces'  // Include pieces in deltas!
        ];
    }
}
```

### TroubleGameEngine Changes

Extend BaseGameEngine and use PhaseStateMachine:

```javascript
class TroubleGameEngine extends BaseGameEngine {
    constructor(dependencies, config) {
        super(dependencies, config);
        this.phaseStateMachine = new PhaseStateMachine(/* ... */);
        // No this.turnIndex - use gameState.currentPlayerIndex only!
    }

    registerPhaseHandlers() {
        this.phaseStateMachine.registerTurnPhaseHandler(
            TurnPhases.BEGIN_TURN,
            () => this.handleBeginTurn()
        );
        this.phaseStateMachine.registerTurnPhaseHandler(
            TurnPhases.WAITING_FOR_MOVE,
            () => this.handleWaitingForMove()  // Activate roll button
        );
        this.phaseStateMachine.registerTurnPhaseHandler(
            TurnPhases.PROCESSING_MOVE,
            () => this.handleProcessingMove()  // Determine move options
        );
        this.phaseStateMachine.registerTurnPhaseHandler(
            TurnPhases.PLAYER_CHOOSING_DESTINATION,
            () => this.handlePlayerChoosing()  // Show spaces/modal
        );
        this.phaseStateMachine.registerTurnPhaseHandler(
            TurnPhases.END_TURN,
            () => this.handleEndTurn()  // Advance or repeat turn
        );
    }

    handleProcessingMove() {
        const roll = this.gameState.lastRoll;
        const options = this.findMovablePieces(currentPlayer, roll);

        if (options.length === 0) {
            // No moves
            this.phaseStateMachine.transitionTo(TurnPhases.END_TURN, {extraTurn: roll === 6});
        } else if (roll === 6 && canMoveOut && options.length > 0) {
            // Show modal: move out vs move existing
            this.showMoveOutModal();
        } else {
            // Show highlighted spaces
            this.phaseStateMachine.transitionTo(TurnPhases.PLAYER_CHOOSING_DESTINATION);
        }
    }
}
```

## Implementation Steps

### Phase 1: Fix Immediate Bugs (DONE)
- [x] Fix `fallbackId` reference error
- [x] Sync turnIndex with currentPlayerIndex

### Phase 2: Add Piece State to GameState (DONE)
- [x] Add `pieces` array to TroubleGameState
- [x] Include `pieces` in `getDeltaFields()`
- [x] Serialize/deserialize piece positions
- [x] Add `lastRoll` field for tracking dice rolls

### Phase 3: Refactor to TurnPhases (DONE)
- [x] Removed custom `TroubleTurnPhases`
- [x] Use standard `TurnPhases` enum
- [x] Implemented all phase handlers
- [x] Use PhaseStateMachine (like TurnBasedGameEngine)

### Phase 4: Add Missing UI (TODO)
- [ ] Modal for "move out vs move existing piece" on 6
- [ ] Highlight valid destination spaces
- [ ] Fix client roll animation (always shows 0)

### Phase 5: Remove Duplicate State (DONE)
- [x] Removed `this.turnIndex` entirely
- [x] Use only TurnBasedGameState's turn management
- [x] Removed `pluginState.trouble` (use game state pieces array directly)
- [x] Single source of truth: TroubleGameState

## Testing Checklist

After refactor:
- [ ] Host can roll dice
- [ ] Client can see host's rolls and piece movements
- [ ] Client can roll when it's their turn
- [ ] Pieces move correctly on all clients
- [ ] Rolling 6 gives extra turn
- [ ] Rolling 6 with pieces out shows move-out choice
- [ ] Landing on opponent sends them home
- [ ] Can't land on own pieces
- [ ] Exact count to finish
- [ ] First player to get all 4 pieces home wins

## Notes

The current TroubleGameEngine is trying to do too much:
- It manages its own state machine
- It tracks pieces separately from game state
- It has duplicate turn tracking

The solution is to:
1. **Let TroubleGameState handle state** (like TurnBasedGameState does)
2. **Let PhaseStateMachine handle phases** (like TurnBasedGameEngine does)
3. **Let the game state be the single source of truth**

This is exactly what you described - a simpler, cleaner implementation following the established patterns.
