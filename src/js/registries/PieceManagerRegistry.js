import BaseRegistry from './BaseRegistry.js';

export default class PieceManagerRegistry extends BaseRegistry {
    create(type, options = {}) {
        const ManagerClass = this.get(type);
        if (!ManagerClass) {
            return null;
        }
        return new ManagerClass(options);
    }
}
