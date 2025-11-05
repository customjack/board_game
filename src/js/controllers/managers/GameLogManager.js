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
        const target = containerOrId !== null ? containerOrId : this.config.containerId;

        let resolvedContainer = null;
        if (typeof target === 'string') {
            resolvedContainer = document.getElementById(target) || null;
        } else if (target) {
            resolvedContainer = target;
        }

        if (resolvedContainer) {
            this.container = resolvedContainer;
            if (typeof this.container.innerHTML === 'undefined') {
                this.container = null;
            } else {
                this.container.innerHTML = '';
            }
        } else if (!this.container) {
            console.warn('GameLogManager: container not found for', target);
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

        // Filter out movement entries - only keep events
        if (entry.type === 'movement' || entry.type === 'movement-choice') {
            // Skip movement entries entirely
            return entry;
        }

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
        if (this.container && typeof this.container.scrollTop === 'number') {
            this.container.scrollTop = 0;
        }
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

        if (typeof this.container.scrollTop === 'number') {
            this.container.scrollTop = 0;
        }
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

        const headerItems = [];

        // Add turn number first if available
        if (entry.turnNumber != null && entry.turnNumber >= 0) {
            headerItems.push(`<span class="log-header-item log-turn-number">T${entry.turnNumber}</span>`);
        }

        headerItems.push(`<span class="log-header-item log-time">${this.escapeHtml(time)}</span>`);

        if (entry.playerName) {
            headerItems.push(`<span class="log-header-item log-player">${this.escapeHtml(entry.playerName)}</span>`);
        } else if (entry.playerId) {
            headerItems.push(`<span class="log-header-item log-player">P${this.escapeHtml(entry.playerId)}</span>`);
        }

        const typeLabel = this.getTypeLabel(entry.type);
        if (typeLabel) {
            headerItems.push(`<span class="log-header-item log-type">${this.escapeHtml(typeLabel)}</span>`);
        }

        const headerHtml = headerItems
            .filter(Boolean)
            .join('<span class="log-header-separator">•</span>');

        const message = this.escapeHtml(entry.message || '');
        const className = this.escapeClass(entry.type);

        return `
            <div class="log-entry log-entry-${className}">
                <div class="log-entry-header">${headerHtml}</div>
                <div class="log-entry-message">${message}</div>
            </div>
        `.trim();
    }

    getTypeLabel(type) {
        if (!type) return '';
        const map = {
            info: 'Info',
            'dice-roll': 'Dice Roll',
            'event-processing': 'Event',
            'movement': 'Movement',
            'movement-choice': 'Movement',
            'turn-start': 'Turn',
            'turn-end': 'Turn',
            'turn-skip': 'Turn',
            timer: 'Timer',
            system: 'System'
        };

        if (map[type]) {
            return map[type];
        }

        return type
            .split(/[-_\s]+/)
            .map(fragment => fragment.charAt(0).toUpperCase() + fragment.slice(1))
            .join(' ');
    }

    escapeClass(value) {
        if (!value) return 'info';
        return value.toString().replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
    }
}
