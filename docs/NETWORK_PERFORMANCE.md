# Network Performance Guide

## Problem: Slow PeerJS Connection

If you're experiencing slow connection times (30+ seconds) when hosting or joining games, this is due to the PeerJS cloud signaling server being slow or unreachable.

### Symptoms
- Loading bar stuck on "Initializing network..." for 30+ seconds
- Console shows warnings like:
  ```
  [Network] PeerJS connection is taking unusually long: 5000ms
  [Network] This may indicate issues with the signaling server.
  ```
- Eventually connects but takes minutes instead of seconds

### Root Cause
PeerJS requires a "signaling server" to help peers discover each other and establish WebRTC connections. By default, PeerJS uses free public cloud servers which can be:
- Overloaded with traffic
- Geographically distant
- Rate-limited
- Experiencing downtime

## Solution: Local PeerServer (Recommended for Development)

For **instant** local network connections, run your own PeerServer:

### Quick Setup

1. **Install PeerServer globally:**
   ```bash
   npm install -g peer
   ```

2. **Start the server:**
   ```bash
   peerjs --port 9000 --key peerjs --path /myapp
   ```

   You should see:
   ```
   Started PeerServer on ::, port: 9000, path: /myapp
   ```

3. **Update NetworkConfig.js:**

   Open `src/js/networking/NetworkConfig.js` and replace the `PEER_CONFIG` with:

   ```javascript
   export const PEER_CONFIG = {
       host: 'localhost',
       port: 9000,
       path: '/myapp',
       key: 'peerjs',
       config: {
           iceServers: [
               { urls: 'stun:stun.l.google.com:19302' },
               { urls: 'stun:stun1.l.google.com:19302' }
           ],
           iceTransportPolicy: 'all',
           iceCandidatePoolSize: 10
       },
       debug: 2,
       pingInterval: 5000,
       serialization: 'json',
       reliable: true
   };
   ```

4. **Restart your application:**
   ```bash
   npm start
   ```

### Expected Performance

| Scenario | Without Local Server | With Local Server |
|----------|---------------------|-------------------|
| Localhost testing | 30-240 seconds | <1 second |
| Local network (same WiFi) | 10-60 seconds | <2 seconds |
| Internet | 5-30 seconds | 2-5 seconds |

## Alternative: Production PeerServer

For production deployments, you should run PeerServer on a VPS or cloud service:

### Docker Deployment

```dockerfile
FROM node:18-alpine
RUN npm install -g peer
EXPOSE 9000
CMD ["peerjs", "--port", "9000", "--key", "your-secret-key", "--path", "/myapp"]
```

### Configuration for Production

Update `NetworkConfig.js`:

```javascript
export const PEER_CONFIG = {
    host: 'your-domain.com',  // Your server domain
    port: 443,                 // Use HTTPS port
    path: '/myapp',
    key: 'your-secret-key',    // Strong secret key
    secure: true,              // Enable HTTPS
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            // Optional: Add TURN servers for better connectivity
            {
                urls: 'turn:your-turn-server.com:3478',
                username: 'user',
                credential: 'pass'
            }
        ],
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 10
    },
    debug: 0,  // Disable debug in production
    pingInterval: 5000,
    serialization: 'json',
    reliable: true
};
```

## Current Optimizations

The code includes several optimizations even when using the cloud server:

1. **Fast ICE servers**: Uses Google's high-performance STUN servers
2. **Parallel initialization**: Board loading happens while connecting
3. **Early timeout warnings**: Alerts at 5 seconds if connection is slow
4. **Performance labels**: Categorizes connections as FAST, NORMAL, SLOW, WARNING, ERROR
5. **Detailed logging**: Shows exactly where time is spent

## Monitoring Performance

Check the browser console for performance metrics:

```
[Network] Initializing PeerJS connection...
[Network] Using ICE servers: stun:stun.l.google.com:19302, ...
[Network] ✓ Peer connection established [FAST]: 847ms
[Network] Peer ID: 2bb422b8-f3d5-4d4e-9a5d-8f8e3e1c4d5e
[Performance] Parallel init completed in 851ms
[Performance] Managers initialized in 12ms
[Performance] Animations created in 5ms
[Performance] Game engine configured in 8ms
```

### Performance Labels

- **FAST** (<1s): Excellent - local server or great internet
- **NORMAL** (1-3s): Good - typical internet connection
- **SLOW** (3-5s): Acceptable - may have network congestion
- **WARNING** (5-30s): Poor - consider local PeerServer
- **ERROR** (>30s): Unacceptable - definitely use local PeerServer

## Troubleshooting

### "PeerJS connection is taking unusually long"
**Solution**: Set up a local PeerServer (see Quick Setup above)

### "Peer error: Could not connect to server"
**Causes**:
1. PeerServer isn't running (if using local server)
2. Wrong host/port in config
3. Firewall blocking port 9000

**Solution**:
- Verify PeerServer is running: `ps aux | grep peer`
- Check config matches server settings
- Open firewall: `sudo ufw allow 9000` (Linux)

### "Network connection established but peers can't see each other"
**Cause**: ICE/STUN/TURN server issues

**Solution**:
1. Check browser console for ICE candidate errors
2. Verify STUN servers are accessible
3. May need TURN server for restrictive NATs

### Performance still slow with local PeerServer
**Possible causes**:
1. Board loading is slow (check for large board files)
2. Manager initialization is slow
3. UI rendering is slow

**Debug**:
Check `[Performance]` logs to identify bottleneck:
```
[Performance] Parallel init completed in 851ms    ← PeerJS + Board
[Performance] Managers initialized in 12ms        ← Manager setup
[Performance] Animations created in 5ms            ← Animation setup
[Performance] Game engine configured in 8ms        ← Engine setup
```

## References

- [PeerJS Documentation](https://peerjs.com/docs/)
- [PeerServer Repository](https://github.com/peers/peerjs-server)
- [WebRTC Troubleshooting](https://webrtc.github.io/samples/)
