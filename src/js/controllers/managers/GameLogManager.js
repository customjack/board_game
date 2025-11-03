/**
 * GameLogManager - Handles user-facing game log entries and rendering.
 *
 * Responsibilities:
 * - Maintain a rolling history of important game events.
 * - Render the log into the website sidebar.
 * - Provide helper APIs (log, logPlayerAction, createLogger) so other modules can write to the log.
 * - Bridge external logging by listening for `gameLog:log` events on the shared EventBus.
 */
export default class GameLogManager {
    /**
     * @param {EventBus} eventBus - Shared event bus. Optional.
     * @param {Object} config - Optional configuration.
     * @param {number} config.maxEntries - Maximum entries retained in memory/rendered.
     * @param {string} config.containerId - Default DOM element id for the log container.
     */
    constructor(eventBus = null, config = {}) {
        this.eventBus = eventBus;
        this.config = {
            maxEntries: config.maxEntries || 80,
            containerId: config.containerId || 'gameLog'
        };

        this.entries = [];
        this.container = null;
        this.subscribers = new Set();
        this.eventBusHandler = null;

        if (this.eventBus) {
            this.eventBusHandler = (payload = {}) => {
                if (!payload || !payload.message) return;
                this.log(payload.message, payload);
            };
            this.eventBus.on('gameLog:log', this.eventBusHandler);
        }
    }

    /**
     * Attach the log manager to a DOM element so entries can be rendered.
     * @param {HTMLElement|string} containerOrId - Element instance or element id.
     */
    init(containerOrId = null) {
        const target = containerOrId || this.config.containerId;

        if (typeof target === 'string') {
            this.container = document.getElementById(target) || null;
        } else {
            this.container = target;
        }

        if (this.container && typeof this.container.innerHTML === 'undefined') {
            this.container.innerHTML = '';
        }

        this.render();
    }

    /**
     * Write an entry to the log.
     * @param {string} message - Human-readable message to display.
     * @param {Object} details - Additional metadata for the entry.
     * @returns {Object} The entry that was recorded.
     */
    log(message, details = {}) {
        if (typeof message !== 'string') {
            message = String(message);
        }

        const entry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
            message,
            playerId: details.playerId ?? null,
            playerName: details.playerName ?? null,
            turnNumber: details.turnNumber ?? null,
            phase: details.phase ?? null,
            source: details.source ?? null,
            type: details.type ?? 'info',
            metadata: details.metadata ? { ...details.metadata } : undefined
        };

        this.entries.push(entry);
        if (this.entries.length > this.config.maxEntries) {
            this.entries.splice(0, this.entries.length - this.config.maxEntries);
        }

        this.render();
        this.notifySubscribers(entry);
        return entry;
    }

    /**
     * Convenience helper for logging player-centric actions.
     * @param {Object|string} player - Player object or id.
     * @param {string} message - Message to record.
     * @param {Object} details - Optional metadata.
     */
    logPlayerAction(player, message, details = {}) {
        const playerId = typeof player === 'object' ? player?.playerId ?? player?.id ?? null : player;
        const playerName = typeof player === 'object' ? player?.nickname ?? player?.name ?? null : details.playerName ?? null;

        return this.log(message, {
            ...details,
            playerId,
            playerName,
            type: details.type ?? 'player-action'
        });
    }

    /**
     * Create a dedicated logger function for a specific source/feature.
     * @param {string} source - Identifier for the logger.
     * @param {Object} defaultDetails - Default metadata merged into every entry.
     * @returns {Function} Logger function (message, overrides?) => entry
     */
    createLogger(source, defaultDetails = {}) {
        return (message, overrides = {}) => this.log(message, {
            ...defaultDetails,
            ...overrides,
            source: overrides.source ?? source
        });
    }

    /**
     * Subscribe to new entries.
     * @param {Function} callback - Invoked with (entry, entriesSnapshot).
     * @returns {Function} Unsubscribe function.
     */
    subscribe(callback) {
        if (typeof callback !== 'function') {
            throw new Error('GameLogManager.subscribe expects a function callback');
        }
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    /**
     * Clear the log history and re-render.
     */
    clear() {
        this.entries = [];
        this.render();
    }

    /**
     * Get an immutable snapshot of current entries.
     * @returns {Array} Array of entry objects.
     */
    getEntries() {
        return this.entries.map(entry => ({ ...entry, metadata: entry.metadata ? { ...entry.metadata } : undefined }));
    }

    /**
     * Dispose listeners and references.
     */
    destroy() {
        if (this.eventBus && this.eventBusHandler) {
            this.eventBus.off('gameLog:log', this.eventBusHandler);
        }
        this.subscribers.clear();
        this.container = null;
    }

    /**
     * Notify subscribers of a new entry.
     * @private
     */
    notifySubscribers(entry) {
        if (this.subscribers.size === 0) return;
        const snapshot = this.getEntries();
        this.subscribers.forEach(callback => {
            try {
                callback(entry, snapshot);
            } catch (error) {
                console.error('GameLog subscriber callback failed:', error);
            }
        });
    }

    /**
     * Render the log into the DOM (if a container is attached).
     * @private
     */
    render() {
        if (!this.container || typeof this.container.innerHTML === 'undefined') return;

        const html = this.entries
            .slice()
            .reverse()
            .map(entry => this.formatEntryHtml(entry))
            .join('');

        this.container.innerHTML = html;
    }

    /**
     * Escape a string for safe HTML insertion.
     * @private
     */
    escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Build an HTML snippet for a log entry.
     * @private
     */
    formatEntryHtml(entry) {
        const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const parts = [
            `<span class="log-time">[${this.escapeHtml(time)}]</span>`
        ];

        if (entry.playerName) {
            parts.push(`<span class="log-player">${this.escapeHtml(entry.playerName)}</span>`);
        } else if (entry.playerId) {
            parts.push(`<span class="log-player">Player ${this.escapeHtml(entry.playerId)}</span>`);
        }

        parts.push(`<span class="log-message">${this.escapeHtml(entry.message)}</span>`);

        if (entry.source) {
            parts.push(`<span class="log-source">${this.escapeHtml(entry.source)}</span>`);
        }

        return `<div class="log-entry log-entry-${this.escapeHtml(entry.type)}">${parts.join(' ')}</div>`;
    }
}
