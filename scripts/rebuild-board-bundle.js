/**
 * Rebuild a board bundle ZIP from an unzipped directory
 * 
 * This script takes an unzipped board directory and creates/updates the ZIP bundle.
 * Useful for editing board files and then rebuilding the bundle.
 * 
 * Usage:
 *   node scripts/rebuild-board-bundle.js <board-dir> [output.zip]
 * 
 * Examples:
 *   # Rebuild from working directory, output to maps folder
 *   node scripts/rebuild-board-bundle.js boards/default-board src/assets/maps/default-board.zip
 * 
 *   # Rebuild and replace existing bundle
 *   node scripts/rebuild-board-bundle.js boards/default-board
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

function parseArgs() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Usage: node rebuild-board-bundle.js <board-dir> [output.zip]');
        console.error('');
        console.error('Examples:');
        console.error('  node scripts/rebuild-board-bundle.js boards/default-board src/assets/maps/default-board.zip');
        console.error('  node scripts/rebuild-board-bundle.js boards/default-board');
        process.exit(1);
    }
    
    const boardDir = path.resolve(args[0]);
    const outputFile = args[1] 
        ? path.resolve(args[1])
        : path.join(path.dirname(boardDir), path.basename(boardDir) + '.zip');
    
    return { boardDir, outputFile };
}

async function rebuildBundle(boardDir, outputFile) {
    console.log(`Rebuilding bundle from: ${boardDir}`);
    
    if (!fs.existsSync(boardDir)) {
        console.error(`Error: Board directory not found: ${boardDir}`);
        process.exit(1);
    }
    
    // Check for required files
    const requiredFiles = ['board.json', 'metadata.json', 'engine.json', 'rules.json', 'ui.json', 'topology.json'];
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(boardDir, file)));
    
    if (missingFiles.length > 0) {
        console.error(`Error: Missing required files: ${missingFiles.join(', ')}`);
        process.exit(1);
    }
    
    console.log(`Output file: ${outputFile}`);
    
    const zip = new JSZip();
    
    // Read all files in the board directory recursively
    function addDirectory(dir, zipPath = '') {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                addDirectory(filePath, path.join(zipPath, file));
            } else {
                const content = fs.readFileSync(filePath);
                const zipFilePath = path.join(zipPath, file).replace(/\\/g, '/');
                zip.file(zipFilePath, content);
                console.log(`  Added: ${zipFilePath}`);
            }
        }
    }
    
    addDirectory(boardDir);
    
    // Generate ZIP file
    console.log('Generating ZIP file...');
    const buffer = await zip.generateAsync({ 
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write ZIP file
    fs.writeFileSync(outputFile, buffer);
    const sizeKB = (buffer.length / 1024).toFixed(2);
    console.log(`✓ Bundle created successfully: ${outputFile}`);
    console.log(`  Size: ${sizeKB} KB`);
}

// Main execution
const { boardDir, outputFile } = parseArgs();
rebuildBundle(boardDir, outputFile).catch(error => {
    console.error('Failed to rebuild bundle:', error);
    process.exit(1);
});

