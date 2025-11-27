# Trigger System Architecture Diagrams

## 1. Component Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Board (JSON File)                      │
│                                                              │
│  metadata {                                                 │
│    name, author, description, gameRules, gameEngine...     │
│  }                                                          │
│                                                              │
│  spaces [ Space, Space, Space... ]                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Board.fromJSON(json)                       │
│            (Two-pass deserialization)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Space [ Multiple ]                        │
│                                                              │
│  ├─ id: number/string                                       │
│  ├─ name: string                                            │
│  ├─ type: string                                            │
│  ├─ visualDetails: { x, y, size, color, ... }             │
│  ├─ connections: [ { targetId, condition, ... } ]         │
│  └─ events: [ GameEvent, GameEvent, ... ]                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │      GameEvent [ Multiple ]         │
        │                                     │
        │  ├─ trigger: Trigger               │
        │  ├─ action: Action                 │
        │  ├─ priority: PriorityLevel        │
        │  └─ state: GameEventState          │
        └─────────────────────────────────────┘
               │                    │
               ▼                    ▼
        ┌────────────────┐  ┌──────────────────┐
        │    Trigger     │  │     Action       │
        │                │  │                  │
        │ type: string   │  │ type: string     │
        │ payload: any   │  │ payload: object  │
        └────────────────┘  └──────────────────┘
               │
         ┌─────┴─────────────────┬───────────┐
         │                       │           │
         ▼                       ▼           ▼
    ON_ENTER               ON_LAND       ON_EXIT
    (movement)             (landing)     (exiting)
    
         └──────────────┬────────────────────┐
                        ▼
                      CODE
                  (custom logic)
```

---

## 2. Trigger Evaluation Flow

```
┌──────────────────────────────────────────────────────────────┐
│  GameState.determineTriggeredEvents(eventBus, peerId)        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Loop: for each Space│
                    └─────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Loop: for each Event│
                    └─────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Create Context {                       │
        │    gameState,                           │
        │    space,                               │
        │    eventBus,                            │
        │    peerId                               │
        │  }                                       │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  event.checkTrigger(context)            │
        │  - Sets state to CHECKING_TRIGGER       │
        │  - Calls trigger.isTriggered(context)   │
        │  - Sets state to TRIGGERED or READY     │
        └─────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
            If Triggered = true    If Triggered = false
                    │                   │
                    ▼                   ▼
            Add to array            Skip
            State: TRIGGERED        State: READY
                    │                   │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Sort by Priority    │
                    │ (High → Low)        │
                    └─────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Return triggeredEvents array           │
        │  [{ event, space }, { event, space }]   │
        └─────────────────────────────────────────┘
```

---

## 3. Trigger Type Evaluation Logic

### ON_ENTER Trigger
```
┌─────────────────────────────────────────────────┐
│  Trigger Type: ON_ENTER                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  Check 1: Player moved this turn?               │
│  ───────────────────────────────────────        │
│  hasMovedThisTurn = 
│    player.movementHistory.getHistoryForTurn(
│      gameState.getTurnNumber()
│    ).length > 0                                 │
│                                                 │
│  Check 2: Player on this space?                 │
│  ───────────────────────────────────────        │
│  playerHereNow = (player.currentSpaceId === space.id)
│                                                 │
│  Result: hasMovedThisTurn AND playerHereNow    │
│                                                 │
│  Timing: During movement, immediately           │
│          after player enters space              │
└─────────────────────────────────────────────────┘
```

### ON_LAND Trigger
```
┌─────────────────────────────────────────────────┐
│  Trigger Type: ON_LAND                          │
├─────────────────────────────────────────────────┤
│                                                 │
│  Check 1: Player on this space?                 │
│  ───────────────────────────────────────        │
│  playerHereNow = (player.currentSpaceId === space.id)
│                                                 │
│  Check 2: No moves remaining?                   │
│  ───────────────────────────────────────        │
│  noMovesLeft = !gameState.hasMovesLeft()        │
│                                                 │
│  Result: playerHereNow AND noMovesLeft          │
│                                                 │
│  Timing: At end of player's move,               │
│          when all dice/movement used            │
└─────────────────────────────────────────────────┘
```

### ON_EXIT Trigger
```
┌─────────────────────────────────────────────────┐
│  Trigger Type: ON_EXIT                          │
├─────────────────────────────────────────────────┤
│                                                 │
│  Step 1: Get previous move from history         │
│  ──────────────────────────────────────         │
│  lastMove = player.movementHistory.getPreviousMove(1)
│             (gets 2nd most recent move)         │
│                                                 │
│  Step 2: Check if from this space               │
│  ──────────────────────────────────────         │
│  wasPreviouslyHere = (lastMove.spaceId === space.id)
│                                                 │
│  Result: wasPreviouslyHere                      │
│                                                 │
│  Timing: After player leaves space              │
│          to go to next space                    │
└─────────────────────────────────────────────────┘
```

### CODE Trigger
```
┌─────────────────────────────────────────────────┐
│  Trigger Type: CODE                             │
├─────────────────────────────────────────────────┤
│                                                 │
│  payload: Custom JavaScript code string         │
│                                                 │
│  Execution:                                     │
│  ─────────                                      │
│  result = eval(payload)                         │
│                                                 │
│  Variables in scope during eval():              │
│  • player (current player)                      │
│  • gameState (full game state)                  │
│  • space (current space)                        │
│                                                 │
│  Result: Boolean or truthy/falsy value          │
│                                                 │
│  Example payloads:                              │
│  • "player.currentSpaceId === 5"                │
│  • "gameState.getTurnNumber() > 3"              │
│  • "player.stats.drinks > 2"                    │
│                                                 │
│  SECURITY NOTE: Uses eval() - potential RCE    │
└─────────────────────────────────────────────────┘
```

---

## 4. Event State Machine

```
                    ┌──────────────────┐
                    │  Start (Invalid) │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
              ┌────►│     READY        │◄────┐
              │     │ (Can be checked) │     │
              │     └────────┬─────────┘     │
              │              │               │
              │ Reset        │ event.        │
              │ Events       │ checkTrigger()│
              │              │               │
              │              ▼               │
              │     ┌──────────────────┐    │
              │     │ CHECKING_TRIGGER │    │
              │     │                  │    │
              │     │ (Evaluating)     │    │
              │     └────┬─────────┬────┘    │
              │          │         │        │
              │  False   │         │ True   │
              │          │         │        │
              └──────────┘         ▼        │
                            ┌──────────────────┐
                            │    TRIGGERED     │
                            │ (Ready to exec)  │
                            └────────┬─────────┘
                                     │
                        event.executeAction()
                                     │
                                     ▼
                    ┌──────────────────────┐
                    │ PROCESSING_ACTION    │
                    │                      │
                    │ (Executing action)   │
                    └────────┬─────────────┘
                             │
                    Action completes
                             │
                             ▼
                    ┌──────────────────┐
                    │ COMPLETED_ACTION │
                    │                  │
                    │ (Done, waiting   │
                    │  for reset)      │
                    └────────┬─────────┘
                             │
                    resetAllEvents()
                             │
                             ▼
                           READY
                          (cycle)

Also possible:
READY/CHECKING_TRIGGER/TRIGGERED/PROCESSING_ACTION ──► INACTIVE
                                                    (disable event)
```

---

## 5. Event Processing Queue Flow

```
┌───────────────────────────────────────────────────────────────┐
│  EventProcessor.startProcessing(eventQueue)                   │
│  OR                                                           │
│  EventProcessor.startProcessing() [auto-determine]           │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ isProcessing = true│
                    │ currentEventIndex=0│
                    └────────┬───────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │ Event Queue:       │
                    │ ┌────────────────┐ │
                    │ │ {event, space} │ │ ◄─── Priority 1
                    │ ├────────────────┤ │
                    │ │ {event, space} │ │ ◄─── Priority 2
                    │ ├────────────────┤ │
                    │ │ {event, space} │ │ ◄─── Priority 3
                    │ └────────────────┘ │
                    └────────┬───────────┘
                             │
                    ┌────────►[Loop]◄──────┐
                    │                      │
                    ▼                      │
        ┌─────────────────────────────┐   │
        │ getNextEvent()              │   │
        │ Returns currentEventQueue[  │   │
        │   currentEventIndex         │   │
        │ ]                           │   │
        └────────┬────────────────────┘   │
                 │                        │
                 ▼                        │
        ┌─────────────────────────────┐   │
        │ executeEvent(eventWithSpace)│   │
        │                             │   │
        │ - Emit gameEventTriggered   │   │
        │ - event.executeAction()     │   │
        │ - Action executes           │   │
        │ - postExecutionCallback()   │   │
        └────────┬────────────────────┘   │
                 │                        │
                 ▼                        │
        ┌─────────────────────────────┐   │
        │ advanceToNextEvent()         │   │
        │                             │   │
        │ - recordEventExecution()    │   │
        │ - currentEventIndex++       │   │
        │ - if (done) finishProcess() │   │
        └────────┬────────────────────┘   │
                 │                        │
         ┌───────┴────────┐               │
         │                │               │
    More Events       No More Events      │
         │                │               │
         └────────────────►[Loop]─────────┘
                          │
                          ▼ (if No More Events)
                ┌──────────────────────────┐
                │ finishProcessing()       │
                │                          │
                │ - isProcessing = false   │
                │ - Clear queue            │
                │ - Emit finished event    │
                └──────────────────────────┘
```

---

## 6. Board JSON Structure Hierarchy

```
BOARD.json
├─ metadata
│  ├─ name: string
│  ├─ author: string
│  ├─ description: string
│  ├─ createdDate: ISO8601
│  ├─ version: semantic
│  ├─ tags: string[]
│  ├─ gameEngine
│  │  ├─ type: "turn-based" | "custom"
│  │  └─ config: {}
│  ├─ renderConfig (optional)
│  │  ├─ connectionColor: hex
│  │  ├─ arrowColor: hex
│  │  ├─ connectionThickness: number
│  │  └─ arrowSize: number
│  └─ gameRules
│     └─ players
│        ├─ min: number
│        ├─ max: number
│        ├─ recommended: { min, max }
│        └─ startingPositions
│           ├─ mode: "single" | "spread" | "random" | "custom"
│           ├─ spaceIds: (string|number)[]
│           └─ distribution: "round-robin" | "sequential"
│
└─ spaces: Space[]
   ├─ id: number | string (required, unique)
   ├─ name: string (required)
   ├─ type: string (optional)
   ├─ visualDetails (required)
   │  ├─ x: number (required)
   │  ├─ y: number (required)
   │  ├─ size: number
   │  ├─ color: hex
   │  ├─ textColor: hex
   │  ├─ font: string
   │  ├─ textAlign: string
   │  ├─ textBaseline: string
   │  ├─ borderColor: hex (optional)
   │  └─ borderWidth: number (optional)
   ├─ connections: Connection[] (optional)
   │  ├─ targetId: number | string (required)
   │  ├─ condition: null | condition
   │  └─ drawConnection: boolean
   └─ events: GameEvent[] (optional)
      ├─ trigger (required)
      │  ├─ type: "ON_ENTER" | "ON_LAND" | "ON_EXIT" | "CODE"
      │  └─ payload: any (optional, for CODE type)
      ├─ action (required)
      │  ├─ type: string
      │  └─ payload: object (optional)
      └─ priority: "VERY_LOW" | "LOW" | "MID" | "HIGH" | "VERY_HIGH" | "CRITICAL"
```

---

## 7. Two-Pass Space Deserialization

```
Phase 1: Deserialize without resolving connections
──────────────────────────────────────────────────

JSON with targetId references:
┌───────────────────────┐
│ {                     │
│   id: 1,              │
│   name: "Start",      │
│   connections: [      │
│     {                 │
│       targetId: 2     │ ◄─── Just a string ID
│     }                 │
│   ]                   │
│ }                     │
└───────────────────────┘
            │
            ▼
Space.fromJSON(spaceJson)
            │
            ▼
┌─────────────────────────────┐
│ Space instance created:     │
│                             │
│ {                           │
│   id: 1,                    │
│   name: "Start",            │
│   connections: [            │
│     {                       │
│       targetId: 2,          │
│       target: undefined     │ ◄─── Not resolved yet
│     }                       │
│   ]                         │
│ }                           │
└─────────────────────────────┘


Phase 2: Resolve connections between spaces
──────────────────────────────────────────────

All Space instances exist:
┌────────────────────────────┐
│ spaces = [                 │
│   Space{id:1, ...},        │
│   Space{id:2, ...},        │
│   Space{id:3, ...}         │
│ ]                          │
└────────────────────────────┘
            │
            ▼
Space.resolveConnections(spaces, originalJSON)
            │
            ▼
Find targetId in spaces array:
┌────────────────────────────────────┐
│ For each space in spaces:          │
│   For each connection:             │
│     Find target = spaces.find(     │
│       s => s.id === targetId       │
│     )                              │
│     connection.target = target     │
│                                    │
│ Result:                            │
│ connection = {                     │
│   targetId: 2,                     │
│   target: Space{id:2} (reference)  │
│ }                                  │
└────────────────────────────────────┘
```

---

## 8. Action Execution Flow

```
Space.events[i].executeAction(gameEngine, callback)
                              │
                              ▼
                ┌──────────────────────────────┐
                │ GameEvent.executeAction()    │
                │                              │
                │ 1. checkTrigger(context)     │
                │    Set state: TRIGGERED      │
                │                              │
                │ 2. Set state:                │
                │    PROCESSING_ACTION         │
                │                              │
                │ 3. this.action.execute()     │
                └──────────┬───────────────────┘
                           │
                           ▼
                ┌──────────────────────────────┐
                │ Action.execute()             │
                │ (Legacy wrapper)             │
                │                              │
                │ Get ActionFactory            │
                │ Create action instance       │
                │ Call action.execute()        │
                └──────────┬───────────────────┘
                           │
                           ▼
                ┌──────────────────────────────┐
                │ Specific Action Type Exec    │
                │ (e.g. PROMPT_ALL_PLAYERS)    │
                │                              │
                │ - Access payload             │
                │ - Replace placeholders       │
                │ - Perform action logic       │
                │ - Update game state          │
                │ - Emit events               │
                └──────────┬───────────────────┘
                           │
                           ▼
                ┌──────────────────────────────┐
                │ postExecutionCallback()      │
                │                              │
                │ - event.state =              │
                │   COMPLETED_ACTION           │
                │ - Change turn phase          │
                │ - Continue event processing  │
                └──────────────────────────────┘
```

---

## Summary of Key Relationships

```
BOARD (JSON)
    │
    └─► SPACES (array)
        │
        └─► EVENTS (array per space)
            │
            ├─► TRIGGER (condition detector)
            │   │
            │   └─► isTriggered(context)
            │       Returns: boolean
            │
            ├─► ACTION (behavior executor)
            │   │
            │   └─► execute(gameEngine, callback)
            │
            └─► PRIORITY (execution order)
                └─► ProcessedBy EventProcessor
                    (in descending priority order)
```

