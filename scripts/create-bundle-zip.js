/**
 * Create a ZIP bundle from a board directory
 * 
 * Usage:
 *   node scripts/create-bundle-zip.js <board-dir> <output.zip>
 * 
 * Example:
 *   node scripts/create-bundle-zip.js dist/boards/default-board dist/boards/default-board.zip
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

function parseArgs() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node create-bundle-zip.js <board-dir> <output.zip>');
        process.exit(1);
    }
    return {
        boardDir: path.resolve(args[0]),
        outputFile: path.resolve(args[1])
    };
}

async function createBundle(boardDir, outputFile) {
    console.log(`Creating bundle from: ${boardDir}`);
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
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write ZIP file
    fs.writeFileSync(outputFile, buffer);
    console.log(`Bundle created successfully: ${outputFile}`);
    console.log(`Size: ${(buffer.length / 1024).toFixed(2)} KB`);
}

// Main execution
const { boardDir, outputFile } = parseArgs();

if (!fs.existsSync(boardDir)) {
    console.error(`Error: Board directory not found: ${boardDir}`);
    process.exit(1);
}

createBundle(boardDir, outputFile).catch(error => {
    console.error('Failed to create bundle:', error);
    process.exit(1);
});

