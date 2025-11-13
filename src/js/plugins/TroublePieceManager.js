import BasePieceManager from '../controllers/managers/BasePieceManager.js';

export default class TroublePieceManager extends BasePieceManager {
    constructor(options = {}) {
        super(options);
        this.troubleState = null;
        this.handleStateUpdate = this.handleStateUpdate.bind(this);
        this.eventBus?.on('trouble:stateUpdated', this.handleStateUpdate);
    }

    destroy() {
        this.eventBus?.off('trouble:stateUpdated', this.handleStateUpdate);
        super.destroy();
    }

    handleStateUpdate(payload = {}) {
        this.troubleState = payload?.troubleState || payload;
        this.refreshFromLatestState();
    }

    buildRenderablePieces(gameState) {
        if (!this.troubleState?.pieces) {
            const players = Array.isArray(gameState?.players) ? gameState.players : [];
            return players.map(player => ({
                id: player.playerId,
                playerId: player.playerId,
                nickname: player.nickname,
                label: (player.nickname || player.playerId || '?').charAt(0).toUpperCase(),
                playerColor: player.playerColor || '#cccccc',
                spaceId: player.currentSpaceId || null
            }));
        }

        const players = new Map(
            (gameState?.players || []).map(player => [player.playerId, player])
        );

        return this.troubleState.pieces.map(pieceState => {
            const owner = players.get(pieceState.playerId);
            const nickname = owner?.nickname || pieceState.playerId;
            const label = String((pieceState.pieceIndex ?? 0) + 1);
            return {
                id: pieceState.id || `${pieceState.playerId}-${pieceState.pieceIndex}`,
                playerId: pieceState.playerId,
                nickname: `${nickname} ${label}`,
                label,
                playerColor: owner?.playerColor || '#fbbf24',
                spaceId: pieceState.spaceId || null
            };
        });
    }
}
