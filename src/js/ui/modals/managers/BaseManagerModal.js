import BaseModal from '../BaseModal.js';

/**
 * BaseManagerModal - common base for manager-style modals (plugin/map managers).
 * Provides the standard shell; subclasses handle content.
 */
export default class BaseManagerModal extends BaseModal {
    constructor(config = {}) {
        super(config);
    }
}
