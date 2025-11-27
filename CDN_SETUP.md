# Local CDN Setup for Plugin Testing

This guide explains how to set up a local CDN server to test remote plugin loading.

## Quick Start

1. **Build the plugins:**
   ```bash
   npm run build:plugins
   ```
   This will build all plugins from `plugins/` directory into `dist/plugins/`.

2. **Start the CDN server:**
   ```bash
   npm run cdn:start
   ```
   The server will start on `http://localhost:8080` and serve plugins from `dist/plugins/`.

3. **Test loading a plugin:**
   - Open your game in the browser
   - Go to Plugin Manager
   - Add a plugin with URL: `http://localhost:8080/plugins/trouble-plugin.js`
   - Or load a map that requires the plugin (e.g., "Trouble Classic")

## Available Endpoints

Once the CDN server is running, you can access:

- `http://localhost:8080/plugins/trouble-plugin.js` - Trouble game engine plugin
- `http://localhost:8080/plugins/example-plugin.js` - Example plugin (if built)

## File Structure

```
plugins/
  ├── trouble/
  │   └── index.js          # Plugin entry point
  └── example/
      └── index.js          # Example plugin entry point

dist/
  └── plugins/
      ├── trouble-plugin.js # Built plugin (ES module)
      └── example.js        # Built example plugin
```

## Building Plugins

The rollup configuration (`rollup.plugins.config.js`) builds plugins as ES modules:

- Input: `plugins/{name}/index.js`
- Output: `dist/plugins/{name}.js` (or `{name}-plugin.js` for trouble)

To watch for changes during development:
```bash
npm run watch:plugins
```

## Creating a New Plugin

1. Create a directory: `plugins/my-plugin/`
2. Create `plugins/my-plugin/index.js` with your plugin class
3. Add build config to `rollup.plugins.config.js`:
   ```js
   {
       input: 'plugins/my-plugin/index.js',
       output: {
           file: 'dist/plugins/my-plugin.js',
           format: 'es',
           sourcemap: true
       },
       plugins: [resolve(), commonjs()]
   }
   ```
4. Build: `npm run build:plugins`
5. Access at: `http://localhost:8080/plugins/my-plugin.js`

## Troubleshooting

### Port 8080 already in use
If you get an error that port 8080 is in use:
- Stop any other server using that port
- Or modify `PORT` in `scripts/start-cdn-server.js`

### Plugin not loading
- Check browser console for errors
- Verify the plugin file exists in `dist/plugins/`
- Check that the CDN server is running
- Verify the plugin exports a default class extending `Plugin`

### CORS errors
The CDN server includes CORS headers for local development. If you still see CORS errors:
- Make sure you're accessing from `localhost` (not `127.0.0.1`)
- Check that the CDN server is actually running

## Next Steps

To implement the full Trouble plugin:
1. Copy `src/deprecated/trouble/TroublePlugin.js` to `plugins/trouble/index.js`
2. Update imports to use relative paths from the plugin directory
3. Ensure all dependencies (TroubleGameEngine, etc.) are either:
   - Bundled with the plugin
   - Or available as external dependencies
4. Rebuild: `npm run build:plugins`

