import { EXAMPLE_PLUGIN_VERSION, EXAMPLE_PLUGIN_CDN, EXAMPLE_PLUGIN_REQUIREMENT } from '../version.js';

export const demoBoard = {
    "$schema": "https://boardgame.example.com/schemas/game-v3.json",
    "version": EXAMPLE_PLUGIN_VERSION,
    "type": "game",
    "metadata": {
        "id": "demo-plugin-board",
        "name": "Demo Plugin Board",
        "author": "Plugin Example",
        "description": "Minimal board packaged with the example plugin",
        "plugins": [
            {
                "id": "example-everything-plugin",
                "version": EXAMPLE_PLUGIN_REQUIREMENT(),
                "source": "plugin-bundled"
            }
        ]
    },
    "requirements": {
        "plugins": [
            {
                "id": "core",
                "version": "^1.0.0",
                "source": "builtin",
                "description": "Core game functionality"
            },
            {
                "id": "example-everything-plugin",
                "version": EXAMPLE_PLUGIN_REQUIREMENT(),
                "source": "remote",
                "cdn": EXAMPLE_PLUGIN_CDN(),
                "name": "Example Everything Plugin",
                "description": "Registers dummy implementations for every extension point"
            }
        ],
        "minPlayers": 2,
        "maxPlayers": 4
    },
    "engine": {
        "type": "demo-engine",
        "config": {}
    },
    "ui": {
        "layout": "standard-board",
        "components": []
    },
    "board": {
        "topology": {
            "spaces": [
                {
                    "id": "start",
                    "name": "Start",
                    "type": "start",
                    "position": { "x": 200, "y": 200 },
                    "visual": { "size": 60, "color": "#ddeeff", "textColor": "#000000" },
                    "connections": [],
                    "triggers": []
                }
            ]
        }
    }
};
