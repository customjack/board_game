import BaseRegistry from './BaseRegistry';

export default class PageRegistry extends BaseRegistry {
    constructor() {
        super();  // Initialize the BaseRegistry
    }

    // Register a page by its ID
    registerPage(pageId) {
        const pageEl = document.getElementById(pageId);
        this.register(pageId, pageEl);  // Use the base class's register method
    }

    // Show a specific page and hide others
    showPage(pageId) {
        Object.values(this.registry).forEach(page => page.style.display = 'none');
        const pageEl = this.get(pageId);  // Use the base class's get method
        if (pageEl) {
            pageEl.style.display = 'block';
        } else {
            console.warn(`Page with ID ${pageId} not found.`);
        }
    }

    // Hide all pages
    hideAllPages() {
        Object.values(this.registry).forEach(page => page.style.display = 'none');
    }
}
