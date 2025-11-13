import Plugin from '../pluginManagement/Plugin.js';
import GameEngineFactory from '../factories/GameEngineFactory.js';
import TroubleGameEngine from '../engines/TroubleGameEngine.js';
import TroublePieceManager from './TroublePieceManager.js';

/**
 * TroublePlugin - Registers the Trouble (Pop-O-Matic) engine with the modular factory.
 *
 * The plugin is intentionally lightweight – it simply exposes the engine so that
 * boards referencing `engine.type = "trouble"` can be loaded without touching the
 * core plugin bundle.
 */
export default class TroublePlugin extends Plugin {
    initialize(eventBus, registryManager, factoryManager) {
        this.eventBus = eventBus;
        this.registryManager = registryManager;
        this.factoryManager = factoryManager;

        if (!GameEngineFactory.isRegistered('trouble')) {
            GameEngineFactory.register('trouble', TroubleGameEngine);
            console.log('[Plugin] Trouble: registered trouble game engine');
        }

        const pieceRegistry = registryManager.getPieceManagerRegistry?.();
        if (pieceRegistry && !pieceRegistry.get('trouble')) {
            pieceRegistry.register('trouble', TroublePieceManager);
            console.log('[Plugin] Trouble: registered trouble piece manager');
        }
    }

    cleanup() {
        console.log('[Plugin] Trouble: cleanup invoked');
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
            dependencies: ['core'],
            provides: {
                actions: [],
                triggers: [],
                effects: [],
                components: []
            }
        };
    }
}
