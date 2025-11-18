// src/js/controllers/menus/BaseMenu.js

export default class BaseMenu {
    constructor(modalId) {
        this.modal = document.getElementById(modalId); // The modal element ID
        if (!this.modal) {
            throw new Error(`Modal with ID ${modalId} not found!`);
        }
    }

    // Show the modal
    show() {
        this.modal.style.display = 'flex'; // Flex to center the modal
    }

    // Hide the modal
    hide() {
        this.modal.style.display = 'none';
    }

    // Toggle modal visibility
    toggle() {
        if (this.modal.style.display === 'none' || this.modal.style.display === '') {
            this.show();
        } else {
            this.hide();
        }
    }
}
