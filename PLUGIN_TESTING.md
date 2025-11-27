# Testing Remote Plugin Loading

This guide explains how to test the remote plugin loading system with the Trouble plugin.

## Quick Test (All-in-One)

The easiest way to test everything:

```bash
npm run test:plugin
```

This will:
1. Build the plugins
2. Start the CDN server (port 8080)
3. Start the PeerJS server (port 9000)
4. Start the webpack dev server (port 9001)

Then open your browser to `http://localhost:9001` and test loading the Trouble plugin.

## Step-by-Step Testing

### Option 1: Manual Steps (3 Terminal Windows)

**Terminal 1 - Build plugins:**
```bash
npm run build:plugins
```

**Terminal 2 - Start CDN server:**
```bash
npm run cdn:start
```
You should see:
```
🚀 CDN Server running at http://localhost:8080
📁 Serving plugins from: /path/to/dist/plugins
```

**Terminal 3 - Start the app:**
```bash
npm run dev:peer
```
Or if you don't need PeerJS:
```bash
npm start
```

### Option 2: Automated (Single Command)

```bash
npm run dev:cdn
```

This starts all three servers in one terminal. Press `Ctrl+C` to stop all of them.

## Testing the Plugin

Once everything is running:

### Method 1: Load via Map (Automatic)

1. Open the game in your browser (`http://localhost:9001`)
2. Click "Host Game" or "Join Game"
3. Go to Map Manager
4. Select "Trouble Classic" map
5. The plugin loading modal should appear automatically
6. The plugin should load from `http://localhost:8080/plugins/trouble-plugin.js`

### Method 2: Load via Plugin Manager (Manual)

1. Open the game in your browser
2. Go to **Personal Settings** → **Plugins**
3. Click **Add Plugin**
4. Enter URL: `http://localhost:8080/plugins/trouble-plugin.js`
5. Click **Add**
6. The plugin should load and appear in your plugin list

### Method 3: Direct URL Test

You can verify the CDN is serving the plugin correctly:

```bash
curl http://localhost:8080/plugins/trouble-plugin.js
```

Or open in browser: `http://localhost:8080/plugins/trouble-plugin.js`

You should see the bundled JavaScript code.

## What to Check

### ✅ Success Indicators

1. **CDN Server**: Console shows `[200] GET /plugins/trouble-plugin.js`
2. **Browser Console**: Should see:
   - `[PluginManager] Loading plugin from http://localhost:8080/plugins/trouble-plugin.js...`
   - `[Plugin] Trouble: Registered 1 game engine, 1 piece manager, 1 game state`
3. **Plugin Loading Modal**: Shows "Loaded X plugin(s), 0 failed"
4. **Map Loads**: "Trouble Classic" map loads without errors
5. **Engine Works**: Game engine type 'trouble' is found (no fallback warning)

### ❌ Common Issues

**Plugin not found (404):**
- Check that `dist/plugins/trouble-plugin.js` exists
- Rebuild: `npm run build:plugins`
- Verify CDN server is running

**CORS errors:**
- Make sure CDN server is running
- Check that you're using `localhost`, not `127.0.0.1`

**PluginBundle not initialized:**
- Make sure `app.js` calls `pluginManager.initializePluginBundle()`
- Check browser console for initialization errors

**Factory function not detected:**
- Verify plugin exports a function with 1 parameter
- Check that PluginBundle is initialized before loading plugins

**Module import errors:**
- Check browser console for detailed error messages
- Verify the plugin file is valid JavaScript
- Check that all dependencies are available in the bundle

## Development Workflow

For active development with auto-rebuild:

**Terminal 1:**
```bash
npm run watch:plugins
```
This rebuilds plugins automatically when you change files in `plugins/`

**Terminal 2:**
```bash
npm run cdn:start
```

**Terminal 3:**
```bash
npm run dev:peer
```

Now when you edit plugin files, they'll rebuild automatically. Refresh the browser to test the new version.

## Debugging

### Check Plugin Bundle

In browser console:
```javascript
// Check if bundle is initialized
window.__pluginBundle // Not exposed, but you can check in PluginManager
```

### Verify Plugin Loaded

In browser console:
```javascript
// Check loaded plugins
localStorage.getItem('remote_plugins')
```

### Test Plugin Directly

You can test loading the plugin directly in the browser console:
```javascript
// This is what PluginManager does internally
const module = await import('http://localhost:8080/plugins/trouble-plugin.js');
const PluginClass = module.default;
console.log(PluginClass);
```

## Next Steps

Once the plugin loads successfully:
1. Test the Trouble game mechanics
2. Verify multiplayer sync works
3. Test plugin removal and re-addition
4. Test with multiple remote plugins

