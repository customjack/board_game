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
     * Show a custom confirm modal with custom HTML content
     * @param {HTMLElement|string} content - Custom HTML element or message string
     * @param {string} title - Modal title
     * @param {string} confirmText - Confirm button text (default: 'OK')
     * @param {string} cancelText - Cancel button text (default: 'Cancel')
     * @returns {Promise<boolean>} Resolves to true if confirmed, false if canceled
     */
    static customConfirm(content, title = 'Confirm', confirmText = 'OK', cancelText = 'Cancel') {
        // Prevent multiple modals
        if (this.activeModal) {
            return Promise.resolve(false);
        }

        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal custom-modal';
            modal.style.display = 'block';

            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';

            // Title
            const titleEl = document.createElement('h2');
            titleEl.textContent = title;
            modalContent.appendChild(titleEl);

            // Content
            const contentEl = document.createElement('div');
            contentEl.className = 'modal-custom-content';
            if (typeof content === 'string') {
                contentEl.textContent = content;
            } else {
                contentEl.appendChild(content);
            }
            modalContent.appendChild(contentEl);

            // Buttons
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'modal-buttons';

            const cancelButton = document.createElement('button');
            cancelButton.textContent = cancelText;
            cancelButton.className = 'button button-secondary';
            cancelButton.addEventListener('click', () => {
                this.closeModal(modal);
                resolve(false);
            });

            const confirmButton = document.createElement('button');
            confirmButton.textContent = confirmText;
            confirmButton.className = 'button button-primary';
            confirmButton.addEventListener('click', () => {
                this.closeModal(modal);
                resolve(true);
            });

            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(confirmButton);
            modalContent.appendChild(buttonContainer);
            modal.appendChild(modalContent);

            this.showModal(modal);
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
     * Show a plugin loading result modal (success or error)
     * @param {boolean} success - Whether loading was successful
     * @param {string} message - Message to display
     * @param {string} details - Additional details (optional)
     * @param {string} title - Modal title (optional)
     * @returns {Promise<void>} Resolves when modal is closed
     */
    static pluginResult(success, message, details = null, title = null) {
        if (this.activeModal) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal custom-modal';
            modal.style.display = 'block';

            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';

            // Title
            const titleEl = document.createElement('h2');
            titleEl.textContent = title || (success ? 'Plugin Loaded Successfully' : 'Plugin Load Failed');
            titleEl.style.color = success ? '#4caf50' : '#f44336';
            modalContent.appendChild(titleEl);

            // Message
            const messageEl = document.createElement('p');
            messageEl.textContent = message;
            messageEl.style.marginBottom = details ? '12px' : '20px';
            messageEl.style.textAlign = 'center';
            modalContent.appendChild(messageEl);

            // Details (for errors)
            if (details) {
                const detailsEl = document.createElement('div');
                detailsEl.style.backgroundColor = '#2a2a2a';
                detailsEl.style.padding = '12px';
                detailsEl.style.borderRadius = '4px';
                detailsEl.style.marginTop = '12px';
                detailsEl.style.marginBottom = '20px';
                detailsEl.style.fontFamily = 'monospace';
                detailsEl.style.fontSize = '0.85em';
                detailsEl.style.color = '#ff6b6b';
                detailsEl.style.maxHeight = '200px';
                detailsEl.style.overflowY = 'auto';
                detailsEl.style.wordBreak = 'break-word';
                detailsEl.textContent = details;
                modalContent.appendChild(detailsEl);
            }

            // Button
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'modal-buttons';
            buttonContainer.style.justifyContent = 'center';

            const okButton = document.createElement('button');
            okButton.textContent = 'OK';
            okButton.className = success ? 'button button-primary' : 'button button-secondary';
            okButton.addEventListener('click', () => {
                this.closeModal(modal);
                resolve();
            });

            buttonContainer.appendChild(okButton);
            modalContent.appendChild(buttonContainer);
            modal.appendChild(modalContent);

            this.showModal(modal);
        });
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
