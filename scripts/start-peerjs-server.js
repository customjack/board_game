#!/usr/bin/env node

/**
 * Local PeerJS Server for Development
 *
 * This script starts a local PeerJS server for faster development.
 * Run with: node scripts/start-peerjs-server.js
 * Or add to package.json: npm run peerjs:start
 */

const { PeerServer } = require('peer');

const PORT = process.env.PEERJS_PORT || 9000;
const PATH = process.env.PEERJS_PATH || '/peerjs';
const KEY = process.env.PEERJS_KEY || 'peerjs';

console.log('╔════════════════════════════════════════════╗');
console.log('║   Starting Local PeerJS Server...         ║');
console.log('╚════════════════════════════════════════════╝\n');

const server = PeerServer({
  port: PORT,
  path: PATH,
  key: KEY,

  // Enable CORS for development
  allow_discovery: true,

  // Logging
  alive_timeout: 60000,
});

server.on('connection', (client) => {
  console.log(`✓ Client connected: ${client.getId()}`);
});

server.on('disconnect', (client) => {
  console.log(`✗ Client disconnected: ${client.getId()}`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

console.log(`✓ PeerJS Server running!`);
console.log(`  ├─ Host: localhost`);
console.log(`  ├─ Port: ${PORT}`);
console.log(`  ├─ Path: ${PATH}`);
console.log(`  ├─ Key:  ${KEY}`);
console.log(`  └─ URL:  http://localhost:${PORT}${PATH}\n`);

console.log('Configuration for .env file:');
console.log('────────────────────────────────────────────');
console.log(`PEERJS_HOST=localhost`);
console.log(`PEERJS_PORT=${PORT}`);
console.log(`PEERJS_PATH=${PATH}`);
console.log(`PEERJS_KEY=${KEY}`);
console.log(`PEERJS_SECURE=false`);
console.log('────────────────────────────────────────────\n');

console.log('Press Ctrl+C to stop the server\n');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n✓ Shutting down PeerJS server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n✓ Shutting down PeerJS server...');
  process.exit(0);
});
