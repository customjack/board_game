import BaseModal from '../ui/modals/BaseModal.js';

export default class MapEditorConnectionModal extends BaseModal {
    constructor(config = {}) {
        super({
            id: config.id || 'mapEditorConnectionEditor',
            title: config.title || 'Connection',
            disableBackdropClose: true
        });
    }
}
