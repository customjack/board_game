/**
 * ConnectionStatusManager - Handles connection monitoring and reconnection logic
 *
 * Features:
 * - Monitors connection health via heartbeats
 * - Automatic reconnection with exponential backoff
 * - Connection status modal with user feedback
 * - Manual disconnect option
 */

import ModalUtil from '../../infrastructure/utils/ModalUtil.js';
import ConnectionStatusModal from '../../ui/modals/status/ConnectionStatusModal.js';

export default class ConnectionStatusManager {
    constructor(peer) {
        this.peer = peer;

        // Connection state
        this.isConnected = true;
        this.reconnectDisabled = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.reconnectDelay = 1000; // Start with 1 second
        this.backoffSchedule = [1000, 5000, 25000]; // Explicit backoff steps
        this.maxReconnectDelay = 25000;

        // Heartbeat tracking
        this.lastHeartbeatTime = Date.now();
        this.heartbeatTimeout = 25000; // 25 seconds without heartbeat = disconnected (matches client timeout)
        this.heartbeatCheckInterval = 2000; // Check every 2 seconds

        // Modal state
        this.statusModal = null;
        this.isReconnecting = false;
        this.statusModalInstance = new ConnectionStatusModal({
            onDisconnect: () => this.handleManualDisconnect(),
            onReload: () => location.reload()
        });

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
        if (this.reconnectDisabled) return;
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
            const reachability = await this.performReconnect();
            if (reachability === false) {
                throw new Error('Host not reachable');
            }

            const heartbeatBefore = this.lastHeartbeatTime;

            // Wait a bit to see if heartbeat comes through
            await this.waitFor(2000);

            // Check if reconnected: require a NEW heartbeat since attempt started
            const heartbeatChanged = this.lastHeartbeatTime > heartbeatBefore;
            const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeatTime;

            if (heartbeatChanged && timeSinceLastHeartbeat < this.heartbeatTimeout) {
                // Success!
                this.handleReconnectSuccess();
                return;
            }

            // Failed, try again
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                this.handleReconnectFailure();
            } else {
                // Exponential backoff (scheduled)
                const delay = this.backoffSchedule[Math.min(this.reconnectAttempts - 1, this.backoffSchedule.length - 1)];

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
                const delay = this.backoffSchedule[Math.min(this.reconnectAttempts - 1, this.backoffSchedule.length - 1)];

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

            // Quick reachability probe to host peer server if available
            try {
                if (this.peer.peer?.socket?.ws?.readyState === 1) {
                    // Already open socket to PeerJS server, proceed
                } else if (typeof this.peer.peer?.socket?.start === 'function') {
                    this.peer.peer.socket.start();
                }
            } catch (e) {
                console.warn('[ConnectionStatus] Could not pre-open PeerJS socket', e);
            }

            // Create new connection
            this.peer.connectToHost();

            // If peerjs exposes open state, return false if server unreachable
            if (this.peer.peer && this.peer.peer.disconnected && this.peer.peer.destroyed) {
                return false;
            }
            return true;
        } else {
            // Host: wait for heartbeat to resume
            // The host doesn't need to reconnect, just wait for clients
            console.log('[ConnectionStatus] Host waiting for connection to resume...');
            return true;
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

        // Auto-close modal quickly so it doesn't linger on screen
        setTimeout(() => {
            this.hideStatusModal();
        }, 800);
    }

    handleReconnectFailure() {
        console.error('[ConnectionStatus] ✗ Reconnection failed after max attempts');

        this.isReconnecting = false;
        if (this.reconnectDisabled) return;

        this.updateModalStatus(
            'Connection Failed',
            'Could not reconnect to game. You may need to refresh the page.',
            false,
            true // Show reload button
        );

        setTimeout(async () => {
            this.hideStatusModal();
            await ModalUtil.alert('Disconnected from the host.');
            location.reload();
        }, 300);
    }

    async showStatusModal() {
        this.statusModalInstance.init();
        this.statusModalInstance.setStatus('Connection Lost', 'Attempting to reconnect...', { showSpinner: true });
        this.statusModalInstance.open();
        this.statusModal = this.statusModalInstance.content;
    }

    updateModalStatus(title, message, isSuccess = false, showReload = false) {
        if (!this.statusModalInstance) return;
        this.statusModalInstance.setStatus(title, message, {
            success: isSuccess,
            showReload,
            showSpinner: !(isSuccess || showReload)
        });
    }

    hideStatusModal() {
        if (this.statusModalInstance) {
            this.statusModalInstance.close();
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
