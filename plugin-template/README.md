# Drinking Board Game Plugin Template

This is a starter kit for creating plugins for the Drinking Board Game using Vite.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Development**:
    Run the build in watch mode to automatically rebuild when you make changes.
    ```bash
    npm run dev
    ```

3.  **Build for Production**:
    Build your plugin into a single file.
    ```bash
    npm run build
    ```
    The output file will be located at `dist/my-plugin.js`.

## How to Use Your Plugin

1.  Host the `dist/my-plugin.js` file (e.g., on GitHub Pages, a local server, or a CDN).
2.  In the Drinking Board Game, go to **Personal Settings** -> **Plugins**.
3.  Click **Add Plugin** and enter the URL of your hosted plugin file.

## Customizing Your Plugin

1.  **Edit `package.json`**: Update the `name`, `version`, and `description`.
2.  **Edit `vite.config.js`**: Update the `name` and `fileName` in the `build.lib` configuration.
3.  **Edit `src/MyPlugin.js`**: Implement your plugin logic here.
    - Update `getPluginMetadata()` with your plugin's details.
    - Implement `initialize()` to hook into the game engine.

## Plugin API

Your plugin class receives three managers in the `initialize` method:

*   **EventBus**: Publish and subscribe to game events.
*   **RegistryManager**: Access game registries (e.g., `PageRegistry`, `ListenerRegistry`).
*   **FactoryManager**: Access and extend game factories (e.g., `ActionFactory`, `EffectFactory`).

Happy coding!
