import BaseSidebarWidget from './BaseSidebarWidget.js';

/**
 * TimerSidebarWidget - bridges TimerComponent into a sidebar widget contract
 */
export default class TimerSidebarWidget extends BaseSidebarWidget {
    constructor(timerComponent, options = {}) {
        super('timer', { order: options.order ?? 20 });
        this.timerComponent = timerComponent;
    }

    init() {
        if (!this.timerComponent || this.timerComponent.initialized) {
            // TimerComponent is initialized by UISystem; just mark widget as ready
            this.initialized = true;
            return;
        }
        this.timerComponent.init?.();
        this.initialized = true;
    }

    update(gameState) {
        if (!this.timerComponent) return;
        this.timerComponent.gameState = gameState;
        this.timerComponent.update?.(gameState);

        const timerEnabled = gameState?.settings?.turnTimerEnabled === true;
        const gameStarted = gameState?.isGameStarted?.() === true;
        const shouldShow = timerEnabled && gameStarted;

        const container = document.querySelector('.timer-container');
        if (!container) return;

        if (shouldShow) {
            container.style.display = '';
        } else {
            container.style.display = 'none';
            this.timerComponent.stopTimer?.();
        }
    }

    cleanup() {
        this.timerComponent?.cleanup?.();
        super.cleanup();
    }
}
