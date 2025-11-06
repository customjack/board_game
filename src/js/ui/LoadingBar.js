/**
 * LoadingBar - Visual loading progress display
 *
 * Features:
 * - Animated progress bar
 * - Current task display
 * - Elapsed time display
 * - Detailed debug information
 */

export default class LoadingBar {
    constructor(containerId = 'loadingPage') {
        this.container = document.getElementById(containerId);
        this.progressBar = null;
        this.messageElement = null;
        this.detailsElement = null;
        this.progressElement = null;
        this.initialized = false;
    }

    /**
     * Initialize the loading bar UI
     */
    init() {
        if (this.initialized || !this.container) {
            return;
        }

        // Create loading bar HTML
        const loadingHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-progress-container">
                    <div class="loading-progress-bar" id="loadingProgressBar"></div>
                </div>
                <div class="loading-message" id="loadingMessage">Initializing...</div>
                <div class="loading-details" id="loadingDetails"></div>
            </div>
        `;

        this.container.innerHTML = loadingHTML;

        // Get references
        this.progressBar = document.getElementById('loadingProgressBar');
        this.messageElement = document.getElementById('loadingMessage');
        this.detailsElement = document.getElementById('loadingDetails');

        this.initialized = true;
    }

    /**
     * Update progress
     * @param {Object} data - Progress data from LoadingProgressTracker
     */
    update(data) {
        if (!this.initialized) {
            this.init();
        }

        // Update progress bar
        if (this.progressBar) {
            this.progressBar.style.width = `${data.percent}%`;
        }

        // Update message
        if (this.messageElement) {
            this.messageElement.textContent = data.message;
        }

        // Update details
        if (this.detailsElement) {
            this.detailsElement.textContent = `Stage ${data.stageIndex + 1}/${data.totalStages} • ${data.elapsedMs}ms elapsed`;
        }
    }

    /**
     * Show completion
     */
    complete(message = 'Ready!') {
        if (this.progressBar) {
            this.progressBar.style.width = '100%';
        }

        if (this.messageElement) {
            this.messageElement.textContent = message;
        }
    }

    /**
     * Clear the loading bar
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.initialized = false;
    }
}
