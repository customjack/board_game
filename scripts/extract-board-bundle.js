/**
 * Extract a board bundle ZIP to a directory for editing
 * 
 * Usage:
 *   node scripts/extract-board-bundle.js <bundle.zip> [output-dir]
 * 
 * Example:
 *   node scripts/extract-board-bundle.js src/assets/maps/default-board.zip boards/default-board
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

function parseArgs() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Usage: node extract-board-bundle.js <bundle.zip> [output-dir]');
        process.exit(1);
    }
    
    const zipFile = path.resolve(args[0]);
    const outputDir = args[1] 
        ? path.resolve(args[1])
        : path.join('boards', path.basename(zipFile, '.zip'));
    
    return { zipFile, outputDir };
}

async function extractBundle(zipFile, outputDir) {
    console.log(`Extracting bundle: ${zipFile}`);
    console.log(`Output directory: ${outputDir}`);
    
    if (!fs.existsSync(zipFile)) {
        console.error(`Error: Bundle file not found: ${zipFile}`);
        process.exit(1);
    }
    
    // Read ZIP file
    const zipData = fs.readFileSync(zipFile);
    const zip = await JSZip.loadAsync(zipData);
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Extract all files
    let fileCount = 0;
    for (const [relativePath, file] of Object.entries(zip.files)) {
        if (file.dir) {
            // Create directory
            const dirPath = path.join(outputDir, relativePath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        } else {
            // Extract file
            const content = await file.async('nodebuffer');
            const filePath = path.join(outputDir, relativePath);
            const fileDir = path.dirname(filePath);
            
            if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, { recursive: true });
            }
            
            fs.writeFileSync(filePath, content);
            console.log(`  Extracted: ${relativePath}`);
            fileCount++;
        }
    }
    
    console.log(`✓ Extracted ${fileCount} files to ${outputDir}`);
}

// Main execution
const { zipFile, outputDir } = parseArgs();
extractBundle(zipFile, outputDir).catch(error => {
    console.error('Failed to extract bundle:', error);
    process.exit(1);
});

