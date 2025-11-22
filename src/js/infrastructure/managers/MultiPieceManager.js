import BasePieceManager from './BasePieceManager.js';

/**
 * MultiPieceManager - renders multiple pieces per player and forwards clicks to the engine.
 */
export default class MultiPieceManager extends BasePieceManager {
    buildRenderablePieces(gameState) {
        const players = Array.isArray(gameState?.players) ? gameState.players : [];
        const renderables = [];

        players.forEach(player => {
            const pieces = Array.isArray(player.pieces) ? player.pieces : [];
            pieces.forEach((piece, index) => {
                renderables.push({
                    id: piece.id,
                    playerId: player.playerId,
                    nickname: player.nickname,
                    label: piece.label || String(index + 1),
                    playerColor: piece.color || player.playerColor || '#cccccc',
                    spaceId: piece.currentSpaceId || null,
                    isSelectable: Boolean(piece.isSelectable),
                    onSelect: () => {
                        this.eventBus?.emit('pieceClicked', {
                            pieceId: piece.id,
                            playerId: player.playerId
                        });
                    }
                });
            });
        });

        return renderables;
    }
}
