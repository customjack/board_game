import Piece from '../../elements/models/Piece.js';
import { getVisibleElementById } from '../utils/helpers.js';

/**
 * BasePieceManager - Provides shared logic for rendering pieces on the board.
 *
 * Subclasses override buildRenderablePieces to return an array of simple
 * descriptors:
 * {
 *   id: string,              // globally unique piece identifier
 *   playerId: string,        // owning player id (for analytics/logging)
 *   nickname: string,        // display label basis
 *   label?: string,          // optional explicit label rendered inside piece
 *   playerColor: string,     // css color
 *   spaceId: string          // board space identifier
 * }
 */
export default class BasePieceManager {
    constructor({ eventBus } = {}) {
        this.eventBus = eventBus;
        this.pieces = new Map(); // id -> Piece instance
        this._pendingRenderables = null;
        this._signature = null;
        this._lastGameState = null;
    }

    destroy() {
        this.pieces.forEach(piece => piece.remove());
        this.pieces.clear();
        this._pendingRenderables = null;
        this._lastGameState = null;
    }

    shouldUpdatePieces(gameState) {
        const renderables = this.buildRenderablePieces(gameState);
        this._pendingRenderables = renderables;
        const signature = this.computeSignature(renderables);
        const changed = signature !== this._signature;
        if (changed) {
            this._signature = signature;
        }
        return changed;
    }

    updatePieces(gameState) {
        this._lastGameState = gameState;
        const renderables = this._pendingRenderables || this.buildRenderablePieces(gameState);
        this._pendingRenderables = null;
        this.applyRenderablePieces(renderables);
    }

    applyRenderablePieces(renderables) {
        const activeIds = new Set();
        renderables.forEach(snapshot => {
            if (!snapshot?.id) return;
            activeIds.add(snapshot.id);
            const existing = this.pieces.get(snapshot.id);
            if (existing) {
                existing.update(snapshot);
            } else {
                this.pieces.set(snapshot.id, new Piece(snapshot));
            }
        });

        for (const [id, piece] of this.pieces.entries()) {
            if (!activeIds.has(id)) {
                piece.remove();
                this.pieces.delete(id);
            }
        }

        this.renderAllPieces(renderables);
    }

    renderAllPieces(renderables) {
        const occupancy = this.buildOccupancyMap(renderables);

        for (const [id, piece] of this.pieces.entries()) {
            const data = piece.getData();
            if (!data?.spaceId) {
                piece.remove();
                this.pieces.delete(id);
                continue;
            }

            const spaceElement = getVisibleElementById(`space-${data.spaceId}`);
            if (!spaceElement) {
                piece.remove();
                continue;
            }

            const stack = occupancy.get(data.spaceId) || [];
            const index = stack.indexOf(id);
            piece.render(spaceElement, stack.length, index === -1 ? 0 : index);
        }
    }

    buildRenderablePieces(_gameState) {
        throw new Error('buildRenderablePieces must be implemented by subclasses');
    }

    computeSignature(renderables) {
        return renderables
            .map(snapshot => `${snapshot.id}:${snapshot.spaceId}`)
            .sort()
            .join('|');
    }

    buildOccupancyMap(renderables) {
        const map = new Map();
        renderables.forEach(snapshot => {
            if (!snapshot?.spaceId || !snapshot.id) return;
            if (!map.has(snapshot.spaceId)) {
                map.set(snapshot.spaceId, []);
            }
            map.get(snapshot.spaceId).push(snapshot.id);
        });
        return map;
    }

    refreshFromLatestState() {
        if (!this._lastGameState) return;
        const renderables = this.buildRenderablePieces(this._lastGameState);
        this._pendingRenderables = null;
        this._signature = this.computeSignature(renderables);
        this.applyRenderablePieces(renderables);
    }
}
