# PeerJS Connection Test

## Quick Test to Verify PeerJS is the Bottleneck

### How to Run the Test

1. **Open the test page:**
   ```bash
   npm start
   ```
   Then navigate to: `http://localhost:9000/test-peerjs-connection.html`

   OR just open the file directly in your browser:
   ```bash
   open test-peerjs-connection.html
   # or on Linux:
   xdg-open test-peerjs-connection.html
   ```

2. **Click "Test Default Cloud Server"**
   - This tests the exact same configuration your app was using
   - Watch the timer and status messages
   - If it takes >5 seconds, PeerJS cloud is the bottleneck ✓

3. **Click "Test with Custom STUN"**
   - This tests with optimized STUN servers (what your app now uses)
   - Should be slightly faster but still may be slow
   - If still >5 seconds, confirms signaling server is the issue ✓

### Expected Results

**If PeerJS cloud is the problem (likely):**
```
⚠️ WARNING: Connection taking unusually long (5000ms)
⚠️ VERY SLOW - Connected in 234565ms
DIAGNOSIS: PeerJS cloud server is SLOW.
SOLUTION: Use a local PeerServer for development.
```

**If connection is fast (<1s):**
```
✓ EXCELLENT - Connected in 847ms
Peer ID: abc123...
```
This would mean the problem is elsewhere (unlikely based on your logs).

### What This Test Does

This is a **minimal isolated test** that:
- ✅ Uses the exact same PeerJS library (v1.5.4)
- ✅ Uses the same connection configuration
- ✅ Has NO other code (no game loading, no UI, no managers)
- ✅ Measures ONLY the PeerJS signaling server connection time
- ✅ Rules out any issues with your application code

If this test is slow, it **definitively proves** the PeerJS cloud signaling server is the bottleneck, not your code.

### Next Steps After Confirming

Once you confirm PeerJS is slow:

1. **For instant localhost testing:**
   ```bash
   npm install -g peer
   peerjs --port 9000 --key peerjs --path /myapp
   ```

2. **Update NetworkConfig.js:**
   Uncomment the local server configuration block and update it to:
   ```javascript
   export const PEER_CONFIG = {
       host: 'localhost',
       port: 9000,
       path: '/myapp',
       key: 'peerjs',
       config: {
           iceServers: [
               { urls: 'stun:stun.l.google.com:19302' }
           ]
       },
       debug: 2
   };
   ```

3. **Restart your app:**
   ```bash
   npm start
   ```

Expected result: Connection in <1 second instead of 4+ minutes.

### Troubleshooting the Test

**"Test page won't load"**
- Make sure you're running `npm start` first
- Or open the HTML file directly (it loads PeerJS from CDN)

**"Nothing happens when I click the button"**
- Open browser console (F12) to see any errors
- Check if you have an ad blocker blocking PeerJS CDN

**"Test fails immediately"**
- Could be firewall blocking WebRTC
- Try from a different network
- Check browser console for specific errors
