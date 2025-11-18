# Plugin Development Guide

This guide explains how to create custom game plugins for the drinking board game framework without modifying core source code.

## Overview

The plugin system allows you to extend the game with:
- **Custom Game Engines**: Implement unique game mechanics and rules
- **Custom Game States**: Define state structures for your game type
- **Custom Piece Managers**: Handle visual piece rendering and animations
- **Event Handlers**: Register custom event handlers for UI interactions
- **Actions, Triggers, Effects**: Add new gameplay elements

## Table of Contents

1. [Plugin Architecture](#plugin-architecture)
2. [Creating a Basic Plugin](#creating-a-basic-plugin)
3. [Registering Game Components](#registering-game-components)
4. [Event Handler Registration](#event-handler-registration)
5. [Complete Example: TroublePlugin](#complete-example-troubleplugin)
6. [Delta System Integration](#delta-system-integration)
7. [Best Practices](#best-practices)

---

## Plugin Architecture

### Core Concepts

Plugins are self-contained modules that register game components into the framework's factory and registry systems. The base system provides extension points through:

- **FactoryManager**: Creates instances of game engines, states, animations, etc.
- **RegistryManager**: Manages type registries (actions, triggers, effects, etc.)
- **EventBus**: Publish/subscribe event system for game events
- **BaseEventHandler**: Coordinates UI events and player actions

### Plugin Lifecycle

1. **Registration**: Plugin class registered in `PluginManager`
2. **Initialization**: `initialize()` called with core dependencies
3. **Event Handler Setup**: `setEventHandler()` called when event handler is ready
4. **Runtime**: Plugin components used during gameplay
5. **Cleanup**: `cleanup()` called when plugin is removed

---

## Creating a Basic Plugin

### Step 1: Extend the Plugin Base Class

```javascript
import Plugin from '../pluginManagement/Plugin.js';

export default class MyCustomPlugin extends Plugin {
    initialize(eventBus, registryManager, factoryManager) {
        this.eventBus = eventBus;
        this.registryManager = registryManager;
        this.factoryManager = factoryManager;

        // Register your components here
    }

    static getPluginMetadata() {
        return {
            id: 'my-custom-plugin',
            name: 'My Custom Game',
            version: '1.0.0',
            description: 'A custom game implementation',
            author: 'Your Name',
            tags: ['custom', 'game'],
            isDefault: false,
            dependencies: ['core'], // Plugins this depends on
            provides: {
                actions: [],
                triggers: [],
                effects: [],
                components: []
            }
        };
    }
}
```

### Step 2: Place Plugin in Correct Directory

Save your plugin file in: `src/js/plugins/MyCustomPlugin.js`

The app automatically loads all plugins from the `src/js/plugins` directory.

---

## Registering Game Components

### Game Engine Registration

```javascript
import GameEngineFactory from '../factories/GameEngineFactory.js';
import MyCustomGameEngine from '../engines/MyCustomGameEngine.js';

initialize(eventBus, registryManager, factoryManager) {
    // Register your custom game engine
    if (!GameEngineFactory.isRegistered('my-custom-game')) {
        GameEngineFactory.register('my-custom-game', MyCustomGameEngine);
        console.log('[Plugin] Registered: my-custom-game engine');
    }
}
```

### Game State Registration

```javascript
import GameStateFactory from '../factories/GameStateFactory.js';
import MyCustomGameState from '../models/gameStates/MyCustomGameState.js';

initialize(eventBus, registryManager, factoryManager) {
    // Register your custom game state
    if (!GameStateFactory.isRegistered('my-custom-game')) {
        GameStateFactory.register('my-custom-game', MyCustomGameState);
        console.log('[Plugin] Registered: my-custom-game state');
    }
}
```

### Piece Manager Registration

```javascript
initialize(eventBus, registryManager, factoryManager) {
    // Register custom piece manager
    const pieceRegistry = registryManager.getPieceManagerRegistry?.();
    if (pieceRegistry && !pieceRegistry.get('my-custom-game')) {
        pieceRegistry.register('my-custom-game', MyCustomPieceManager);
        console.log('[Plugin] Registered: my-custom-game piece manager');
    }
}
```

---

## Event Handler Registration

### Why Event Handlers?

The `BaseEventHandler` coordinates UI events and player actions. Plugins can register custom event handlers without modifying core code.

### How to Register Event Handlers

```javascript
setEventHandler(eventHandler) {
    super.setEventHandler(eventHandler);

    if (eventHandler && typeof eventHandler.registerPluginEventHandler === 'function') {
        // Register custom UI event handlers
        eventHandler.registerPluginEventHandler('myGame:uiAction', (payload) => {
            // Forward to player action system
            eventHandler.handlePlayerAction({
                playerId: payload.playerId,
                actionType: 'MY_ACTION',
                actionData: payload.data
            });
        });

        console.log('[Plugin] Registered event handlers');
    }
}
```

### Player Action System

The `handlePlayerAction` method is a generic dispatcher that:
- **On Host**: Directly calls `gameEngine.onPlayerAction()`
- **On Client**: Sends action to host via network

This eliminates the need for game-specific handlers in `BaseEventHandler`.

### Event Handler Registration Pattern

```javascript
setEventHandler(eventHandler) {
    super.setEventHandler(eventHandler);

    if (!eventHandler) return;

    // Example: Card draw event
    eventHandler.registerPluginEventHandler('cardGame:drawCard', ({ playerId, deckId }) => {
        eventHandler.handlePlayerAction({
            playerId,
            actionType: 'DRAW_CARD',
            actionData: { deckId }
        });
    });

    // Example: Resource management
    eventHandler.registerPluginEventHandler('strategy:buyResource', ({ playerId, resourceType, amount }) => {
        eventHandler.handlePlayerAction({
            playerId,
            actionType: 'BUY_RESOURCE',
            actionData: { resourceType, amount }
        });
    });
}
```

---

## Complete Example: TroublePlugin

Here's the complete Trouble plugin showing all concepts:

```javascript
import Plugin from '../pluginManagement/Plugin.js';
import GameEngineFactory from '../factories/GameEngineFactory.js';
import GameStateFactory from '../factories/GameStateFactory.js';
import TroubleGameEngine from '../engines/TroubleGameEngine.js';
import TroublePieceManager from '../pieceManagers/TroublePieceManager.js';
import TroubleGameState from '../models/gameStates/TroubleGameState.js';

export default class TroublePlugin extends Plugin {
    initialize(eventBus, registryManager, factoryManager) {
        this.eventBus = eventBus;
        this.registryManager = registryManager;
        this.factoryManager = factoryManager;

        // Register game engine
        if (!GameEngineFactory.isRegistered('trouble')) {
            GameEngineFactory.register('trouble', TroubleGameEngine);
        }

        // Register piece manager
        const pieceRegistry = registryManager.getPieceManagerRegistry?.();
        if (pieceRegistry && !pieceRegistry.get('trouble')) {
            pieceRegistry.register('trouble', TroublePieceManager);
        }

        // Register game state
        if (!GameStateFactory.isRegistered('trouble')) {
            GameStateFactory.register('trouble', TroubleGameState);
        }
    }

    setEventHandler(eventHandler) {
        super.setEventHandler(eventHandler);

        if (eventHandler && typeof eventHandler.registerPluginEventHandler === 'function') {
            // Piece selection event
            eventHandler.registerPluginEventHandler('trouble:uiSelectPiece', ({ playerId, pieceIndex }) => {
                eventHandler.handlePlayerAction({
                    playerId,
                    actionType: 'SELECT_PIECE',
                    actionData: { pieceIndex }
                });
            });

            // Dice roll event
            eventHandler.registerPluginEventHandler('trouble:uiRollRequest', ({ playerId }) => {
                eventHandler.handlePlayerAction({
                    playerId,
                    actionType: 'ROLL_DICE',
                    actionData: {}
                });
            });
        }
    }

    cleanup() {
        console.log('[Plugin] Trouble: Cleanup complete');
    }

    static getPluginMetadata() {
        return {
            id: 'trouble-plugin',
            name: 'Trouble Game Engine',
            version: '1.0.0',
            description: 'Adds support for the classic Trouble/Pop-O-Matic ruleset.',
            author: 'OpenAI Codex',
            tags: ['trouble', 'pop-o-matic', 'engine'],
            isDefault: false,
            dependencies: ['core']
        };
    }
}
```

---

## Delta System Integration

### Why Delta Fields Matter

The game uses a delta synchronization system to efficiently send state updates over the network. Your custom game state must define which fields should be included in deltas.

### Implementing getDeltaFields()

```javascript
import BaseGameState from './BaseGameState.js';

export default class MyCustomGameState extends BaseGameState {
    constructor(config) {
        super(config);
        this.customField1 = config.customField1 || 0;
        this.customField2 = config.customField2 || 'default';
    }

    getStateType() {
        return 'my-custom-game';
    }

    /**
     * Define which fields should be included in delta updates
     * IMPORTANT: Always call super.getDeltaFields() to include parent fields
     */
    getDeltaFields() {
        return [
            ...super.getDeltaFields(),  // Include parent fields
            'customField1',              // Add your custom fields
            'customField2'
        ];
    }

    toJSON() {
        return {
            ...super.toJSON(),
            customField1: this.customField1,
            customField2: this.customField2
        };
    }

    static fromJSON(json, factoryManager) {
        const state = super.fromJSON(json, factoryManager);
        state.customField1 = json.customField1 || 0;
        state.customField2 = json.customField2 || 'default';
        return state;
    }
}
```

### Delta Field Inheritance Chain

```
BaseGameState.getDeltaFields()
    Returns: ['stateType', 'gamePhase']

TurnBasedGameState.getDeltaFields()
    Returns: [...super.getDeltaFields(), 'remainingMoves', 'turnPhase']
    Result: ['stateType', 'gamePhase', 'remainingMoves', 'turnPhase']

MyCustomGameState.getDeltaFields()
    Returns: [...super.getDeltaFields(), 'customField1', 'customField2']
    Result: ['stateType', 'gamePhase', 'remainingMoves', 'turnPhase', 'customField1', 'customField2']
```

---

## Best Practices

### 1. Never Modify Core Files

✅ **DO**: Create plugins in `src/js/plugins/`
❌ **DON'T**: Modify `BaseEventHandler`, `BaseGameEngine`, etc.

### 2. Use Proper Event Namespacing

```javascript
// Good: Namespaced events
'myGame:playerAction'
'myGame:uiUpdate'
'myGame:resourceChange'

// Bad: Generic events
'playerAction'
'update'
'change'
```

### 3. Always Include Delta Fields

If your game state has custom fields that change during gameplay, you MUST include them in `getDeltaFields()`:

```javascript
getDeltaFields() {
    return [
        ...super.getDeltaFields(),
        'anyFieldThatChanges'
    ];
}
```

### 4. Handle Cleanup Properly

```javascript
cleanup() {
    // Unregister event listeners
    if (this.eventHandler) {
        this.eventHandler.unregisterPluginEventHandler('myGame:event1');
        this.eventHandler.unregisterPluginEventHandler('myGame:event2');
    }

    // Clean up any timers, intervals, etc.
    if (this.gameTimer) {
        clearInterval(this.gameTimer);
    }

    console.log('[Plugin] MyCustomGame: Cleanup complete');
}
```

### 5. Validate Dependencies

```javascript
initialize(eventBus, registryManager, factoryManager) {
    // Check if required core systems exist
    if (!GameEngineFactory) {
        throw new Error('[MyPlugin] GameEngineFactory not available');
    }

    // Your registration code...
}
```

### 6. Provide Good Metadata

```javascript
static getPluginMetadata() {
    return {
        id: 'my-plugin',           // Unique ID (no spaces)
        name: 'My Custom Game',    // Display name
        version: '1.0.0',          // Semantic versioning
        description: 'Detailed description of what this plugin adds',
        author: 'Your Name',
        tags: ['strategy', 'multiplayer'], // Searchable tags
        isDefault: false,          // Set to true only for core plugins
        dependencies: ['core'],    // Required plugins
        provides: {
            actions: ['CUSTOM_ACTION'],
            triggers: ['on_custom_event'],
            effects: ['custom_effect'],
            components: ['CustomUIComponent']
        }
    };
}
```

---

## Plugin Checklist

Before publishing your plugin, verify:

- [ ] Plugin extends `Plugin` base class
- [ ] `getPluginMetadata()` returns complete metadata
- [ ] All game components registered in `initialize()`
- [ ] Event handlers registered in `setEventHandler()`
- [ ] Custom game state implements `getDeltaFields()`
- [ ] Custom game state implements `toJSON()` and `fromJSON()`
- [ ] `cleanup()` method properly cleans up resources
- [ ] No modifications to core files required
- [ ] Plugin file placed in `src/js/plugins/`
- [ ] Tested with host and client in multiplayer

---

## Troubleshooting

### Plugin Not Loading

**Check**: Is the plugin file in `src/js/plugins/`?
**Check**: Does the plugin export a default class?
**Check**: Does it extend `Plugin`?

### Event Handlers Not Working

**Check**: Did you implement `setEventHandler()`?
**Check**: Are you calling `super.setEventHandler(eventHandler)`?
**Check**: Is `registerPluginEventHandler` being called?

### State Not Synchronizing

**Check**: Did you implement `getDeltaFields()` in your game state?
**Check**: Are all changing fields included in the returned array?
**Check**: Did you call `...super.getDeltaFields()` to include parent fields?

### Game Engine Not Found

**Check**: Is the engine registered in `GameEngineFactory`?
**Check**: Does the board JSON reference the correct engine type?
**Check**: Is the plugin initialized before the game starts?

---

## Additional Resources

- See `TroublePlugin.js` for a complete working example
- See `DefaultCorePlugin.js` for examples of registering actions, triggers, and effects
- See the architecture documents in `docs/` for system design details

---

## Support

If you encounter issues or have questions about plugin development, please:
1. Check existing plugins for examples
2. Review the architecture documentation
3. Open an issue on the project repository with the `plugin` label
