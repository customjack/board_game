# Custom PeerJS Server Setup

This guide explains how to configure the application to use your own PeerJS server instead of the default cloud server.

## Why Use a Custom PeerJS Server?

- **Reliability**: Default PeerJS cloud servers can be slow or unavailable
- **Performance**: Local/self-hosted servers are much faster (< 1s vs 3-30s connection time)
- **Control**: Full control over your signaling server
- **Privacy**: Keep your peer connections on your own infrastructure

## Quick Setup (Local Development)

### 1. Install PeerJS Server Globally

```bash
npm install -g peer
```

### 2. Run PeerJS Server

```bash
peerjs --port 9000 --key peerjs
```

The server will start on `http://localhost:9000`

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set:

```env
PEERJS_HOST=localhost
PEERJS_PORT=9000
PEERJS_PATH=/peerjs
PEERJS_KEY=peerjs
PEERJS_SECURE=false
```

### 4. Rebuild and Run

```bash
npm run build
npm start
```

You should see in the console:
```
[NetworkConfig] Using custom PeerJS server: localhost
[Network] ✓ Peer connection established [FAST]: 234ms
```

## Production Setup (Self-Hosted)

### Option 1: Using PeerJS Server with Docker

Create `docker-compose.yml`:

```yaml
version: '3'
services:
  peerjs:
    image: peerjs/peerjs-server
    ports:
      - "9000:9000"
    environment:
      - PORT=9000
```

Run:
```bash
docker-compose up -d
```

### Option 2: Using PeerJS Server with Node.js

Create `peerserver.js`:

```javascript
const { PeerServer } = require('peer');

const server = PeerServer({
  port: 9000,
  path: '/myapp',
  key: 'your-secret-key'
});

server.on('connection', (client) => {
  console.log('Client connected:', client.getId());
});

server.on('disconnect', (client) => {
  console.log('Client disconnected:', client.getId());
});
```

Run:
```bash
node peerserver.js
```

### Configure for Production

Edit `.env`:

```env
PEERJS_HOST=peerserver.yourdomain.com
PEERJS_PORT=443
PEERJS_PATH=/myapp
PEERJS_KEY=your-secret-key
PEERJS_SECURE=true
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `PEERJS_HOST` | Server hostname or IP | `localhost`, `192.168.1.100`, `peer.example.com` |
| `PEERJS_PORT` | Server port | `9000`, `443` |
| `PEERJS_PATH` | Server path | `/peerjs`, `/myapp` |
| `PEERJS_KEY` | API key (optional) | `peerjs`, `my-secret-key` |
| `PEERJS_SECURE` | Use HTTPS/WSS | `true`, `false` |

**Note**: If variables are not set, the application falls back to the default PeerJS cloud server.

## Troubleshooting

### Connection Slow or Failing

Check the browser console for performance metrics:
```
[Network] ✓ Peer connection established [SLOW]: 4523ms
```

Labels:
- **FAST** (< 1s): Excellent, local network
- **NORMAL** (1-3s): Good, internet connection
- **SLOW** (3-5s): Acceptable but could be improved
- **WARNING** (5-30s): Poor, consider using custom server
- **ERROR** (> 30s): Critical, server likely unreachable

### Common Issues

1. **"WebSocket connection failed"**
   - Check if PeerJS server is running
   - Verify `PEERJS_HOST` and `PEERJS_PORT` are correct
   - Check firewall settings

2. **"ERR_SSL_PROTOCOL_ERROR"**
   - Set `PEERJS_SECURE=false` for HTTP servers
   - Or set up SSL certificate for production

3. **"No handler for message type"**
   - Ensure all clients are using the same server
   - Check that server is not rate-limiting connections

## Testing Your Setup

1. Start your PeerJS server
2. Build and run the application: `npm run build && npm start`
3. Check browser console for connection message
4. Open app in two different browsers/tabs
5. Host a game and try to connect as a client
6. Connection should be nearly instant (< 1 second)

## Performance Comparison

| Server Type | Typical Connection Time |
|-------------|------------------------|
| Default PeerJS Cloud | 3-30 seconds |
| Local PeerJS Server | 0.2-1 second |
| Self-Hosted (Same Network) | 0.2-1 second |
| Self-Hosted (Remote) | 1-3 seconds |

## Security Considerations

- Always use `PEERJS_SECURE=true` in production
- Use a strong `PEERJS_KEY` for production
- Consider implementing rate limiting on your server
- Keep your `.env` file out of version control (already in `.gitignore`)
- Use environment-specific configuration (dev, staging, prod)

## Resources

- [PeerJS Documentation](https://peerjs.com/docs/)
- [PeerJS Server Repository](https://github.com/peers/peerjs-server)
- [WebRTC STUN/TURN Servers](https://www.metered.ca/tools/openrelay/)
