# Trigger System Implementation and Board JSON Structure Analysis

## Overview
The drinking board game uses a comprehensive trigger and event system to manage game interactions. Triggers detect when certain conditions are met, and when activated, they execute associated actions. This document explains the complete architecture.

---

## 1. TRIGGER SYSTEM ARCHITECTURE

### 1.1 Trigger Types (Enum)
**File:** `/home/jack/js_projects/drinking_board_game/src/js/enums/TriggerTypes.js`

```javascript
const TriggerTypes = Object.freeze({
    ON_ENTER: 'ON_ENTER',      // Triggered when player moves into space
    ON_LAND: 'ON_LAND',        // Triggered when player lands after using all moves
    ON_EXIT: 'ON_EXIT',        // Triggered when player exits the space
    CODE: 'CODE',              // Triggered by custom JavaScript code
});
```

**Semantic Differences:**
- `ON_ENTER`: Fires whenever the player moves to this space (mid-movement)
- `ON_LAND`: Fires only when the player finishes moving (no moves left)
- `ON_EXIT`: Fires when the player leaves the space to go somewhere else
- `CODE`: Evaluates custom JavaScript condition to determine trigger

### 1.2 Trigger Class
**File:** `/home/jack/js_projects/drinking_board_game/src/js/models/Trigger.js`

**Constructor:**
```javascript
new Trigger(type, payload)
// type: One of TriggerTypes (ON_ENTER, ON_LAND, ON_EXIT, CODE)
// payload: Value/code to evaluate (primarily used for CODE type)
```

**Key Method: `isTriggered(context)`**

The `isTriggered()` method evaluates trigger conditions with a context object:
```javascript
context = {
    gameState: gameState,     // Current game state
    space: space,             // Current space being evaluated
    eventBus: eventBus,       // Event emitter for notifications
    peerId: peerId            // Network peer identifier
}
```

**Trigger Logic Flow:**

1. **ON_ENTER Logic:**
   - Check if player has moved this turn: `player.movementHistory.getHistoryForTurn()`
   - Check if current player is on this space: `player.currentSpaceId === space.id`
   - **Returns:** true if both conditions met

2. **ON_LAND Logic:**
   - Check if player is on this space AND has no moves left
   - Condition: `player.currentSpaceId === space.id && !gameState.hasMovesLeft()`
   - **Returns:** true if both conditions met

3. **ON_EXIT Logic:**
   - Check player's movement history for the space
   - Get second-most recent move: `player.movementHistory.getPreviousMove(1)`
   - Check if that move's spaceId matches current space: `lastMove.spaceId === space.id`
   - **Returns:** true if exit from this space is detected

4. **CODE Logic:**
   - Evaluates custom JavaScript: `eval(payload)`
   - **Returns:** result of code evaluation

**Serialization:**
```javascript
toJSON() // Returns: { type: string, payload: any || null }
fromJSON(json) // Static method to deserialize from JSON
```

---

## 2. GAME EVENT SYSTEM

### 2.1 GameEvent Class
**File:** `/home/jack/js_projects/drinking_board_game/src/js/models/GameEvent.js`

**Constructor:**
```javascript
new GameEvent(trigger, action, priority = PriorityLevels.MID)
// trigger: Trigger instance
// action: Action instance to execute when triggered
// priority: Priority level (LOW, MID, HIGH, CRITICAL)
```

### 2.2 GameEvent States
**File:** `/home/jack/js_projects/drinking_board_game/src/js/enums/GameEventState.js`

```javascript
const GameEventState = Object.freeze({
    READY: 'READY',                      // Initial state, ready to be checked
    CHECKING_TRIGGER: 'CHECKING_TRIGGER', // Currently evaluating trigger
    TRIGGERED: 'TRIGGERED',              // Trigger condition met, waiting for execution
    PROCESSING_ACTION: 'PROCESSING_ACTION', // Action is currently executing
    COMPLETED_ACTION: 'COMPLETED_ACTION',  // Action completed
    INACTIVE: 'INACTIVE'                 // Event has been disabled
});
```

**State Transition Flow:**
```
READY → CHECKING_TRIGGER → TRIGGERED → PROCESSING_ACTION → COMPLETED_ACTION
            ↓ (if not triggered)
          READY (loop)

Can transition to INACTIVE at any point
```

### 2.3 Priority Levels
**File:** `/home/jack/js_projects/drinking_board_game/src/js/enums/PriorityLevels.js`

```javascript
const PriorityLevels = Object.freeze({
    VERY_LOW:  { name: 'VERY_LOW', value: 1 },
    LOW:       { name: 'LOW', value: 2 },
    MID:       { name: 'MID', value: 3 },     // Default
    HIGH:      { name: 'HIGH', value: 4 },
    VERY_HIGH: { name: 'VERY_HIGH', value: 5 },
    CRITICAL:  { name: 'CRITICAL', value: 6 }
});
```

**Usage:** Events are processed in descending order (CRITICAL → VERY_LOW)

---

## 3. EVENT PROCESSING SYSTEM

### 3.1 EventProcessor
**File:** `/home/jack/js_projects/drinking_board_game/src/js/engines/components/EventProcessor.js`

**Core Methods:**

1. **`determineTriggeredEvents(peerId = null)`**
   - Loops through all spaces on the board
   - Calls `event.checkTrigger(context)` for each event
   - Collects all triggered events into an array
   - Sorts by priority (highest first)
   - Returns array of `{event, space}` objects

2. **`startProcessing(eventQueue = null)`**
   - Initializes event processing
   - Sets queue or calls `determineTriggeredEvents()`
   - Sets `isProcessing = true`
   - Emits 'eventProcessingStarted' event

3. **`getNextEvent()`**
   - Returns current event from queue
   - Increments internal index

4. **`advanceToNextEvent(result = {})`**
   - Records execution in history (if enabled)
   - Moves to next event in queue
   - Calls `finishProcessing()` when queue empty

5. **`finishProcessing()`**
   - Sets `isProcessing = false`
   - Emits 'eventProcessingFinished' event
   - Clears current queue

6. **`resetAllEvents(resetHistory = false)`**
   - Sets all COMPLETED_ACTION events back to READY
   - Prepares for next trigger check cycle

### 3.2 GameState Integration
**File:** `/home/jack/js_projects/drinking_board_game/src/js/models/GameState.js`

**`determineTriggeredEvents(eventBus = null, peerId = null)`**
- Called at key game phases (usually in TurnBasedGameEngine)
- Creates context for each event: `{gameState, space, eventBus, peerId}`
- Checks each event: `event.checkTrigger(context)`
- Sorts by priority in descending order
- Stores in `this.triggeredEvents`
- Returns sorted array

---

## 4. BOARD JSON STRUCTURE

### 4.1 Top-Level Structure
```json
{
  "metadata": { ... },
  "spaces": [ ... ]
}
```

### 4.2 Metadata Section
**File example:** `/home/jack/js_projects/drinking_board_game/src/assets/maps/defaultBoard.json`

```json
{
  "metadata": {
    "name": "Drinking Board Game",
    "author": "Jack Carlton",
    "description": "Game to drink with your friends while playing",
    "createdDate": "2024-10-28T12:00:00Z",
    "version": "1.0.0",
    "tags": ["default", "party", "drinking"],
    
    "gameEngine": {
      "type": "turn-based",
      "config": {}
    },
    
    "renderConfig": {
      "connectionColor": "#000000",
      "arrowColor": "#000000",
      "connectionThickness": 2,
      "arrowSize": 10
    },
    
    "gameRules": {
      "players": {
        "min": 2,
        "max": 8,
        "recommended": {
          "min": 3,
          "max": 6
        },
        "startingPositions": {
          "mode": "single",
          "spaceIds": [1]
        }
      }
    }
  }
}
```

**Metadata Fields:**
- `name`: Display name of the board
- `author`: Creator information
- `description`: Board description
- `createdDate`: ISO 8601 format timestamp
- `version`: Semantic versioning
- `tags`: Array of categorization tags
- `gameEngine`: Engine type and configuration
- `renderConfig`: Visual rendering overrides
- `gameRules`: Game rules and constraints

**GameRules Structure:**
- `players.min`: Minimum player count (required)
- `players.max`: Maximum player count (required)
- `players.recommended`: Recommended range (optional)
- `players.startingPositions.mode`: 'single', 'spread', 'random', 'custom'
- `players.startingPositions.spaceIds`: Array of starting space IDs

### 4.3 Spaces Array Structure

**Complete Space Example:**
```json
{
  "id": 2,
  "name": "Take a Drink",
  "type": "action",
  "events": [ ... ],
  "visualDetails": { ... },
  "connections": [ ... ]
}
```

**Space Properties:**

1. **id** (required, number or string)
   - Unique identifier for the space
   - Used in connections and starting positions

2. **name** (required, string)
   - Display name shown on the space

3. **type** (optional, string)
   - Semantic type: 'start', 'end', 'action', 'normal', etc.
   - For game logic and styling purposes

4. **visualDetails** (required, object)
   ```json
   {
     "x": 400,                    // X coordinate
     "y": 300,                    // Y coordinate
     "size": 60,                  // Circle radius/size
     "color": "#ccffcc",          // Background color (hex)
     "textColor": "#000000",      // Text color
     "font": "12px Arial",        // Font style
     "textAlign": "center",       // Text alignment
     "textBaseline": "middle",    // Vertical text baseline
     "borderColor": "#000000",    // Border color (optional)
     "borderWidth": 2             // Border width (optional)
   }
   ```

5. **connections** (optional, array)
   ```json
   {
     "targetId": 3,              // ID of target space
     "condition": null,          // Optional condition
     "drawConnection": true      // Whether to draw line
   }
   ```
   - Defines directed graph connections
   - Multiple connections allowed (forking paths)
   - Connection resolution happens in two-pass deserialization

6. **events** (optional, array)
   - Array of GameEvent objects (see below)

### 4.4 Events Structure

**Complete Event Example:**
```json
{
  "trigger": {
    "type": "ON_ENTER"
  },
  "action": {
    "type": "PROMPT_ALL_PLAYERS",
    "payload": {
      "message": "You take a drink! {{CURRENT_PLAYER_NAME}}"
    }
  },
  "priority": "MID"
}
```

**Event Object:**

1. **trigger** (required)
   ```json
   {
     "type": "ON_ENTER|ON_LAND|ON_EXIT|CODE",
     "payload": null  // Optional, used for CODE type
   }
   ```

2. **action** (required)
   ```json
   {
     "type": "ACTION_TYPE_NAME",
     "payload": { ... }  // Action-specific data
   }
   ```

3. **priority** (optional, defaults to "MID")
   - String: "VERY_LOW", "LOW", "MID", "HIGH", "VERY_HIGH", "CRITICAL"
   - Or object: `{ "name": "MID" }`

### 4.5 Actions Available

Actions are instantiated by the ActionFactory. Common action types include:

1. **PROMPT_ALL_PLAYERS**
   ```json
   {
     "type": "PROMPT_ALL_PLAYERS",
     "payload": {
       "message": "Message with {{PLACEHOLDERS}}"
     }
   }
   ```

2. **PROMPT_CURRENT_PLAYER**
   ```json
   {
     "type": "PROMPT_CURRENT_PLAYER",
     "payload": {
       "message": "Message for current player"
     }
   }
   ```

3. **DISPLACE_PLAYER**
   ```json
   {
     "type": "DISPLACE_PLAYER",
     "payload": {
       "steps": -2  // Negative = backward, positive = forward
     }
   }
   ```

4. **SET_PLAYER_SPACE**
   ```json
   {
     "type": "SET_PLAYER_SPACE",
     "payload": {
       "spaceId": 10
     }
   }
   ```

5. **APPLY_EFFECT**
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

6. **SET_PLAYER_STATE**
   ```json
   {
     "type": "SET_PLAYER_STATE",
     "payload": {
       "state": "COMPLETED_GAME"
     }
   }
   ```

---

## 5. BOARD SCHEMA VALIDATION

**File:** `/home/jack/js_projects/drinking_board_game/src/js/utils/BoardSchemaValidator.js`

**Validation Methods:**

1. **`validate(boardJson)`**
   - Main entry point
   - Returns: `{valid: boolean, errors: string[]}`
   - Validates metadata, spaces, and connections

2. **`validateMetadata(metadata)`**
   - Checks required/optional fields
   - Validates gameEngine, renderConfig, gameRules

3. **`validateGameRules(gameRules)`**
   - Validates player counts
   - Validates starting positions

4. **`validateSpace(space, index)`**
   - Checks required fields: id, name, visualDetails
   - Validates connections array
   - Validates events array

5. **`validateTrigger(trigger, prefix)`**
   - Validates trigger has type field
   - Validates trigger.type is string

6. **`validateAction(action, prefix)`**
   - Validates action has type field
   - Validates action.type is string
   - Validates payload is object if present

7. **`validateConnections(spaces)`**
   - Ensures all targetIds reference existing spaces
   - Prevents dangling connections

---

## 6. COMPLETE FLOW EXAMPLE

### Board Load Flow:
1. Load JSON file
2. Call `BoardSchemaValidator.validate()` - validate structure
3. Call `Board.fromJSON(json)`
   - First pass: Create Space instances from JSON
   - Second pass: Resolve space connections (targetId → target object)
   - Create GameRules from metadata.gameRules
4. Board ready with spaces, events, and connections

### Game Execution Flow:
1. **Turn Phase: PROCESSING_EVENTS**
2. Call `gameState.determineTriggeredEvents(eventBus, peerId)`
   - Loop spaces → events
   - Call `event.checkTrigger(context)` for each event
   - Collect triggered events
   - Sort by priority
3. Start event processing with EventProcessor
4. For each event in priority order:
   - Execute action
   - Update event state to COMPLETED_ACTION
   - Call advanceToNextEvent()
5. Reset all COMPLETED events to READY for next cycle

### Example Trigger Check:
Space ID 2 has event with trigger type ON_ENTER:
```
1. Player moves to space 2 (currentSpaceId = 2)
2. Movement history shows move this turn
3. event.checkTrigger(context) called
4. Trigger.isTriggered() evaluates:
   - hasMovedThisTurn = true
   - player.currentSpaceId === space.id = true
   - Returns: true
5. Event is added to triggeredEvents array
6. Event state set to TRIGGERED
7. Action executes (PROMPT_ALL_PLAYERS, etc.)
```

---

## 7. SERIALIZATION PATTERNS

### Trigger Serialization:
```javascript
// From object → JSON
trigger.toJSON()
// → { type: "ON_ENTER", payload: null }

// From JSON → object
Trigger.fromJSON(json)
// → new Trigger("ON_ENTER", null)
```

### GameEvent Serialization:
```javascript
// From object → JSON
event.toJSON()
// → { 
//     trigger: { type: "ON_ENTER", payload: null },
//     action: { type: "PROMPT_ALL_PLAYERS", payload: {...} },
//     priority: "MID",
//     state: "READY"
//   }

// From JSON → object
GameEvent.fromJSON(json)
// → Creates new GameEvent with deserialized trigger/action
```

### Space Serialization:
```javascript
// Two-pass deserialization:
// 1. Create spaces without resolving connections
const space = Space.fromJSON(spaceJson)
// 2. Resolve connections between spaces
Space.resolveConnections(allSpaces, allSpacesJson)
```

### Board Serialization:
```javascript
// From Board → JSON
board.toJSON()
// → { metadata: {...}, spaces: [...] }

// From JSON → Board
Board.fromJSON(json)
// → Handles two-pass space deserialization
```

---

## 8. KEY FILES REFERENCE

| File | Purpose |
|------|---------|
| `/src/js/models/Trigger.js` | Trigger condition evaluation |
| `/src/js/enums/TriggerTypes.js` | Trigger type constants |
| `/src/js/models/GameEvent.js` | Event wrapper combining trigger+action |
| `/src/js/enums/GameEventState.js` | Event state lifecycle |
| `/src/js/enums/PriorityLevels.js` | Event priority ordering |
| `/src/js/models/Space.js` | Board space definition |
| `/src/js/models/Board.js` | Board container |
| `/src/js/models/Action.js` | Legacy action wrapper |
| `/src/js/factories/ActionFactory.js` | Action instantiation factory |
| `/src/js/engines/components/EventProcessor.js` | Event queue management |
| `/src/js/utils/BoardSchemaValidator.js` | JSON validation |
| `/src/assets/maps/defaultBoard.json` | Example board file |
| `/src/assets/maps/examples/test-mini-board.json` | Minimal example board |

---

## 9. IMPORTANT NOTES

### Trigger Evaluation:
- Triggers are stateless - same conditions always produce same result
- Trigger context includes full game state for evaluation
- CODE triggers can access variables via eval() (potential security concern)

### Event State Management:
- Events stay in TRIGGERED state until action completes
- Once completed, event state is reset to READY next turn
- Events can only be triggered once per cycle (READY → TRIGGERED)

### Priority Ordering:
- Higher priority events execute first
- Priority values are numeric (1-6)
- Ties are broken by board order (space order)

### Connection Resolution:
- Connections use targetId strings in JSON
- Resolved to space object references during deserialization
- Enables graph-based movement patterns

### Payload Placeholders:
- Messages support placeholders: `{{CURRENT_PLAYER_NAME}}`, `{{RANDOM_WORD}}`, etc.
- Placeholder replacement happens in action execution, not at load time

