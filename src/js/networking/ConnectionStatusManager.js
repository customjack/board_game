/**
 * ConnectionStatusManager - Handles connection monitoring and reconnection logic
 *
 * Features:
 * - Monitors connection health via heartbeats
 * - Automatic reconnection with exponential backoff
 * - Connection status modal with user feedback
 * - Manual disconnect option
 */

import ModalUtil from '../utils/ModalUtil.js';

export default class ConnectionStatusManager {
    constructor(peer) {
        this.peer = peer;

        // Connection state
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.reconnectDelay = 1000; // Start with 1 second
        this.maxReconnectDelay = 16000; // Max 16 seconds

        // Heartbeat tracking
        this.lastHeartbeatTime = Date.now();
        this.heartbeatTimeout = 10000; // 10 seconds without heartbeat = disconnected
        this.heartbeatCheckInterval = 2000; // Check every 2 seconds

        // Modal state
        this.statusModal = null;
        this.isReconnecting = false;

        // Timers
        this.heartbeatChecker = null;
        this.reconnectTimer = null;

        this.startMonitoring();
    }

    startMonitoring() {
        // Check heartbeat status periodically
        this.heartbeatChecker = setInterval(() => {
            this.checkConnectionHealth();
        }, this.heartbeatCheckInterval);

        console.log('[ConnectionStatus] Monitoring started');
    }

    markHeartbeatReceived() {
        this.lastHeartbeatTime = Date.now();

        // If we were reconnecting and got a heartbeat, we're back!
        if (this.isReconnecting) {
            this.handleReconnectSuccess();
        }
    }

    checkConnectionHealth() {
        const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeatTime;

        if (timeSinceLastHeartbeat > this.heartbeatTimeout && this.isConnected) {
            console.warn('[ConnectionStatus] No heartbeat received, connection appears lost');
            this.handleDisconnection();
        }
    }

    async handleDisconnection() {
        if (this.isReconnecting) return; // Already handling it

        this.isConnected = false;
        this.isReconnecting = true;
        this.reconnectAttempts = 0;

        console.log('[ConnectionStatus] Connection lost, starting reconnection attempts');

        await this.showStatusModal();
        this.attemptReconnect();
    }

    async attemptReconnect() {
        if (!this.isReconnecting) return;

        this.reconnectAttempts++;

        console.log(`[ConnectionStatus] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

        this.updateModalStatus(
            'Reconnecting...',
            `Attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts}`,
            false
        );

        try {
            // Try to reconnect
            await this.performReconnect();

            // Wait a bit to see if heartbeat comes through
            await this.waitFor(2000);

            // Check if reconnected
            const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeatTime;

            if (timeSinceLastHeartbeat < this.heartbeatTimeout) {
                // Success!
                this.handleReconnectSuccess();
                return;
            }

            // Failed, try again
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                this.handleReconnectFailure();
            } else {
                // Exponential backoff
                const delay = Math.min(
                    this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
                    this.maxReconnectDelay
                );

                this.updateModalStatus(
                    'Connection Lost',
                    `Retrying in ${(delay / 1000).toFixed(0)} seconds...`,
                    false
                );

                this.reconnectTimer = setTimeout(() => {
                    this.attemptReconnect();
                }, delay);
            }
        } catch (error) {
            console.error('[ConnectionStatus] Reconnect error:', error);

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                this.handleReconnectFailure();
            } else {
                const delay = Math.min(
                    this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
                    this.maxReconnectDelay
                );

                this.reconnectTimer = setTimeout(() => {
                    this.attemptReconnect();
                }, delay);
            }
        }
    }

    async performReconnect() {
        // Reconnection logic depends on peer type
        if (this.peer.constructor.name === 'Client') {
            // Client: try to reconnect to host
            console.log('[ConnectionStatus] Attempting to reconnect to host...');

            // Close existing connection if any
            if (this.peer.conn) {
                this.peer.conn.close();
            }

            // Create new connection
            this.peer.connectToHost();
        } else {
            // Host: wait for heartbeat to resume
            // The host doesn't need to reconnect, just wait for clients
            console.log('[ConnectionStatus] Host waiting for connection to resume...');
        }
    }

    handleReconnectSuccess() {
        console.log('[ConnectionStatus] ✓ Reconnection successful!');

        this.isConnected = true;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;

        this.updateModalStatus(
            'Reconnected!',
            'Connection restored successfully',
            true
        );

        // Auto-close modal after 2 seconds
        setTimeout(() => {
            this.hideStatusModal();
        }, 2000);
    }

    handleReconnectFailure() {
        console.error('[ConnectionStatus] ✗ Reconnection failed after max attempts');

        this.isReconnecting = false;

        this.updateModalStatus(
            'Connection Failed',
            'Could not reconnect to game. You may need to refresh the page.',
            false,
            true // Show reload button
        );
    }

    async showStatusModal() {
        // Create custom modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'connection-status-modal';
        modalContent.innerHTML = `
            <div class="connection-status-icon">⚠️</div>
            <h3 class="connection-status-title">Connection Lost</h3>
            <p class="connection-status-message">Attempting to reconnect...</p>
            <div class="connection-status-progress">
                <div class="connection-status-spinner"></div>
            </div>
            <div class="connection-status-actions">
                <button id="connectionDisconnectBtn" class="button button-secondary">
                    Disconnect
                </button>
            </div>
        `;

        // Store reference
        this.statusModal = modalContent;

        // Show using existing modal system
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'connectionStatusModal';
        modal.style.display = 'flex';

        const modalDialog = document.createElement('div');
        modalDialog.className = 'modal-content';
        modalDialog.appendChild(modalContent);

        modal.appendChild(modalDialog);
        document.body.appendChild(modal);

        // Add disconnect button handler
        const disconnectBtn = modalContent.querySelector('#connectionDisconnectBtn');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                this.handleManualDisconnect();
            });
        }
    }

    updateModalStatus(title, message, isSuccess = false, showReload = false) {
        if (!this.statusModal) return;

        const titleEl = this.statusModal.querySelector('.connection-status-title');
        const messageEl = this.statusModal.querySelector('.connection-status-message');
        const icon = this.statusModal.querySelector('.connection-status-icon');
        const progress = this.statusModal.querySelector('.connection-status-progress');
        const actions = this.statusModal.querySelector('.connection-status-actions');

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;

        if (icon) {
            icon.textContent = isSuccess ? '✓' : '⚠️';
            icon.style.color = isSuccess ? 'var(--success-color, #28a745)' : 'var(--warning-color, #ffc107)';
        }

        if (progress) {
            progress.style.display = isSuccess || showReload ? 'none' : 'flex';
        }

        if (actions && showReload) {
            actions.innerHTML = `
                <button id="connectionReloadBtn" class="button button-primary">
                    Reload Page
                </button>
                <button id="connectionDisconnectBtn" class="button button-secondary">
                    Disconnect
                </button>
            `;

            actions.querySelector('#connectionReloadBtn')?.addEventListener('click', () => {
                location.reload();
            });

            actions.querySelector('#connectionDisconnectBtn')?.addEventListener('click', () => {
                this.handleManualDisconnect();
            });
        }
    }

    hideStatusModal() {
        const modal = document.getElementById('connectionStatusModal');
        if (modal) {
            modal.remove();
        }
        this.statusModal = null;
    }

    handleManualDisconnect() {
        console.log('[ConnectionStatus] User manually disconnected');

        this.isReconnecting = false;
        this.stopMonitoring();
        this.hideStatusModal();

        // Disconnect and reload
        if (this.peer.conn) {
            this.peer.conn.close();
        }
        if (this.peer.peer) {
            this.peer.peer.destroy();
        }

        // Show message and reload
        setTimeout(async () => {
            await ModalUtil.alert('Disconnected from game. Returning to home page.');
            location.reload();
        }, 100);
    }

    stopMonitoring() {
        if (this.heartbeatChecker) {
            clearInterval(this.heartbeatChecker);
            this.heartbeatChecker = null;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    destroy() {
        this.stopMonitoring();
        this.hideStatusModal();
    }

    // Utility
    waitFor(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
