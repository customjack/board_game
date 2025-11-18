/**
 * CompactLogger - Utility for batching console logs into compact one-liners
 *
 * Instead of:
 *   Registered UI component type: RemainingMovesComponent
 *   Registered UI component type: PlayerListComponent
 *   Registered UI component type: RollButtonComponent
 *   ...
 *
 * Produces:
 *   Registered 6 UI components: RemainingMovesComponent, PlayerListComponent, RollButtonComponent, ...
 */

export default class CompactLogger {
    constructor() {
        this.batches = new Map();
    }

    /**
     * Add an item to a batch log
     * @param {string} category - Log category (e.g., 'UI component type')
     * @param {string} item - Item being registered
     */
    add(category, item) {
        if (!this.batches.has(category)) {
            this.batches.set(category, []);
        }
        this.batches.get(category).push(item);
    }

    /**
     * Flush a specific batch immediately
     * @param {string} category - Category to flush
     */
    flush(category) {
        const items = this.batches.get(category);
        if (!items || items.length === 0) return;

        const count = items.length;
        const itemList = items.join(', ');

        console.log(`Registered ${count} ${category}${count === 1 ? '' : 's'}: ${itemList}`);

        this.batches.delete(category);
    }

    /**
     * Flush all batches
     */
    flushAll() {
        for (const category of this.batches.keys()) {
            this.flush(category);
        }
    }

    /**
     * Get the current batch for a category
     * @param {string} category - Category name
     * @returns {Array} Items in the batch
     */
    getBatch(category) {
        return this.batches.get(category) || [];
    }
}

// Global instance for use across factories
export const globalLogger = new CompactLogger();

// Auto-flush on page load completion
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Small delay to catch any late registrations
        setTimeout(() => globalLogger.flushAll(), 100);
    });
}
