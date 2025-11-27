# Plugin Manager Architecture

## Overview
The Plugin Manager system provides a UI and architecture for managing game plugins, including viewing installed plugins, adding new plugins, and ensuring plugin synchronization between host and clients.

## Core Requirements

### 1. Plugin Manager Modal UI
- Replace "Upload Plugin" button with "Plugin Manager" button
- Modal displays:
  - List of all installed plugins with metadata
  - Each plugin shows: name, version, description, type, status (enabled/disabled)
  - Default plugins marked as non-toggleable with visual indicator
  - Form to add new plugins (future: CDN URL support)

### 2. Default (Core) Plugins
These plugins are essential to the game engine and cannot be disabled:

**Game System Plugins:**
- `DefaultActionsPlugin` - Core action types (PromptCurrentPlayer, TeleportPlayer, ModifyScore)
- `DefaultTriggersPlugin` - Core trigger types (OnEnter, OnLand, OnExit, Code)
- `DefaultEffectsPlugin` - Core player effect types (future)

**Engine Core Components** (to be registered as plugins):
- `GameEngineCore` - Main game engine
- `PhaseStateMachine` - Turn phase management
- `TurnManager` - Turn flow control
- `EventProcessor` - Event queue and execution
- `UIController` - UI state management
- `UIComponents` - DOM manipulation and rendering
- `AnimationSystem` - Visual animations

### 3. Plugin Metadata Schema
Each plugin must expose metadata via `getPluginMetadata()` static method:

```javascript
{
  id: "unique-plugin-id",           // Unique identifier
  name: "Plugin Display Name",       // Human-readable name
  version: "1.0.0",                  // Semantic version
  description: "Plugin description", // Brief description
  author: "Author Name",             // Plugin author
  type: "actions|triggers|effects|core", // Plugin category
  isDefault: true|false,             // Cannot be disabled if true
  dependencies: [],                  // Array of plugin IDs this depends on
  provides: {                        // What this plugin registers
    actions: ["ACTION_TYPE_1", "ACTION_TYPE_2"],
    triggers: ["TRIGGER_TYPE_1"],
    effects: []
  }
}
```

### 4. Plugin Synchronization (Future Phase)
- Host maintains authoritative plugin list
- When client connects, host sends required plugin list
- Client validates it has all required plugins
- If mismatch:
  - Host sends plugin metadata including CDN URL
  - Client displays warning with instructions to load missing plugins
  - Client can attempt auto-load via CDN (if supported)

## Implementation Plan

### Phase 1: UI and Default Plugin Registration (Current)
1. Create `PluginManager` class to centralize plugin management
2. Update all default plugins to expose `getPluginMetadata()` method
3. Register all core system components as "core" type plugins
4. Create Plugin Manager modal UI component
5. Update lobby button to open Plugin Manager modal
6. Display plugin list with toggle switches (disabled for default plugins)

### Phase 2: Plugin State Management
1. Add plugin enable/disable functionality
2. Persist plugin state in game settings
3. Handle plugin activation/deactivation lifecycle
4. Validate plugin dependencies before disabling

### Phase 3: Dynamic Plugin Loading (Future)
1. Implement CDN module loading system
2. Add plugin URL input in Plugin Manager
3. Validate and sandbox loaded plugins
4. Handle plugin load errors gracefully

### Phase 4: Host-Client Synchronization (Future)
1. Implement plugin manifest sharing on connection
2. Add client-side plugin validation
3. Display plugin mismatch warnings
4. Auto-download plugins from CDN (if enabled)

## File Structure

```
src/js/
├── pluginManagement/
│   ├── Plugin.js               # Base plugin class (exists)
│   ├── PluginManager.js        # NEW: Central plugin registry and manager
│   └── PluginMetadata.js       # NEW: Plugin metadata schema and validation
├── plugins/
│   ├── DefaultActionsPlugin.js
│   ├── DefaultTriggersPlugin.js
│   └── DefaultEffectsPlugin.js
├── ui/
│   └── PluginManagerModal.js   # NEW: Plugin manager UI component
└── gameEngine.js               # Register core components as plugins
```

## PluginManager API

```javascript
class PluginManager {
  constructor(factoryManager, eventBus, registryManager) {}

  // Registration
  registerPlugin(pluginClass) {}
  unregisterPlugin(pluginId) {}

  // Querying
  getAllPlugins() {}              // Returns all plugin metadata
  getPlugin(pluginId) {}          // Returns specific plugin
  getPluginsByType(type) {}       // Filter by type
  getDefaultPlugins() {}          // Returns non-toggleable plugins

  // State Management
  enablePlugin(pluginId) {}
  disablePlugin(pluginId) {}
  isPluginEnabled(pluginId) {}

  // Validation
  validateDependencies(pluginId) {}
  canDisablePlugin(pluginId) {}   // Check if safe to disable

  // Synchronization
  getPluginManifest() {}          // For host-client sync
  validatePluginManifest(manifest) {} // Client validation
}
```

## UI Mockup

```
┌─────────────────────────────────────────────┐
│  Plugin Manager                        [X]  │
├─────────────────────────────────────────────┤
│                                             │
│  Installed Plugins                          │
│  ┌─────────────────────────────────────┐   │
│  │ DefaultActionsPlugin      [CORE]    │   │
│  │ Version 1.0.0                       │   │
│  │ Core action types for game events   │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ DefaultTriggersPlugin     [CORE]    │   │
│  │ Version 1.0.0                       │   │
│  │ Core trigger types for game events  │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ CustomPlugin              [●] ON    │   │
│  │ Version 2.1.0                       │   │
│  │ Custom actions for special events   │   │
│  │ [Disable]                           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Add New Plugin (Coming Soon)               │
│  ┌─────────────────────────────────────┐   │
│  │ Plugin URL: [________________]      │   │
│  │ [Load Plugin]                       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│              [Close]                        │
└─────────────────────────────────────────────┘
```

## Migration Notes

- Existing plugins (DefaultActionsPlugin, DefaultTriggersPlugin) already extend Plugin.js
- Need to add `getPluginMetadata()` static method to each
- Core system components currently not registered as plugins - need refactor
- No breaking changes to existing plugin architecture
- Plugin Manager is additive - doesn't break existing functionality

## Testing Strategy

1. Unit tests for PluginManager class
2. Integration tests for plugin enable/disable
3. UI tests for Plugin Manager modal
4. End-to-end tests for plugin synchronization (future)
5. Test plugin dependency validation
6. Test that default plugins cannot be disabled

## Security Considerations

1. Validate plugin metadata schema
2. Sandbox dynamic plugin execution (future)
3. Verify plugin signatures (future)
4. Limit plugin permissions to registered factories only
5. Prevent plugin conflicts (duplicate IDs, circular dependencies)
