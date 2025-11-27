#!/usr/bin/env node

/**
 * Development script that starts PeerJS server and webpack dev server
 * with proper environment variables set
 */

const { spawn } = require('child_process');
const path = require('path');

// Set environment variables for PeerJS
process.env.PEERJS_HOST = process.env.PEERJS_HOST || 'localhost';
process.env.PEERJS_PORT = process.env.PEERJS_PORT || '9000';
process.env.PEERJS_PATH = process.env.PEERJS_PATH || '/peerjs';
process.env.PEERJS_KEY = process.env.PEERJS_KEY || 'peerjs';
process.env.PEERJS_SECURE = process.env.PEERJS_SECURE || 'false';

console.log('╔════════════════════════════════════════════╗');
console.log('║   Starting Development Environment         ║');
console.log('╚════════════════════════════════════════════╝\n');
console.log('PeerJS Configuration:');
console.log(`  ├─ Host: ${process.env.PEERJS_HOST}`);
console.log(`  ├─ Port: ${process.env.PEERJS_PORT}`);
console.log(`  ├─ Path: ${process.env.PEERJS_PATH}`);
console.log(`  ├─ Key:  ${process.env.PEERJS_KEY}`);
console.log(`  └─ Secure: ${process.env.PEERJS_SECURE}\n`);

// Start PeerJS server
const peerjsScript = path.join(__dirname, 'start-peerjs-server.js');
const peerjsProcess = spawn('node', [peerjsScript], {
    stdio: 'inherit',
    env: process.env,
    shell: false
});

// Start webpack dev server
const webpackProcess = spawn('npm', ['start'], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
    cwd: path.join(__dirname, '..')
});

// Handle process termination
const cleanup = () => {
    console.log('\n\n✓ Shutting down development servers...');
    peerjsProcess.kill();
    webpackProcess.kill();
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Handle process errors
peerjsProcess.on('error', (error) => {
    console.error('❌ Failed to start PeerJS server:', error);
});

webpackProcess.on('error', (error) => {
    console.error('❌ Failed to start webpack dev server:', error);
});

// Wait for both processes
peerjsProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
        console.error(`PeerJS server exited with code ${code}`);
    }
});

webpackProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
        console.error(`Webpack dev server exited with code ${code}`);
        cleanup();
    }
});

