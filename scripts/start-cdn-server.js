#!/usr/bin/env node

/**
 * Simple HTTP server for serving plugins as a local CDN
 * Serves files from dist/plugins/ directory on port 8080
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const PLUGINS_DIR = path.join(__dirname, '..', 'dist', 'plugins');
const MAPS_DIR = path.join(__dirname, '..', 'dist', 'maps');
const PLUGIN_FALLBACK_DIRS = [
    path.join(__dirname, '..', 'plugins', 'example', 'dist', 'plugins'),
    path.join(__dirname, '..', 'plugins', 'trouble', 'dist', 'plugins')
];

// MIME types
const mimeTypes = {
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.map': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css'
};

const server = http.createServer((req, res) => {
    // Remove query string and decode URL
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    
    // Default to index if root
    if (urlPath === '/') {
        urlPath = '/index.html';
    }

    // Security: prevent directory traversal
    if (urlPath.includes('..')) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid path');
        return;
    }

    // Map /plugins/* to dist/plugins/* and /maps/* to dist/maps/*
    // Also check submodule locations for standalone plugins
    let filePath;
    if (urlPath.startsWith('/plugins/')) {
        const fileName = urlPath.replace('/plugins/', '');
        const candidatePaths = [
            path.join(PLUGINS_DIR, fileName),
            ...PLUGIN_FALLBACK_DIRS.map((dir) => path.join(dir, fileName))
        ];

        const existing = candidatePaths.find((p) => fs.existsSync(p));
        filePath = existing || candidatePaths[0];
    } else if (urlPath.startsWith('/maps/')) {
        const fileName = urlPath.replace('/maps/', '');
        filePath = path.join(MAPS_DIR, fileName);
    } else {
        filePath = path.join(PLUGINS_DIR, urlPath);
    }

    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.log(`[404] ${req.method} ${req.url}`);
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
        }

        // Get file extension for MIME type
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        // Read and serve file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                console.error(`[ERROR] Failed to read ${filePath}:`, err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal server error');
                return;
            }

            // Set CORS headers for local development
            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            
            console.log(`[200] ${req.method} ${req.url} (${data.length} bytes)`);
            res.end(data);
        });
    });
});

// Check if directories exist
if (!fs.existsSync(PLUGINS_DIR)) {
    console.log(`Creating plugins directory: ${PLUGINS_DIR}`);
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
}
if (!fs.existsSync(MAPS_DIR)) {
    console.log(`Creating maps directory: ${MAPS_DIR}`);
    fs.mkdirSync(MAPS_DIR, { recursive: true });
}

server.listen(PORT, () => {
    console.log(`\n🚀 CDN Server running at http://localhost:${PORT}`);
    console.log(`📁 Serving plugins from: ${PLUGINS_DIR}`);
    console.log(`📁 Serving maps from: ${MAPS_DIR}`);
    console.log(`\nAvailable endpoints:`);
    console.log(`  - http://localhost:${PORT}/plugins/trouble-plugin.js`);
    console.log(`  - http://localhost:${PORT}/maps/trouble-classic.json`);
    console.log(`\nPress Ctrl+C to stop the server\n`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error(`   Please stop any other server using port ${PORT} or change the PORT in this script.\n`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
