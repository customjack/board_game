import PromptBaseModal from './PromptBaseModal.js';

/**
 * PromptModal - simple message modal with optional countdown.
 */
export default class PromptModal extends PromptBaseModal {
    constructor(config = {}) {
        super({
            id: config.id || 'gamePromptModal',
            title: config.title || 'Message',
            disableBackdropClose: true
        });
        this.autoCloseMs = config.autoCloseMs || 0;
        this.onClose = config.onClose || null;
        this.countdownInterval = null;
        this._resolved = false;
        this._lastCallback = null;
        this._openToken = 0; // increments each time we show; guards against stale callbacks
    }

    init() {
        // Remove legacy DOM modal if present to avoid conflicting structure
        const existing = document.getElementById(this.id);
        if (existing) {
            existing.remove();
        }
        // Allow re-init by resetting flag if we removed the element
        this.initialized = false;
        super.init();

        // Hide/disable the close (X) button for prompt modals
        const closeBtn = this.modal?.querySelector('.settings-modal-close');
        if (closeBtn) {
            closeBtn.style.display = 'none';
            closeBtn.onclick = null;
        }

        // Tighten container sizing
        const container = this.modal?.querySelector('.settings-modal-container');
        if (container) {
            container.style.maxWidth = '512px';
            container.style.minWidth = '512px';
            container.style.width = 'auto';
            container.style.maxHeight = '80vh';
            container.style.minHeight = '120px';
            container.style.height = 'auto';
            container.style.padding = '20px';
        }

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
        wrapper.style.width = '100%';

        const messageEl = document.createElement('div');
        messageEl.id = 'gamePromptModalMessage';
        messageEl.style.textAlign = 'center';
        messageEl.style.display = 'block';
        wrapper.appendChild(messageEl);

        const countdown = document.createElement('div');
        countdown.id = 'gamePromptModalCountdown';
        countdown.style.display = 'none';
        countdown.style.color = 'var(--text-color-secondary, #aaa)';
        countdown.style.textAlign = 'center';
        countdown.style.display = 'block';
        wrapper.appendChild(countdown);

        const buttons = document.createElement('div');
        buttons.style.display = 'flex';
        buttons.style.justifyContent = 'center';
        buttons.style.alignItems = 'center';
        buttons.style.gap = '8px';
        buttons.style.marginTop = '4px';
        wrapper.appendChild(buttons);

        const dismiss = document.createElement('button');
        dismiss.id = 'gamePromptModalDismissButton';
        dismiss.className = 'button button-primary';
        dismiss.textContent = 'OK';
        dismiss.addEventListener('click', () => this.close(true));
        buttons.appendChild(dismiss);

        this.content.appendChild(wrapper);
    }

    setMessage(message, { trustedHtml = true } = {}) {
        const messageEl = this.content?.querySelector('#gamePromptModalMessage');
        if (!messageEl) return;
        if (trustedHtml) {
            messageEl.innerHTML = message;
        } else {
            messageEl.textContent = message;
        }
    }

    openWithMessage(message, { timeoutMs = 0, trustedHtml = true } = {}, callback) {
        // Bump token so older callbacks cannot resolve newer prompts
        this._openToken += 1;
        const token = this._openToken;

        console.debug('[PromptModal] openWithMessage', {
            token,
            hasCallback: typeof callback === 'function',
            timeoutMs
        });

        this.init();
        this.render(); // ensure fresh content each show
        this.setMessage(message, { trustedHtml });
        this._resolved = false;
        // Store callbacks in two slots so a UI re-render (host path rebuilds DOM) cannot
        // drop the resolver between open() and close(). _onResolved is the live one,
        // _lastCallback is the fallback used if _onResolved was cleared during reinit.
        this._onResolved = callback;
        this._lastCallback = callback;
        this._startCountdown(timeoutMs, callback, token);
        this.open();

        // Re-bind dismiss to this prompt token to avoid stale callback execution
        const dismissBtn = this.content?.querySelector('#gamePromptModalDismissButton');
        if (dismissBtn) {
            dismissBtn.onclick = () => {
                console.debug('[PromptModal] dismiss clicked', { token });
                this.close(true, callback, token);
            };
        }
    }

    _startCountdown(timeoutMs, callback, token) {
        const countdownEl = this.content?.querySelector('#gamePromptModalCountdown');
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        if (!timeoutMs || timeoutMs <= 0 || !countdownEl) return;

        let remaining = Math.ceil(timeoutMs / 1000);
        countdownEl.style.display = 'block';
        countdownEl.textContent = `Closing in ${remaining}s`;

        this.countdownInterval = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
                this.close(true, callback, token);
            } else {
                countdownEl.textContent = `Closing in ${remaining}s`;
            }
        }, 1000);
    }

    close(resolve = false, callbackOverride = null, token = null) {
        // Ignore closes for stale prompts (older token)
        if (token !== null && token !== this._openToken) {
            console.debug('[PromptModal] close ignored stale token', { token, current: this._openToken });
            return;
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        super.close();
        // Prefer override, then the live callback, then the last known one (protects host re-renders)
        const cb = callbackOverride || this._onResolved || this._lastCallback;
        if (!this._resolved && typeof cb === 'function') {
            this._resolved = true;
            if (resolve) {
                console.debug('[PromptModal] close -> resolve callback', { token: this._openToken });
                cb();
            }
        }
        this._onResolved = null;
    }
}
