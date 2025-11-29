export const createDemoPieceManager = (BasePieceManager) =>
    class DemoPieceManager extends BasePieceManager {
        buildRenderablePieces() {
            return [];
        }
    };
