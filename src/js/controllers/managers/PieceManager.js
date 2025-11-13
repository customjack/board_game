import BasePieceManager from './BasePieceManager.js';

export default class PieceManager extends BasePieceManager {
    buildRenderablePieces(gameState) {
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
}
