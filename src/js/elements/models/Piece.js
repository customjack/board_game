import { darkenColor } from '../infrastructure/utils/helpers';

export default class Piece {
    constructor(snapshot) {
        this.element = null;
        this.update(snapshot);
    }

    update(snapshot) {
        this.data = {
            id: snapshot.id,
            playerId: snapshot.playerId,
            nickname: snapshot.nickname || '',
            label: snapshot.label || (snapshot.nickname || snapshot.playerId || '?').charAt(0).toUpperCase(),
            playerColor: snapshot.playerColor || '#cccccc',
            spaceId: snapshot.spaceId || null
        };
    }

    getData() {
        return this.data;
    }

    /**
     * Renders the piece at the provided space element.
     * @param {HTMLElement} spaceElement - The DOM element of the space where the piece will be placed.
     * @param {number} totalPiecesAtSpace - Total number of pieces at this space.
     * @param {number} indexAtSpace - Index of this piece in the list of pieces at this space.
     */
    render(spaceElement, totalPiecesAtSpace, indexAtSpace) {
        if (!this.element) {
            this.element = document.createElement('div');
            this.element.classList.add('piece');

            // Style the piece
            this.element.style.position = 'absolute';
            this.element.style.width = '30px';
            this.element.style.height = '30px';
            this.element.style.backgroundColor = this.data.playerColor;
            this.element.style.borderRadius = '50%';
            this.element.style.textAlign = 'center';
            this.element.style.color = '#000';
            this.element.style.lineHeight = '30px';
            this.element.style.zIndex = '3'; // Ensure it's above the board
            this.element.style.opacity = '0.75';  // Set transparency (0.7 = 70% opaque)
            const darkerBorderColor = darkenColor(this.data.playerColor, 0.75);
            this.element.style.border = `2px solid ${darkerBorderColor}`;

            // Add click listener for piece interactions
            this.element.addEventListener('click', () => this.handlePieceClick());
        }
        this.element.style.backgroundColor = this.data.playerColor;
        const darkerBorderColor = darkenColor(this.data.playerColor, 0.75);
        this.element.style.border = `2px solid ${darkerBorderColor}`;

        // Calculate offset based on totalPiecesAtSpace and indexAtSpace
        let offsetX = 0;
        let offsetY = 0;
        if (totalPiecesAtSpace > 1) {
            const radius = 10; // Adjust radius as needed
            const angle = (2 * Math.PI) * (indexAtSpace / totalPiecesAtSpace);
            offsetX = radius * Math.cos(angle);
            offsetY = radius * Math.sin(angle);
        }

        // Set the position relative to the space element itself
        this.element.style.left = `calc(50% + ${offsetX}px - 15px)`;
        this.element.style.top = `calc(50% + ${offsetY}px - 15px)`;
        this.element.innerText = this.data.label;
        if (this.data.isSelectable) {
            this.element.style.boxShadow = '0 0 10px 2px rgba(255,255,255,0.8)';
            this.element.style.cursor = 'pointer';
        } else {
            this.element.style.boxShadow = '';
            this.element.style.cursor = 'default';
        }

        // Append the piece to the space element if not already appended
        if (!this.element.parentElement || this.element.parentElement !== spaceElement) {
            spaceElement.appendChild(this.element);
        }
    }


    /**
     * Handles click interactions on the piece.
     */
    handlePieceClick() {
        if (typeof this.data?.onSelect === 'function') {
            this.data.onSelect(this.data);
        }
    }

    /**
     * Removes the piece from the board.
     */
    remove() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}
