/**
 * SlotMachineAnimation - Slot machine rolling animation
 *
 * Numbers scroll vertically like a slot machine reel until landing on the result.
 */

import Animation from './Animation.js';

export default class SlotMachineAnimation extends Animation {
    constructor(options = {}) {
        super();
        this.canvas = null;
        this.ctx = null;
        this.animationFrameId = null;
        this.animationDuration = options.duration || 1500; // 1.5 seconds
        this.startTime = null;
        this.resultText = '';
        this.callback = null;

        // Slot machine properties
        this.slotWidth = 120;
        this.slotHeight = 160;
        this.numberHeight = 80;
        this.scrollOffset = 0;
        this.maxNumber = 20; // Show numbers 1-20 in the reel
        this.slotX = 0;
        this.slotY = 0;
    }

    init() {
        // No initialization needed
    }

    start(options = {}, callback = () => {}) {
        this.resultText = options.resultText || '?';
        this.callback = callback;

        this.initCanvas();

        this.startTime = performance.now();
        this.animate();
    }

    initCanvas() {
        // Create the canvas if it doesn't exist
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.style.position = 'fixed';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            this.canvas.style.pointerEvents = 'none';
            this.canvas.style.zIndex = '9999';
            document.body.appendChild(this.canvas);
        }

        // Set canvas size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.ctx = this.canvas.getContext('2d');

        // Calculate slot position (center of screen)
        this.slotX = this.canvas.width / 2 - this.slotWidth / 2;
        this.slotY = this.canvas.height / 2 - this.slotHeight / 2;
    }

    animate() {
        const currentTime = performance.now();
        const elapsed = currentTime - this.startTime;
        const progress = Math.min(elapsed / this.animationDuration, 1);

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (progress < 1) {
            // Spinning phase (first 80% of animation)
            if (progress < 0.8) {
                const spinProgress = progress / 0.8;

                // Fast scroll with easing (slows down over time)
                const spinSpeed = 40 * (1 - spinProgress * 0.8); // Slow down gradually
                this.scrollOffset -= spinSpeed;

                this.drawSlotMachine(false);
            } else {
                // Stopping phase (last 20% of animation)
                const stopProgress = (progress - 0.8) / 0.2;

                // Calculate final position to land on result
                const resultNumber = parseInt(this.resultText) || 1;
                const targetOffset = -((resultNumber - 1) * this.numberHeight);

                // Ease to final position
                const ease = 1 - Math.pow(1 - stopProgress, 3); // Ease-out cubic
                this.scrollOffset = this.scrollOffset + (targetOffset - this.scrollOffset) * ease * 0.3;

                this.drawSlotMachine(stopProgress > 0.9); // Show result in last bit
            }

            this.animationFrameId = requestAnimationFrame(() => this.animate());
        } else {
            // Animation complete
            const resultNumber = parseInt(this.resultText) || 1;
            this.scrollOffset = -((resultNumber - 1) * this.numberHeight);
            this.drawSlotMachine(true);

            setTimeout(() => {
                this.cleanup();
                if (this.callback) {
                    this.callback();
                }
            }, 500); // Show result for 0.5s before cleanup
        }
    }

    drawSlotMachine(showResult) {
        const ctx = this.ctx;
        const x = this.slotX;
        const y = this.slotY;
        const width = this.slotWidth;
        const height = this.slotHeight;

        // Draw slot machine frame
        ctx.save();

        // Outer frame (metallic look)
        ctx.fillStyle = '#444';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 4;
        this.roundRect(ctx, x - 10, y - 10, width + 20, height + 20, 15);
        ctx.fill();
        ctx.stroke();

        // Inner window (clip area for numbers)
        ctx.save();
        this.roundRect(ctx, x, y, width, height, 10);
        ctx.clip();

        // Background
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y, width, height);

        // Draw scrolling numbers
        this.drawNumbers(x, y, width, showResult);

        ctx.restore();

        // Window frame highlight
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        this.roundRect(ctx, x, y, width, height, 10);
        ctx.stroke();

        // Top and bottom gradient overlays (to show depth)
        const gradientTop = ctx.createLinearGradient(x, y, x, y + 30);
        gradientTop.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
        gradientTop.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradientTop;
        ctx.fillRect(x, y, width, 30);

        const gradientBottom = ctx.createLinearGradient(x, y + height - 30, x, y + height);
        gradientBottom.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradientBottom.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        ctx.fillStyle = gradientBottom;
        ctx.fillRect(x, y + height - 30, width, 30);

        // Center line indicator
        if (showResult) {
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 3;
            const centerY = y + height / 2;
            ctx.beginPath();
            ctx.moveTo(x, centerY);
            ctx.lineTo(x + width, centerY);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawNumbers(x, y, width, showResult) {
        const ctx = this.ctx;
        const centerY = y + this.slotHeight / 2;

        // Calculate which numbers to draw based on scroll offset
        const startIndex = Math.floor(-this.scrollOffset / this.numberHeight) - 2;
        const endIndex = startIndex + 6; // Draw 6 numbers visible in window

        for (let i = startIndex; i <= endIndex; i++) {
            // Wrap around to create infinite scroll effect
            let number = ((i % this.maxNumber) + this.maxNumber) % this.maxNumber + 1;

            const numberY = centerY + (i * this.numberHeight + this.scrollOffset);

            // Skip if outside visible area
            if (numberY < y - this.numberHeight || numberY > y + this.slotHeight) {
                continue;
            }

            // Draw number
            ctx.fillStyle = showResult && number === parseInt(this.resultText) ? '#e74c3c' : '#333';
            ctx.font = `bold ${this.numberHeight * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(number, x + width / 2, numberY);
        }
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    cleanup() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
            this.canvas = null;
            this.ctx = null;
        }
    }
}
