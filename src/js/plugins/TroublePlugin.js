import Plugin from '../pluginManagement/Plugin.js';
import GameEngineFactory from '../factories/GameEngineFactory.js';
import TroubleGameEngine from '../engines/TroubleGameEngine.js';
import TroublePieceManager from '../pieceManagers/TroublePieceManager.js';

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

        let engineCount = 0;
        let pieceManagerCount = 0;
        let gameStateCount = 0;

        if (!GameEngineFactory.isRegistered('trouble')) {
            GameEngineFactory.register('trouble', TroubleGameEngine);
            engineCount++;
        }

        const pieceRegistry = registryManager.getPieceManagerRegistry?.();
        if (pieceRegistry && !pieceRegistry.get('trouble')) {
            pieceRegistry.register('trouble', TroublePieceManager);
            pieceManagerCount++;
        }

        if (!GameStateFactory.isRegistered('trouble')) {
            GameStateFactory.register('trouble', TroubleGameState);
            gameStateCount++;
        }

        console.log(
            `[Plugin] Trouble: Registered ${engineCount} game engine, ${pieceManagerCount} piece manager, ${gameStateCount} game state`
        );
    }

    setEventHandler(eventHandler) {
        super.setEventHandler(eventHandler);

        // Register event handlers for Trouble-specific UI events
        if (eventHandler && typeof eventHandler.registerPluginEventHandler === 'function') {
            // When UI requests piece selection, forward as player action
            eventHandler.registerPluginEventHandler('trouble:uiSelectPiece', ({ playerId, pieceIndex }) => {
                eventHandler.handlePlayerAction({
                    playerId,
                    actionType: 'SELECT_PIECE',
                    actionData: { pieceIndex }
                });
            });

            // When UI requests dice roll, forward as player action
            eventHandler.registerPluginEventHandler('trouble:uiRollRequest', ({ playerId }) => {
                eventHandler.handlePlayerAction({
                    playerId,
                    actionType: 'ROLL_DICE',
                    actionData: {}
                });
            });

            console.log('[Plugin] Trouble: Registered event handlers');
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
