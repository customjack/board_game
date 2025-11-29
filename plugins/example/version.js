import pkg from './package.json' assert { type: 'json' };

export const EXAMPLE_PLUGIN_VERSION = pkg.version;

export const EXAMPLE_PLUGIN_CDN = (version = EXAMPLE_PLUGIN_VERSION) =>
    `https://cdn.jsdelivr.net/gh/customjack/board_game_plugin_example@v${version}/dist/plugins/example-plugin.js`;

export const EXAMPLE_PLUGIN_REQUIREMENT = (version = EXAMPLE_PLUGIN_VERSION) => `^${version}`;
