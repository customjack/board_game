/**
 * SettingsBaseModal - Base class for modals with sidebar navigation
 *
 * Extends BaseModal to provide a two-column layout:
 * - Left sidebar for navigation tabs
 * - Right content area for settings/info
 */
import BaseModal from '../BaseModal.js';

export default class SettingsBaseModal extends BaseModal {
    constructor(config = {}) {
        super(config);
        this.selectedTab = config.initialTab || 'general';
    }

    /**
     * Initialize the modal
     */
    init() {
        super.init();
        // Ensure sidebar is visible and setup
        this.setupSidebar();
    }

    /**
     * Create the modal structure with sidebar and content area
     * @returns {HTMLElement} The modal element
     */
    createModalStructure() {
        const modal = super.createModalStructure();
        const body = modal.querySelector('.settings-modal-body');

        if (body) {
            body.innerHTML = `
                <div class="settings-modal-sidebar" style="display: flex; flex-direction: column;"></div>
                <div class="settings-modal-content" id="${this.id}Content"></div>
            `;
        }

        return modal;
    }

    /**
     * Setup the sidebar layout
     */
    setupSidebar() {
        // No longer needed as it's handled in createModalStructure, 
        // but kept for safety if init calls it
    }

    /**
     * Render tab navigation
     * @param {Array<{id: string, label: string}>} tabs - List of tabs
     */
    renderTabs(tabs) {
        const sidebar = this.modal.querySelector('.settings-modal-sidebar');
        if (!sidebar) return;

        sidebar.innerHTML = '';

        // Ensure vertical layout
        sidebar.style.display = 'flex';
        sidebar.style.flexDirection = 'column';

        tabs.forEach(tab => {
            const navItem = document.createElement('div');
            navItem.className = 'settings-nav-item';
            if (this.selectedTab === tab.id) {
                navItem.classList.add('active');
            }
            navItem.textContent = tab.label;
            navItem.dataset.tab = tab.id;

            this.addEventListener(navItem, 'click', () => this.switchTab(tab.id));

            sidebar.appendChild(navItem);
        });
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
        const navItems = this.modal.querySelectorAll('.settings-nav-item');
        navItems.forEach(item => {
            if (item.dataset.tab === this.selectedTab) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
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
