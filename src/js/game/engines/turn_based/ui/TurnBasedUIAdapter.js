/**
 * TurnBasedUIAdapter - bridges engine calls to UI implementations (current, legacy, components).
 */
export default class TurnBasedUIAdapter {
    constructor({ uiSystem, uiController, promptModal, getUIComponent }) {
        this.uiSystem = uiSystem || null;
        this.uiController = uiController || null;
        this.promptModal = promptModal || null;
        this.getUIComponent = getUIComponent || (() => null);
    }

    activateRollButton() {
        const rollButton = this.getUIComponent('rollButton');
        if (rollButton?.activate) return rollButton.activate();
        const btn = this.uiSystem?.getComponent?.('rollButton');
        if (btn?.activate) return btn.activate();
        this.uiController?.activateRollButton?.();
    }

    deactivateRollButton() {
        const rollButton = this.getUIComponent('rollButton');
        if (rollButton?.deactivate) return rollButton.deactivate();
        const btn = this.uiSystem?.getComponent?.('rollButton');
        if (btn?.deactivate) return btn.deactivate();
        this.uiController?.deactivateRollButton?.();
    }

    startTimer() {
        const timer = this.getUIComponent('timer') || this.uiSystem?.getComponent?.('timer');
        if (timer?.startTimer) return timer.startTimer();
        this.uiController?.startTimer?.();
    }

    stopTimer() {
        const timer = this.getUIComponent('timer') || this.uiSystem?.getComponent?.('timer');
        if (timer?.stopTimer) return timer.stopTimer();
        this.uiController?.stopTimer?.();
    }

    pauseTimer() {
        const timer = this.getUIComponent('timer') || this.uiSystem?.getComponent?.('timer');
        if (timer?.pauseTimer) return timer.pauseTimer();
        this.uiController?.pauseTimer?.();
    }

    resumeTimer() {
        const timer = this.getUIComponent('timer') || this.uiSystem?.getComponent?.('timer');
        if (timer?.resumeTimer) return timer.resumeTimer();
        this.uiController?.resumeTimer?.();
    }

    showRemainingMoves() {
        const remainingMoves = this.getUIComponent('remainingMoves') || this.uiSystem?.getComponent?.('remainingMoves');
        if (remainingMoves?.show) return remainingMoves.show();
        this.uiController?.showRemainingMoves?.();
    }

    hideRemainingMoves() {
        const remainingMoves = this.getUIComponent('remainingMoves') || this.uiSystem?.getComponent?.('remainingMoves');
        if (remainingMoves?.hide) return remainingMoves.hide();
        this.uiController?.hideRemainingMoves?.();
    }

    updateRemainingMoves(moves) {
        const remainingMoves = this.getUIComponent('remainingMoves') || this.uiSystem?.getComponent?.('remainingMoves');
        if (remainingMoves?.updateMoves) return remainingMoves.updateMoves(moves);
        this.uiController?.updateRemainingMoves?.(moves);
    }

    hideAllModals() {
        if (this.uiController) {
            this.uiController.hideAllModals();
        } else {
            this.promptModal?.close?.();
        }
    }

    updateUIFromGameState(gameState, peerId) {
        // Component-based UI handles updates via listeners. Legacy path only.
        this.uiController?.updateFromGameState?.(gameState, peerId);
    }

    initLegacyUI(callbacks) {
        this.uiController?.init?.(callbacks);
    }
}
