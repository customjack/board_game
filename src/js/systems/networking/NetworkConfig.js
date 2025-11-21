/**
 * NetworkConfig - PeerJS connection configuration
 *
 * Supports custom PeerJS server configuration via environment variables.
 * Falls back to default PeerJS cloud server if not configured.
 *
 * Environment variables:
 * - PEERJS_HOST: Custom PeerServer host (e.g., 'localhost' or 'myserver.com')
 * - PEERJS_PORT: Custom PeerServer port (e.g., 9000)
 * - PEERJS_PATH: Custom PeerServer path (e.g., '/myapp')
 * - PEERJS_SECURE: Use secure connection (true/false, default: true for production)
 * - PEERJS_KEY: PeerServer API key (optional)
 *
 * Example .env file:
 * PEERJS_HOST=localhost
 * PEERJS_PORT=9000
 * PEERJS_PATH=/peerjs
 * PEERJS_KEY=peerjs
 */

// Build PeerJS configuration from environment variables
const buildPeerConfig = () => {
    const config = {
        // Enable debug logging in development
        debug: process.env.NODE_ENV === 'development' ? 2 : 0,

        // Connection retry settings
        pingInterval: 5000,  // Ping every 5 seconds (default is 5000)

        // Serialization format (binary is faster but less debuggable)
        serialization: 'json',

        // Reliable data channel
        reliable: true
    };

    // Check if custom PeerServer is configured via environment variables
    const customHost = process.env.PEERJS_HOST;
    const customPort = process.env.PEERJS_PORT;
    const customPath = process.env.PEERJS_PATH;
    const customKey = process.env.PEERJS_KEY;
    const customSecure = process.env.PEERJS_SECURE;

    // If a local PeerServer is configured but we're not running on localhost,
    // ignore it so public builds (e.g., GitHub Pages) fall back to the cloud server.
    const isLocalHost =
        customHost === 'localhost' ||
        customHost === '127.0.0.1';
    const isRunningLocal =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    const shouldUseCustom = customHost && !(isLocalHost && !isRunningLocal);

    if (shouldUseCustom) {
        console.log('[NetworkConfig] Using custom PeerJS server:', customHost);
        config.host = customHost;

        if (customPort) {
            config.port = parseInt(customPort, 10);
        }

        if (customPath) {
            config.path = customPath;
        }

        if (customKey) {
            config.key = customKey;
        }

        // Set secure based on environment variable or default to true for non-localhost
        if (customSecure !== undefined) {
            config.secure = customSecure === 'true';
        } else {
            config.secure = customHost !== 'localhost' && customHost !== '127.0.0.1';
        }
    } else {
        console.log('[NetworkConfig] Using default PeerJS cloud server');
    }

    return config;
};

export const PEER_CONFIG = buildPeerConfig();

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
