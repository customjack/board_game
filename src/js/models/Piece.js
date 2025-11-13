import { darkenColor, componentToHex } from '../utils/helpers';


export default class Piece {
    constructor(player) {
        this.player = player;
        this.element = null;  // DOM element representing the piece
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
            this.element.style.backgroundColor = this.player.playerColor; // Uses player color for piece color
            this.element.style.borderRadius = '50%';
            this.element.style.textAlign = 'center';
            this.element.style.color = '#000';
            this.element.style.lineHeight = '30px';
            this.element.style.zIndex = '3'; // Ensure it's above the board
            this.element.style.opacity = '0.75';  // Set transparency (0.7 = 70% opaque)
            const darkerBorderColor = darkenColor(this.player.playerColor, 0.75);
            this.element.style.border = `2px solid ${darkerBorderColor}`; // Use darker color for outline


            // Add click listener for piece interactions
            this.element.addEventListener('click', () => this.handlePieceClick());
        }

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
        this.element.style.left = `calc(50% + ${offsetX}px - 15px)`; // Center horizontally with offset
        this.element.style.top = `calc(50% + ${offsetY}px - 15px)`;  // Center vertically with offset
        this.element.innerText = this.player.nickname.charAt(0).toUpperCase(); // Display first letter of player's name (as this could change)

        // Append the piece to the space element if not already appended
        if (!this.element.parentElement || this.element.parentElement !== spaceElement) {
            spaceElement.appendChild(this.element);
        }
    }


    /**
     * Handles click interactions on the piece.
     */
    handlePieceClick() {
        // Add logic here for interactions, like displaying player info
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
