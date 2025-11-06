/**
 * ModalUtil - Utility for showing custom modals (replaces browser alert/confirm/prompt)
 *
 * Provides custom modal dialogs that integrate with the app's UI instead of
 * using browser-native alert(), confirm(), and prompt() functions.
 */

export default class ModalUtil {
    static activeModal = null;

    /**
     * Show an alert modal
     * @param {string} message - Message to display
     * @param {string} title - Modal title (optional)
     * @returns {Promise<void>} Resolves when modal is closed
     */
    static alert(message, title = 'Notice') {
        // Prevent multiple modals
        if (this.activeModal) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const modal = this.createModal({
                title,
                message,
                buttons: [
                    { text: 'OK', class: 'button button-primary', callback: () => resolve() }
                ]
            });

            this.showModal(modal);
        });
    }

    /**
     * Show a confirm modal
     * @param {string} message - Message to display
     * @param {string} title - Modal title (optional)
     * @returns {Promise<boolean>} Resolves to true if confirmed, false if canceled
     */
    static confirm(message, title = 'Confirm') {
        // Prevent multiple modals
        if (this.activeModal) {
            return Promise.resolve(false);
        }

        return new Promise((resolve) => {
            const modal = this.createModal({
                title,
                message,
                buttons: [
                    { text: 'Cancel', class: 'button button-secondary', callback: () => resolve(false) },
                    { text: 'OK', class: 'button button-primary', callback: () => resolve(true) }
                ]
            });

            this.showModal(modal);
        });
    }

    /**
     * Show a prompt modal
     * @param {string} message - Message to display
     * @param {string} defaultValue - Default input value (optional)
     * @param {string} title - Modal title (optional)
     * @returns {Promise<string|null>} Resolves to input value if submitted, null if canceled
     */
    static prompt(message, defaultValue = '', title = 'Input') {
        // Prevent multiple modals
        if (this.activeModal) {
            return Promise.resolve(null);
        }

        return new Promise((resolve) => {
            const modal = this.createModal({
                title,
                message,
                hasInput: true,
                inputValue: defaultValue,
                buttons: [
                    { text: 'Cancel', class: 'button button-secondary', callback: () => resolve(null) },
                    { text: 'OK', class: 'button button-primary', callback: (input) => resolve(input) }
                ]
            });

            this.showModal(modal);

            // Focus input if present
            const input = modal.querySelector('input');
            if (input) {
                input.focus();
                input.select();
            }
        });
    }

    /**
     * Create a modal element
     * @param {Object} config - Modal configuration
     * @returns {HTMLElement} Modal element
     */
    static createModal(config) {
        const modal = document.createElement('div');
        modal.className = 'modal custom-modal';
        modal.style.display = 'block';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        // Title
        const titleEl = document.createElement('h2');
        titleEl.textContent = config.title;
        modalContent.appendChild(titleEl);

        // Message
        const messageEl = document.createElement('p');
        messageEl.textContent = config.message;
        modalContent.appendChild(messageEl);

        // Input (for prompt)
        let input = null;
        if (config.hasInput) {
            input = document.createElement('input');
            input.type = 'text';
            input.value = config.inputValue || '';
            input.className = 'modal-input';
            modalContent.appendChild(input);
        }

        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'modal-buttons';

        config.buttons.forEach(buttonConfig => {
            const button = document.createElement('button');
            button.textContent = buttonConfig.text;
            button.className = buttonConfig.class;
            button.addEventListener('click', () => {
                const inputValue = input ? input.value : null;
                this.closeModal(modal);
                buttonConfig.callback(inputValue);
            });
            buttonContainer.appendChild(button);
        });

        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);

        // Handle Enter key for input
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const okButton = config.buttons.find(b => b.text === 'OK');
                    if (okButton) {
                        this.closeModal(modal);
                        okButton.callback(input.value);
                    }
                }
            });
        }

        return modal;
    }

    /**
     * Show a modal
     * @param {HTMLElement} modal - Modal element to show
     */
    static showModal(modal) {
        this.activeModal = modal;
        document.body.appendChild(modal);

        // Click outside to close (optional - disabled for now to prevent accidental closes)
        // modal.addEventListener('click', (e) => {
        //     if (e.target === modal) {
        //         this.closeModal(modal);
        //     }
        // });
    }

    /**
     * Close and remove a modal
     * @param {HTMLElement} modal - Modal element to close
     */
    static closeModal(modal) {
        modal.style.display = 'none';
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
        this.activeModal = null;
    }
}
