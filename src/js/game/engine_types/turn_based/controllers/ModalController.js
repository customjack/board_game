/**
 * ModalController - manages prompt modal timers and rendering
 */
export default class ModalController {
    constructor(promptModal, engine) {
        this.promptModal = promptModal;
        this.engine = engine;
        this.modalAutoDismissTimer = null;
        this.modalCountdownInterval = null;
    }

    clearAutoDismissTimer() {
        if (this.modalAutoDismissTimer) {
            clearTimeout(this.modalAutoDismissTimer);
            this.modalAutoDismissTimer = null;
        }
        if (this.modalCountdownInterval) {
            clearInterval(this.modalCountdownInterval);
            this.modalCountdownInterval = null;
        }
        const countdownEl = document.getElementById('gamePromptModalCountdown');
        if (countdownEl) {
            countdownEl.style.display = 'none';
            countdownEl.textContent = '';
        }
    }

    startModalCountdown(countdownEl, durationMs) {
        if (!countdownEl) return;
        const endTime = Date.now() + durationMs;
        countdownEl.style.display = 'block';

        const updateText = () => {
            const remainingMs = Math.max(0, endTime - Date.now());
            const remainingSeconds = Math.ceil(remainingMs / 1000);
            countdownEl.textContent = remainingSeconds > 0
                ? `Auto-closing in ${remainingSeconds}s`
                : 'Closing...';

            if (remainingMs <= 0) {
                clearInterval(this.modalCountdownInterval);
                this.modalCountdownInterval = null;
            }
        };

        updateText();
        this.modalCountdownInterval = setInterval(updateText, 250);
    }

    showPromptModal(message, callback) {
        const timeoutSeconds = this.engine.gameState?.settings?.getModalTimeoutSeconds?.() ?? 0;
        const timeoutMs = timeoutSeconds > 0 ? timeoutSeconds * 1000 : 0;

        this.promptModal.openWithMessage(message, { timeoutMs, trustedHtml: true }, () => {
            if (typeof callback === 'function' && this.engine.isClientTurn()) {
                callback();
            }
        });
    }
}
