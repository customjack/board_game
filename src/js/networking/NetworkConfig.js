/**
 * NetworkConfig - PeerJS connection configuration
 *
 * Basic configuration that relies on PeerJS library defaults for ICE servers
 * and connection negotiation. This allows the library to handle updates
 * to STUN/TURN servers automatically.
 *
 * Key features:
 * - Uses default PeerJS cloud server and ICE configuration
 * - Debug mode for development troubleshooting
 * - Standard timeouts and retry settings
 */

export const PEER_CONFIG = {
    // PeerJS server configuration
    // Using default cloud PeerServer with default settings

    // Enable debug logging in development
    debug: process.env.NODE_ENV === 'development' ? 2 : 0,

    // Connection retry settings
    pingInterval: 5000,  // Ping every 5 seconds (default is 5000)

    // Serialization format (binary is faster but less debuggable)
    serialization: 'json',

    // Reliable data channel
    reliable: true
};

/**
 * For self-hosted PeerServer (fastest option for production):
 *
 * Uncomment and configure these options if you set up your own PeerServer:
 *
 * export const PEER_CONFIG = {
 *     host: 'your-peerserver-domain.com',
 *     port: 9000,
 *     path: '/myapp',
 *     secure: true,
 *     config: { ... ICE servers ... },
 *     debug: 2
 * };
 *
 * To run a local PeerServer for development:
 *
 * 1. Install: npm install -g peer
 * 2. Run: peerjs --port 9000 --key peerjs
 * 3. Update config above with host: 'localhost', port: 9000, key: 'peerjs'
 */

/**
 * Network performance timing thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
    // Warn if peer initialization takes longer than this (ms)
    PEER_INIT_WARNING: 5000,

    // Error if peer initialization takes longer than this (ms)
    PEER_INIT_ERROR: 30000,

    // Expected fast connection time for local network (ms)
    LOCAL_CONNECTION_EXPECTED: 1000,

    // Expected connection time for internet (ms)
    INTERNET_CONNECTION_EXPECTED: 3000
};

/**
 * Get performance threshold label
 */
export function getPerformanceLabel(duration) {
    if (duration < PERFORMANCE_THRESHOLDS.LOCAL_CONNECTION_EXPECTED) {
        return 'FAST';
    } else if (duration < PERFORMANCE_THRESHOLDS.INTERNET_CONNECTION_EXPECTED) {
        return 'NORMAL';
    } else if (duration < PERFORMANCE_THRESHOLDS.PEER_INIT_WARNING) {
        return 'SLOW';
    } else if (duration < PERFORMANCE_THRESHOLDS.PEER_INIT_ERROR) {
        return 'WARNING';
    } else {
        return 'ERROR';
    }
}
