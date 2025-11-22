/**
 * BaseModal - Abstract base class for all modals
 *
 * Provides common functionality for modals:
 * - DOM creation (overlay, content container)
 * - Open/Close methods with animation support
 * - Event handling (close button, backdrop click)
 * - Tab navigation support
 */
import BaseUIComponent from '../BaseUIComponent.js';

export default class BaseModal extends BaseUIComponent {
    /**
     * Create a modal component
     * @param {Object} config - Component configuration
     * @param {string} config.id - Unique component identifier
     * @param {string} config.title - Modal title
     */
    constructor(config = {}) {
        super(config);
        this.title = config.title || 'Modal';
        this.modal = null;
        this.content = null;
        this.selectedTab = 'general';
    }

    /**
     * Initialize the modal
     */
    init() {
        if (this.initialized) return;

        // Create modal structure if it doesn't exist
        let modal = document.getElementById(this.id);
        if (!modal) {
            modal = this.createModalStructure();
            document.body.appendChild(modal);
        }

        this.modal = modal;
        // Default content to body if specific content area not found
        this.content = modal.querySelector('.settings-modal-content') || modal.querySelector('.settings-modal-body');
        this.container = modal;

        this.attachCommonListeners();

        super.init();
    }

    /**
     * Create the basic modal DOM structure
     * Matches SettingsModal.js structure
     * @returns {HTMLElement} The modal element
     */
    createModalStructure() {
        const modal = document.createElement('div');
        modal.id = this.id;
        modal.className = 'settings-modal-backdrop'; // Use settings modal class
        modal.style.display = 'none';

        modal.innerHTML = `
            <div class="settings-modal-container">
                <div class="settings-modal-header">
                    <h2>${this.title}</h2>
                    <div class="settings-modal-header-buttons">
                        <button class="button button-secondary settings-modal-close">×</button>
                    </div>
                </div>
                <div class="settings-modal-body">
                    <!-- Content injected by subclasses -->
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Attach common event listeners (close button, backdrop click)
     */
    attachCommonListeners() {
        // Close button
        const closeBtn = this.modal.querySelector('.settings-modal-close');
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', () => this.close());
        }

        // Close on backdrop click
        this.addEventListener(this.modal, 'click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.style.display === 'flex') {
                this.close();
            }
        });
    }

    /**
     * Open the modal
     */
    open() {
        if (!this.initialized) this.init();
        super.show();
        this.modal.style.display = 'flex';
        this.onOpen();
    }

    /**
     * Close the modal
     */
    close() {
        super.hide();
        if (this.modal) {
            this.modal.style.display = 'none';
        }
        this.onClose();
    }

    /**
     * Lifecycle hook: called when modal opens
     */
    onOpen() {
        // Override in subclasses
    }

    /**
     * Lifecycle hook: called when modal closes
     */
    onClose() {
        // Override in subclasses
    }

    /**
     * Render modal content (should be implemented by subclasses)
     */
    renderContent() {
        // Override in subclasses
    }
}
