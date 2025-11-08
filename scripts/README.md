# Scripts Directory

This directory contains utility scripts for development and testing.

## Available Scripts

### `start-peerjs-server.js`

Starts a local PeerJS signaling server for development.

**Usage:**
```bash
npm run peerjs:start
```

This will start a PeerJS server on:
- **Host**: localhost
- **Port**: 9000
- **Path**: /peerjs
- **Key**: peerjs

The script will display the configuration you need to add to your `.env` file.

### `test-peerjs-connection.html`

A standalone HTML file for testing PeerJS connectivity.

**Usage:**
1. Start the PeerJS server: `npm run peerjs:start`
2. Open `scripts/test-peerjs-connection.html` in a browser
3. Check the console for connection status

## npm Scripts

### `npm run peerjs:start`
Starts only the PeerJS server

### `npm run dev:full`
Starts both the PeerJS server and the webpack dev server (recommended for development)

### `npm start`
Starts only the webpack dev server (uses default PeerJS cloud server unless .env is configured)

### `npm run build`
Builds the production bundle with environment variable configuration

## Development Workflow

1. **First time setup:**
   ```bash
   cp .env.example .env
   npm install
   ```

2. **Start development with local PeerJS server:**
   ```bash
   npm run peerjs:start    # In one terminal
   npm start               # In another terminal
   ```

   Or use the combined command:
   ```bash
   npm run dev:full
   ```

3. **The app will automatically use your local PeerJS server** (configured in `.env`)

4. **You should see fast connection times** (< 1 second) in the console:
   ```
   [NetworkConfig] Using custom PeerJS server: localhost
   [Network] ✓ Peer connection established [FAST]: 234ms
   ```

## Environment Variables

Configure your PeerJS server in `.env`:

```env
PEERJS_HOST=localhost
PEERJS_PORT=9000
PEERJS_PATH=/peerjs
PEERJS_KEY=peerjs
PEERJS_SECURE=false
```

See `.env.example` for more configuration options.
