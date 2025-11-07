/**
 * DiceRollAnimation - Simple, fast dice rolling animation
 *
 * A clean, modern dice roll animation that's quick and not too flashy.
 * Shows a 3D-style dice tumbling and landing on the result.
 */

import Animation from './Animation.js';

export default class DiceRollAnimation extends Animation {
    constructor(options = {}) {
        super();
        this.canvas = null;
        this.ctx = null;
        this.animationFrameId = null;
        this.animationDuration = options.duration || 1500; // 1.5 seconds (much faster than particle)
        this.startTime = null;
        this.resultText = '';
        this.callback = null;

        // Dice properties
        this.diceSize = 80;
        this.rotation = 0;
        this.rotationSpeed = 0.3;
        this.bounceHeight = 0;
        this.diceX = 0;
        this.diceY = 0;
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

        // Calculate dice position (center of screen)
        this.diceX = this.canvas.width / 2;
        this.diceY = this.canvas.height / 2;
    }

    animate() {
        const currentTime = performance.now();
        const elapsed = currentTime - this.startTime;
        const progress = Math.min(elapsed / this.animationDuration, 1);

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (progress < 1) {
            // Rolling phase (first 70% of animation)
            if (progress < 0.7) {
                const rollProgress = progress / 0.7;

                // Rotate the dice
                this.rotation += this.rotationSpeed * (1 - rollProgress); // Slow down over time

                // Bounce effect (parabolic)
                const bounceProgress = Math.sin(rollProgress * Math.PI * 3); // 3 bounces
                this.bounceHeight = bounceProgress * 100 * (1 - rollProgress); // Diminishing bounce

                this.drawRollingDice();
            } else {
                // Settling phase (last 30% of animation)
                const settleProgress = (progress - 0.7) / 0.3;

                // Small final bounce
                const finalBounce = Math.sin(settleProgress * Math.PI) * 20;
                this.bounceHeight = finalBounce;

                // Stop rotation
                this.rotation = 0;

                this.drawSettledDice();
            }

            this.animationFrameId = requestAnimationFrame(() => this.animate());
        } else {
            // Animation complete
            this.drawSettledDice();

            setTimeout(() => {
                this.cleanup();
                if (this.callback) {
                    this.callback();
                }
            }, 500); // Show result for 0.5s before cleanup
        }
    }

    drawRollingDice() {
        const ctx = this.ctx;
        const x = this.diceX;
        const y = this.diceY - this.bounceHeight;
        const size = this.diceSize;

        // Draw static shadow first (not affected by rotation/translation)
        ctx.save();
        ctx.globalAlpha = 0.3 * (1 - this.bounceHeight / 100); // Fade as dice goes up
        ctx.fillStyle = '#000';
        const shadowY = this.diceY + size / 2;
        ctx.fillRect(x - size / 2, shadowY, size, 10);
        ctx.restore();

        // Draw dice
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.rotation);

        // Draw dice cube with 3D effect
        this.drawDiceFace(0, 0, size);

        ctx.restore();
    }

    drawSettledDice() {
        const ctx = this.ctx;
        const x = this.diceX;
        const y = this.diceY - this.bounceHeight;
        const size = this.diceSize;

        // Draw static shadow
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000';
        const shadowY = this.diceY + size / 2;
        ctx.fillRect(x - size / 2, shadowY, size, 10);
        ctx.restore();

        // Draw dice
        ctx.save();
        ctx.translate(x, y);

        // Draw dice face
        this.drawDiceFace(0, 0, size);

        // Draw result number
        ctx.fillStyle = '#000';
        ctx.font = `bold ${size * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.resultText, 0, 0);

        ctx.restore();
    }

    drawDiceFace(x, y, size) {
        const ctx = this.ctx;
        const halfSize = size / 2;

        // Main dice face (white with rounded corners)
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;

        this.roundRect(ctx, x - halfSize, y - halfSize, size, size, 10);
        ctx.fill();
        ctx.stroke();

        // Add 3D effect (simple gradient)
        const gradient = ctx.createLinearGradient(
            x - halfSize, y - halfSize,
            x + halfSize, y + halfSize
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');

        ctx.fillStyle = gradient;
        this.roundRect(ctx, x - halfSize, y - halfSize, size, size, 10);
        ctx.fill();
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
