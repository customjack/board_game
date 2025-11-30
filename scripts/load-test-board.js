/**
 * Load and test a board bundle from the boards directory
 * 
 * This script demonstrates how to load a test board bundle externally.
 * It can be used to test bundle loading functionality without adding
 * the board to src/assets/maps.
 * 
 * Usage:
 *   node scripts/load-test-board.js <board-name>
 * 
 * Example:
 *   node scripts/load-test-board.js test-board
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

// Import the bundle loader (we'll need to adapt it for Node.js)
// For now, this is a simple test script that validates the bundle structure

function parseArgs() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Usage: node load-test-board.js <board-name>');
        console.error('Example: node load-test-board.js test-board');
        process.exit(1);
    }
    return args[0];
}

async function validateBundle(bundlePath) {
    console.log(`Validating bundle: ${bundlePath}`);
    
    if (!fs.existsSync(bundlePath)) {
        console.error(`Error: Bundle not found: ${bundlePath}`);
        process.exit(1);
    }
    
    // Read ZIP file
    const zipData = fs.readFileSync(bundlePath);
    const zip = await JSZip.loadAsync(zipData);
    
    // Check for required files
    const requiredFiles = ['board.json', 'metadata.json', 'engine.json', 'rules.json', 'ui.json', 'topology.json'];
    const missingFiles = [];
    const foundFiles = [];
    
    for (const file of requiredFiles) {
        if (zip.file(file)) {
            foundFiles.push(file);
            const content = await zip.file(file).async('string');
            try {
                const parsed = JSON.parse(content);
                console.log(`✓ ${file} - Valid JSON`);
            } catch (e) {
                console.error(`✗ ${file} - Invalid JSON: ${e.message}`);
                process.exit(1);
            }
        } else {
            missingFiles.push(file);
        }
    }
    
    if (missingFiles.length > 0) {
        console.error(`Error: Missing required files: ${missingFiles.join(', ')}`);
        process.exit(1);
    }
    
    // Parse board.json to check structure
    const boardJson = JSON.parse(await zip.file('board.json').async('string'));
    console.log(`✓ Bundle ID: ${boardJson.id}`);
    console.log(`✓ Schema version: ${boardJson.schema_version}`);
    
    // Check that all referenced files exist
    const paths = boardJson.paths || {};
    for (const [key, filePath] of Object.entries(paths)) {
        if (zip.file(filePath)) {
            console.log(`✓ Referenced file exists: ${key} -> ${filePath}`);
        } else {
            console.warn(`⚠ Referenced file missing: ${key} -> ${filePath}`);
        }
    }
    
    // Parse metadata
    const metadata = JSON.parse(await zip.file('metadata.json').async('string'));
    console.log(`✓ Board name: ${metadata.name}`);
    console.log(`✓ Author: ${metadata.author}`);
    
    // Parse topology to check spaces
    const topology = JSON.parse(await zip.file('topology.json').async('string'));
    const spaceCount = topology.spaces?.length || 0;
    console.log(`✓ Spaces: ${spaceCount}`);
    
    if (spaceCount > 0) {
        const spacesWithPositions = topology.spaces.filter(s => s.position?.x !== undefined && s.position?.y !== undefined);
        console.log(`✓ Spaces with positions: ${spacesWithPositions.length}/${spaceCount}`);
    }
    
    console.log('\n✓ Bundle validation complete!');
    console.log(`\nTo load this board in the game:`);
    console.log(`1. Copy the bundle to a location accessible via HTTP`);
    console.log(`2. Use MapStorageManager.addCustomMapFromBundle() or upload via Map Manager`);
    console.log(`\nOr use the test HTML file to load it directly.`);
}

// Main execution
const boardName = parseArgs();
const bundlePath = path.resolve(`boards/${boardName}.zip`);

validateBundle(bundlePath).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
});

