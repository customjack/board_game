import BaseModal from './BaseModal.js';

/**
 * ConnectionStatusModal - lightweight status modal for connection events.
 * Uses the BaseModal shell for consistent positioning/styling.
 */
export default class ConnectionStatusModal extends BaseModal {
    constructor(config = {}) {
        super({
            id: config.id || 'connectionStatusModal',
            title: config.title || 'Connection Status'
        });
        this.onDisconnect = config.onDisconnect || null;
        this.onReload = config.onReload || null;
    }

    init() {
        super.init();
        this.render();
    }

    render() {
        if (!this.content) return;
        this.content.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';
        wrapper.style.gap = '10px';
        wrapper.style.padding = '16px';
        wrapper.style.width = 'min(360px, 90vw)';
        wrapper.style.textAlign = 'center';
        wrapper.style.margin = '0 auto';

        const title = document.createElement('h3');
        title.id = 'connectionStatusTitle';
        title.textContent = 'Connection Lost';
        title.style.margin = '0';
        wrapper.appendChild(title);

        const message = document.createElement('p');
        message.id = 'connectionStatusMessage';
        message.textContent = 'Attempting to reconnect...';
        message.style.margin = '0';
        message.style.color = 'var(--text-color-secondary, #aaa)';
        message.style.textAlign = 'center';
        wrapper.appendChild(message);

        const progress = document.createElement('div');
        progress.id = 'connectionStatusProgress';
        progress.style.display = 'flex';
        progress.style.alignItems = 'center';
        progress.style.justifyContent = 'center';
        progress.style.gap = '8px';
        progress.style.width = '100%';

        const spinner = document.createElement('div');
        spinner.className = 'connection-status-spinner';
        spinner.style.width = '24px';
        spinner.style.height = '24px';
        spinner.style.border = '3px solid rgba(255, 255, 255, 0.2)';
        spinner.style.borderTopColor = 'var(--accent-color, #4caf50)';
        spinner.style.borderRadius = '50%';
        spinner.style.animation = 'spin 1s linear infinite';
        progress.appendChild(spinner);
        wrapper.appendChild(progress);

        const actions = document.createElement('div');
        actions.id = 'connectionStatusActions';
        actions.style.display = 'flex';
        actions.style.gap = '8px';
        actions.style.justifyContent = 'center';

        const disconnectBtn = document.createElement('button');
        disconnectBtn.id = 'connectionDisconnectBtn';
        disconnectBtn.className = 'button button-secondary';
        disconnectBtn.textContent = 'Disconnect';
        disconnectBtn.addEventListener('click', () => {
            if (typeof this.onDisconnect === 'function') {
                this.onDisconnect();
            }
        });
        actions.appendChild(disconnectBtn);
        wrapper.appendChild(actions);

        this.content.appendChild(wrapper);
    }

    /**
     * Update the modal contents.
     * @param {string} title - Status title
     * @param {string} message - Status message
     * @param {Object} options - Status options
     * @param {boolean} options.success - Show success state
     * @param {boolean} options.showReload - Show reload button
     * @param {boolean} options.showSpinner - Show spinner
     */
    setStatus(title, message, { success = false, showReload = false, showSpinner = true } = {}) {
        const titleEl = this.content?.querySelector('#connectionStatusTitle');
        const messageEl = this.content?.querySelector('#connectionStatusMessage');
        const progress = this.content?.querySelector('#connectionStatusProgress');
        const actions = this.content?.querySelector('#connectionStatusActions');

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        if (progress) progress.style.display = showSpinner ? 'flex' : 'none';

        if (actions) {
            actions.innerHTML = '';

            if (showReload) {
                const reloadBtn = document.createElement('button');
                reloadBtn.id = 'connectionReloadBtn';
                reloadBtn.className = 'button button-primary';
                reloadBtn.textContent = 'Reload Page';
                reloadBtn.addEventListener('click', () => {
                    if (typeof this.onReload === 'function') {
                        this.onReload();
                    } else {
                        location.reload();
                    }
                });
                actions.appendChild(reloadBtn);
            }

            const disconnectBtn = document.createElement('button');
            disconnectBtn.id = 'connectionDisconnectBtn';
            disconnectBtn.className = showReload ? 'button button-secondary' : 'button button-primary';
            disconnectBtn.textContent = 'Disconnect';
            disconnectBtn.addEventListener('click', () => {
                if (typeof this.onDisconnect === 'function') {
                    this.onDisconnect();
                }
            });
            actions.appendChild(disconnectBtn);
        }

        if (success) {
            this.content?.classList.add('success');
        } else {
            this.content?.classList.remove('success');
        }
    }
}
