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
        this.content = modal.querySelector('.modal-content');
        this.container = modal; // BaseUIComponent expects this.container

        this.attachCommonListeners();

        super.init();
    }

    /**
     * Create the basic modal DOM structure
     * @returns {HTMLElement} The modal element
     */
    createModalStructure() {
        const modal = document.createElement('div');
        modal.id = this.id;
        modal.className = 'modal';
        modal.style.display = 'none';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${this.title}</h2>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body"></div>
            </div>
        `;

        return modal;
    }

    /**
     * Attach common event listeners (close button, backdrop click)
     */
    attachCommonListeners() {
        // Close button
        const closeBtn = this.modal.querySelector('.close-btn');
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', () => this.close());
        }

        // Close on backdrop click
        this.addEventListener(this.modal, 'click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }

    /**
     * Open the modal
     */
    open() {
        if (!this.initialized) this.init();
        this.show();
        this.modal.style.display = 'flex';
        this.onOpen();
    }

    /**
     * Close the modal
     */
    close() {
        this.hide();
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
     * Render tab navigation
     * @param {Array<{id: string, label: string}>} tabs - List of tabs
     * @param {HTMLElement} container - Container to append tabs to
     */
    renderTabs(tabs, container) {
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'modal-tabs';

        tabs.forEach(tab => {
            const btn = document.createElement('button');
            btn.className = `tab-btn ${this.selectedTab === tab.id ? 'active' : ''}`;
            btn.textContent = tab.label;
            btn.dataset.tab = tab.id;

            this.addEventListener(btn, 'click', () => this.switchTab(tab.id));

            tabsContainer.appendChild(btn);
        });

        container.appendChild(tabsContainer);
    }

    /**
     * Switch active tab
     * @param {string} tabId - ID of the tab to switch to
     */
    switchTab(tabId) {
        this.selectedTab = tabId;
        this.updateTabDisplay();
        this.renderContent();
    }

    /**
     * Update tab buttons visual state
     */
    updateTabDisplay() {
        const tabBtns = this.modal.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            if (btn.dataset.tab === this.selectedTab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Render modal content (should be implemented by subclasses)
     */
    renderContent() {
        // Override in subclasses
    }
}
