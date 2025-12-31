# TODO

1. **(done)** Convert maps into ZIP-based board bundles  
   - Modular JSON files (board.json, topology.json, etc.)  
   - Assets folder included  
   - Loader pipeline established
   - 


2. **(done)** **Load / Save Gamestate System**
   - Add "Load Game" UI entry point
   - Add "Save Gamestate" (local only, auto-overwrite)
   - Gamestate stored in `localStorage` or IndexedDB
   - On load: allow player to select which client identity to assume
   - Update engine state accordingly
   - Engines define what triggers autosave

3. **General cleanup, mostly of the "game" folder**
   - Look through all enums
   - Some enums are better suited as just a member variable for a corresponding class
   - Other enums are better suited to be "owned" by a specific game engine implimentation
   - GameEventState.js doesn't belong in game/phases. Frankly, it doesn't even need it's own file. It belongs in elements/models/GameEvent.js
   - Similar for player states. Doesn't belong in phases and can be contained within elements/models/Player.js
   - GamePhases.js is a system wide thing. It's something that extends past a game. right now, it being in game/phases is not right, idk where the right place is.
   - TurnPhases.js belongs "with" TurnBasedGameEngine.js; really, under game/engines we should have a turn_based_engine FOLDER, this will split up everything turn based engine provides. One of these things is the TurnPhases.js. Another is TurnBasedGameState.js; we should view each "GameEngine" as it's own mini project really, impliemnting things where needed. 
   - Everything in game/components (EventProcessor.js, PhaseStateMachine.js, TurnManager.js, UIController.js) is basically unsued. These things clean up implimentation and should be attached to the turn based game engine, but they're more of helpers than anything

4. **Turn Order Management**
   - Host-only control panel for turn order
   - “Randomize turn order” button
   - Manual drag-to-reorder list
   - Sync changes across clients
   - Persist selection into gamestate

5. **Map Creator Tool**
   - Runs in browser
   - Supports placing spaces, editing topology, triggers, visuals
   - Imports / exports board bundles
   - Asset upload (images → embedded in ZIP)
   - Preview mode with zoom/pan
