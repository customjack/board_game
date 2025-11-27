#!/usr/bin/env node

/**
 * Development script that runs:
 * 1. CDN server (port 8080)
 * 2. PeerJS server
 * 3. Webpack dev server
 * 
 * This allows testing remote plugin loading in development.
 */

const { spawn } = require('child_process');
const path = require('path');

// Set environment variables for PeerJS
process.env.PEERJS_HOST = process.env.PEERJS_HOST || 'localhost';
process.env.PEERJS_PORT = process.env.PEERJS_PORT || '9000';
process.env.PEERJS_PATH = process.env.PEERJS_PATH || '/';
process.env.PEERJS_KEY = process.env.PEERJS_KEY || 'peerjs';
process.env.PEERJS_SECURE = process.env.PEERJS_SECURE || 'false';

console.log('🚀 Starting development servers...\n');
console.log('📦 CDN Server: http://localhost:8080');
console.log('🔌 PeerJS Server: ws://localhost:9000');
console.log('🌐 Webpack Dev Server: http://localhost:9001\n');

// Start CDN server
const cdnServer = spawn('npm', ['run', 'cdn:start'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, '..')
});

// Start PeerJS server
const peerjsServer = spawn('npm', ['run', 'peerjs:start'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, '..')
});

// Start webpack dev server
const webpackServer = spawn('npm', ['start'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, '..')
});

// Handle cleanup on exit
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down servers...');
    cdnServer.kill();
    peerjsServer.kill();
    webpackServer.kill();
    process.exit(0);
});

process.on('SIGTERM', () => {
    cdnServer.kill();
    peerjsServer.kill();
    webpackServer.kill();
    process.exit(0);
});

