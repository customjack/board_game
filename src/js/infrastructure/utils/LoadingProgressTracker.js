/**
 * LoadingProgressTracker - Modular loading progress tracking system
 *
 * Features:
 * - Track multiple loading stages
 * - Report detailed progress with current task
 * - Measure timing for performance analysis
 * - Pluggable progress callbacks
 */

export default class LoadingProgressTracker {
    constructor(stages = []) {
        this.stages = stages;
        this.currentStageIndex = 0;
        this.startTime = null;
        this.stageTimes = new Map();
        this.callbacks = [];
    }

    /**
     * Add a progress callback
     * Callback receives: { stage, stageIndex, totalStages, percent, message, elapsedMs }
     */
    onProgress(callback) {
        this.callbacks.push(callback);
        return this;
    }

    /**
     * Start tracking
     */
    start() {
        this.startTime = performance.now();
        this.currentStageIndex = 0;
        this.stageTimes.clear();

        if (this.stages.length > 0) {
            this.notifyProgress(this.stages[0], 0);
        }

        return this;
    }

    /**
     * Update to next stage
     */
    nextStage(customMessage = null) {
        if (this.currentStageIndex < this.stages.length - 1) {
            // Record time for completed stage
            const currentStage = this.stages[this.currentStageIndex];
            const stageEndTime = performance.now();
            const stageStartTime = this.stageTimes.get(currentStage) || this.startTime;
            const stageDuration = stageEndTime - stageStartTime;

            console.log(`[LoadingProgress] Completed: ${currentStage} (${stageDuration.toFixed(0)}ms)`);

            this.currentStageIndex++;
            const nextStage = this.stages[this.currentStageIndex];
            this.stageTimes.set(nextStage, performance.now());

            this.notifyProgress(nextStage, this.currentStageIndex, customMessage);
        }

        return this;
    }

    /**
     * Complete tracking
     */
    complete() {
        const totalTime = performance.now() - this.startTime;
        console.log(`[LoadingProgress] Total initialization time: ${totalTime.toFixed(0)}ms`);

        this.notifyProgress('Complete', this.stages.length, `Ready! (${totalTime.toFixed(0)}ms)`);

        return this;
    }

    /**
     * Notify all callbacks
     */
    notifyProgress(stage, stageIndex, customMessage = null) {
        const percent = this.stages.length > 0
            ? Math.round((stageIndex / this.stages.length) * 100)
            : 100;

        const elapsedMs = performance.now() - this.startTime;

        const progressData = {
            stage,
            stageIndex,
            totalStages: this.stages.length,
            percent,
            message: customMessage || stage,
            elapsedMs: elapsedMs.toFixed(0)
        };

        this.callbacks.forEach(callback => {
            try {
                callback(progressData);
            } catch (error) {
                console.error('LoadingProgressTracker callback error:', error);
            }
        });
    }

    /**
     * Get timing statistics
     */
    getStats() {
        const stats = {
            totalTime: performance.now() - this.startTime,
            stages: []
        };

        let previousTime = this.startTime;
        this.stages.forEach((stage, index) => {
            const stageTime = this.stageTimes.get(stage);
            if (stageTime) {
                const duration = index < this.stages.length - 1
                    ? (this.stageTimes.get(this.stages[index + 1]) || performance.now()) - stageTime
                    : performance.now() - stageTime;

                stats.stages.push({
                    name: stage,
                    duration: duration.toFixed(2),
                    percentOfTotal: ((duration / stats.totalTime) * 100).toFixed(1)
                });
            }
        });

        return stats;
    }
}

/**
 * Pre-defined stage configurations
 */
export const LOADING_STAGES = {
    HOST: [
        'Initializing network...',
        'Loading game board...',
        'Setting up UI components...',
        'Configuring game engine...',
        'Finalizing lobby...'
    ],

    CLIENT: [
        'Initializing network...',
        'Loading game board...',
        'Connecting to host...',
        'Setting up UI components...',
        'Configuring game engine...',
        'Joining lobby...'
    ]
};
