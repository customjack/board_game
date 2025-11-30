# TODO

1. **(done)** Convert maps into ZIP-based board bundles  
   - Modular JSON files (board.json, topology.json, etc.)  
   - Assets folder included  
   - Loader pipeline established

2. **Load / Save Gamestate System**
   - Add "Load Game" UI entry point
   - Add "Save Gamestate" (local only, auto-overwrite)
   - Gamestate stored in `localStorage` or IndexedDB
   - On load: allow player to select which client identity to assume
   - Update engine state accordingly
   - Engines define what triggers autosave

3. **Turn Order Management**
   - Host-only control panel for turn order
   - “Randomize turn order” button
   - Manual drag-to-reorder list
   - Sync changes across clients
   - Persist selection into gamestate

4. **Map Creator Tool**
   - Runs in browser
   - Supports placing spaces, editing topology, triggers, visuals
   - Imports / exports board bundles
   - Asset upload (images → embedded in ZIP)
   - Preview mode with zoom/pan
