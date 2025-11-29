# Example Everything Plugin

Standalone demonstration plugin that mirrors the Trouble plugin structure. It lives in its own package (`plugins/example`) with its own Rollup config and version helper so it can be built and hosted on a CDN independently.

What it registers:
- Game bits: custom game state (`demo-state`), game engine (`demo-engine`), piece manager, phase state machine, turn manager, event processor.
- Factories: demo action, trigger, effect, stat, UI controller, UI component, animation.
- Placeholders: `{{DEMO_PHRASE}}`, `{{DEMO_COUNTER}}`.
- Event handler hook: listens for `demo:ping` and routes to the demo action.
- Maps: bundled demo board via `createMapProvider`/`PluginMapProvider`.

Build for CDN (from `plugins/example/`):
- `npm install` (installs rollup deps for this package)
- `npm run build` -> `dist/plugins/example-plugin.js`

Local testing:
- From repo root run `npm run cdn:start` then load `http://localhost:8080/plugins/example-plugin.js` in map requirements.

Metadata:
- Plugin ID: `example-everything-plugin`
- Version: `1.0.0` (managed in `package.json` and exposed via `version.js`)

Sample requirements snippet:
```json
{
  "id": "example-everything-plugin",
  "version": "^1.0.0",
  "source": "remote",
  "cdn": "http://localhost:8080/plugins/example-plugin.js",
  "name": "Example Everything Plugin",
  "description": "Registers dummy implementations for every extension point"
}
```
