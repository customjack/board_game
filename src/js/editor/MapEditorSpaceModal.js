import BaseModal from '../ui/modals/BaseModal.js';

export default class MapEditorSpaceModal extends BaseModal {
    constructor(config = {}) {
        super({
            id: config.id || 'mapEditorSpaceEditor',
            title: config.title || 'Space',
            disableBackdropClose: true
        });
    }
}
