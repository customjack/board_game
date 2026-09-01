import BasePlaceholder from './BasePlaceholder.js';

export default class CurrentPlayerNamePlaceholder extends BasePlaceholder {
    static type = 'CURRENT_PLAYER_NAME';

    static getMetadata() {
        return {
            type: this.type,
            displayName: 'Current Player Name',
            description: 'Insert the current player nickname.',
            args: [],
            template: this.buildTemplate()
        };
    }

    static evaluate(args = [], context) {
        const currentPlayer = context?.gameState?.getCurrentPlayer?.();
        return currentPlayer?.nickname || 'Unknown Player';
    }
}
