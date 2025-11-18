/**
 * BoardInteractionMixin - Provides common board interaction patterns
 *
 * This mixin adds functionality for:
 * - Highlighting spaces on the board
 * - Setting up click handlers for space selection
 * - Managing space choice state
 *
 * Many game engines need to let players select spaces to move to.
 * This mixin provides reusable functionality for that pattern.
 */

export const BoardInteractionMixin = (Base) => class extends Base {
    constructor(...args) {
        super(...args);
        this.activeSpaceChoice = null;
    }

    /**
     * Highlight multiple spaces on the board
     * @param {Array<Space>} spaces - Spaces to highlight
     */
    highlightSpaces(spaces) {
        if (!spaces || spaces.length === 0) return;

        // Check if we have a board interaction component
        const boardInteraction = this.getUIComponent?.('boardInteraction');
        if (boardInteraction && boardInteraction.highlightSpaces) {
            boardInteraction.highlightSpaces(spaces);
            return;
        }

        // Fallback: direct DOM manipulation
        spaces.forEach(space => {
            const element = this.getSpaceElement(space.id);
            if (element) {
                element.classList.add('highlight');
            }
        });
    }

    /**
     * Remove highlights from all spaces
     */
    clearHighlights() {
        const boardInteraction = this.getUIComponent?.('boardInteraction');
        if (boardInteraction && boardInteraction.clearHighlights) {
            boardInteraction.clearHighlights();
            return;
        }

        // Fallback: direct DOM manipulation
        document.querySelectorAll('.highlight').forEach(el => {
            el.classList.remove('highlight');
        });
    }

    /**
     * Set up click handlers for space selection
     * @param {Array<Space>} spaces - Clickable spaces
     * @param {Function} onSelect - Callback when a space is selected
     */
    setupSpaceSelection(spaces, onSelect) {
        this.cleanupSpaceSelection();

        const handlers = new Map();

        spaces.forEach(space => {
            const element = this.getSpaceElement(space.id);
            if (!element) return;

            element.classList.add('selectable');

            const handler = () => {
                this.cleanupSpaceSelection();
                onSelect(space);
            };

            element.addEventListener('click', handler);
            handlers.set(space.id, { element, handler });
        });

        this.activeSpaceChoice = { spaces, handlers };
    }

    /**
     * Clean up active space selection
     */
    cleanupSpaceSelection() {
        if (!this.activeSpaceChoice) return;

        const { spaces = [], handlers = new Map() } = this.activeSpaceChoice;

        spaces.forEach(space => {
            const entry = handlers.get(space.id);
            if (entry?.element && entry.handler) {
                entry.element.removeEventListener('click', entry.handler);
                entry.element.classList.remove('selectable', 'highlight');
            }
        });

        this.activeSpaceChoice = null;
    }

    /**
     * Get DOM element for a space
     * @param {string} spaceId - Space identifier
     * @returns {HTMLElement|null}
     */
    getSpaceElement(spaceId) {
        return document.getElementById(`space-${spaceId}`);
    }
};
