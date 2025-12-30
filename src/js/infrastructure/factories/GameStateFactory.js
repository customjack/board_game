import TurnBasedGameState from '../../game/engines/turn_based/state/TurnBasedGameState.js';
import BaseGameState from '../../game/state/BaseGameState.js';

export default class GameStateFactory {
    static stateRegistry = new Map([
        ['turn-based', TurnBasedGameState],
        ['base', BaseGameState]
    ]);

    static register(type, StateClass) {
        if (!type || typeof type !== 'string') {
            throw new Error('Game state type must be a non-empty string');
        }

        if (typeof StateClass !== 'function') {
            throw new Error('StateClass must be a constructor function');
        }

        this.stateRegistry.set(type, StateClass);
    }

    static unregister(type) {
        return this.stateRegistry.delete(type);
    }

    static isRegistered(type) {
        return this.stateRegistry.has(type);
    }

    static getRegisteredTypes() {
        return Array.from(this.stateRegistry.keys());
    }

    static determineStateType(board, explicitType = null) {
        if (explicitType) {
            return explicitType;
        }

        const metadata = board?.metadata || {};
        return metadata.gameState?.type ||
            board?.gameState?.type ||
            metadata.gameEngine?.stateType ||
            metadata.engine?.stateType ||
            board?.gameEngine?.stateType ||
            metadata.gameEngine?.type ||
            metadata.engine?.type ||
            board?.engine?.stateType ||
            board?.engine?.type ||
            'turn-based';
    }

    static create({
        type = null,
        board,
        factoryManager,
        players = [],
        settings,
        randomGenerator,
        selectedMapId = 'default',
        selectedMapData = null,
        pluginState = {},
        gameId = null
    } = {}) {
        if (!board) {
            throw new Error('Board is required to create a game state');
        }

        const resolvedType = this.determineStateType(board, type);
        const StateClass = this.stateRegistry.get(resolvedType) || this.stateRegistry.get('turn-based');

        if (!StateClass) {
            throw new Error(`No game state registered for type '${resolvedType}'`);
        }

        return new StateClass({
            board,
            factoryManager,
            players,
            settings,
            randomGenerator,
            selectedMapId,
            selectedMapData,
            pluginState,
            gameId
        });
    }

    static fromJSON(json, factoryManager) {
        const resolvedType = json?.stateType || 'turn-based';
        const StateClass = this.stateRegistry.get(resolvedType) || this.stateRegistry.get('turn-based');

        if (!StateClass || typeof StateClass.fromJSON !== 'function') {
            throw new Error(`Game state type '${resolvedType}' is not registered or cannot be deserialized`);
        }

        return StateClass.fromJSON(json, factoryManager);
    }
}

export { GameStateFactory };
