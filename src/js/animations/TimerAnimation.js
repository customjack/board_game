import {interpolateColor} from '../../infrastructure/utils/helpers'.js';

export default class TimerAnimation extends Animation {
    constructor(isHost = false) {
        super();
        this.duration = 0;
        this.remainingTime = 0;
        this.animationFrameId = null;
        this.callback = null;
        this.startTime = null;
        this.paused = false;
        this.pauseTime = null;
        this.isHost = isHost;
        this.pauseButton = null;
        this.pauseCallback = null;

        // DOM elements
        this.timerElement = null;
        this.progressRing = null;
        this.timerText = null;

        // Animation constants
        this.CRITICAL_TIME_PERCENTAGE = 0.10;
        this.FADE_FREQUENCY = 2;
        this.MIN_ALPHA = 0.5;
        this.MAX_ALPHA = 1.0;
    }

    init(pauseCallback = null, timerDisabled = false) {
        // Create or find timer element
        this.timerElement = document.querySelector('.timer-container');
        
        if (!this.timerElement) {
            this.timerElement = document.createElement('div');
            this.timerElement.className = 'timer-container';
            this.timerElement.innerHTML = `
                <div class="timer-cap"></div>
                <div class="timer-body">
                    <div class="timer-container-ring"></div>
                    <div class="timer-progress-ring"></div>
                    <span class="timer-text">∞</span>
                </div>
            `;

            const gameSidebar = document.getElementById('gameSidebar') || document.body;
            gameSidebar.insertBefore(this.timerElement, gameSidebar.firstChild);
        }

        // Cache DOM elements
        this.progressRing = this.timerElement.querySelector('.timer-progress-ring');
        this.timerText = this.timerElement.querySelector('.timer-text');

        // Initialize progress ring
        this.progressRing.style.setProperty('--progress-percent', '100%');

        // Host-specific setup
        if (this.isHost && !timerDisabled) {
            this.pauseCallback = pauseCallback;
            this.createPauseButton();
        }

        // Handle infinite display
        if (timerDisabled) {
            this.duration = "infinity";
            this.updateTimerDisplay();
        }
    }

    createPauseButton() {
        this.pauseButton = document.createElement('button');
        this.pauseButton.className = 'button-pause';
        this.pauseButton.setAttribute('aria-label', 'Pause timer');
        this.pauseButton.innerHTML = this.getPauseIcon();

        this.timerElement.appendChild(this.pauseButton);

        this.timerElement.addEventListener('mouseenter', () => {
            this.pauseButton.classList.add('visible');
        });

        this.timerElement.addEventListener('mouseleave', () => {
            this.pauseButton.classList.remove('visible');
        });

        this.pauseButton.addEventListener('click', () => {
            this.pauseCallback?.();
        });
    }


    togglePauseButton() {
        if (this.paused) {
            this.pauseButton.setAttribute('aria-label', 'Play timer');
            this.pauseButton.innerHTML = this.getPlayIcon();
        } else {
            this.pauseButton.setAttribute('aria-label', 'Pause timer');
            this.pauseButton.innerHTML = this.getPauseIcon();
        }
    }


    start(options = {}, callback = () => {}) {
        console.log("Starting timer animation with options:", options);
        this.cleanup();

        this.duration = options.duration || 30;
        
        if (options.remainingTime !== undefined) {
            this.remainingTime = options.remainingTime;
            this.startTime = Date.now() - (this.duration - this.remainingTime) * 1000;
        } else {
            this.remainingTime = this.duration;
            this.startTime = Date.now();
        }

        this.callback = callback;
        this.paused = false;
        this.pauseTime = null;

        this.animate();
    }

    animate() {
        if (this.paused) return;

        const elapsed = (Date.now() - this.startTime) / 1000;
        this.remainingTime = Math.max(this.duration - elapsed, 0);

        this.updateTimerDisplay();

        if (this.remainingTime > 0) {
            this.animationFrameId = requestAnimationFrame(() => this.animate());
        } else {
            this.callback?.();
            this.cleanup();
        }
    }

    updateTimerDisplay() {
        if (this.duration === "infinity") {
            this.timerText.textContent = '∞';
            this.progressRing.style.opacity = '1';
            return;
        }

        const percent = this.remainingTime / this.duration;
        const displayPercent = Math.max(0, percent) * 100;
        this.timerText.textContent = `${Math.ceil(this.remainingTime)}s`;

        // Get colors from CSS variables
        const styles = getComputedStyle(document.documentElement);
        const successColor = styles.getPropertyValue('--color-success').trim();
        const warningColor = styles.getPropertyValue('--color-warning').trim();
        const dangerColor  = styles.getPropertyValue('--color-danger').trim();

        // Interpolate based on remaining time
        let progressColor;
        if (percent > 0.5) {
            const t = (1 - percent) * 2; // 0 at 100%, 1 at 50%
            progressColor = interpolateColor(successColor, warningColor, t);
        } else {
            const t = (0.5 - percent) * 2; // 0 at 50%, 1 at 0%
            progressColor = interpolateColor(warningColor, dangerColor, t);
        }

        // Animate gradient (shrinks counterclockwise)
        const disabledColor = styles.getPropertyValue('--color-disabled').trim();
        this.progressRing.style.background = `conic-gradient(${progressColor} ${displayPercent}%, ${disabledColor} ${displayPercent}%)`;


        // Flashing state under 10%
        if (percent <= 0.1) {
            this.progressRing.classList.add('timer-flashing');
        } else {
            this.progressRing.classList.remove('timer-flashing');
        }
    }


    pause() {
        if (!this.paused) {
            this.paused = true;
            this.pauseTime = Date.now();
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            if (this.isHost) this.togglePauseButton();
        }
    }

    resume() {
        if (this.paused) {
            const pausedDuration = Date.now() - this.pauseTime;
            this.startTime += pausedDuration;
            this.paused = false;
            this.pauseTime = null;
            this.animate();
            if (this.isHost) this.togglePauseButton();
        }
    }

    cleanup() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.paused = false;
        this.pauseTime = null;
    }

    getPauseIcon() {
        return `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" />
                <rect x="14" y="5" width="4" height="14" />
            </svg>
        `;
    }

    getPlayIcon() {
        return `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6,4 20,12 6,20" />
            </svg>
        `;
    }

}
