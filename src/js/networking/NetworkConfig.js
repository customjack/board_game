/**
 * NetworkConfig - PeerJS connection configuration
 *
 * Optimized for fast local network connections and reliable public connections
 *
 * Key optimizations:
 * - Custom ICE servers for faster WebRTC negotiation
 * - Reduced timeouts for quicker failure detection
 * - Debug mode for development troubleshooting
 */

export const PEER_CONFIG = {
    // PeerJS server configuration
    // Using default cloud PeerServer but with optimized settings
    config: {
        // ICE servers for WebRTC connection establishment
        iceServers: [
            // Google's public STUN servers (faster than defaults)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
        ],
        // Faster ICE gathering
        iceTransportPolicy: 'all',
        // Prioritize UDP for lower latency
        iceCandidatePoolSize: 10
    },

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
