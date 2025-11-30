/**
 * Migration Tool: Convert monolithic board JSON to modular bundle format
 * 
 * This script reads a monolithic board JSON file (like defaultBoard.json)
 * and converts it to the new modular bundle format with separate files
 * for metadata, engine, rules, ui, topology, etc.
 * 
 * Usage:
 *   node scripts/migrate-board-to-bundle.js <input.json> <output-dir>
 * 
 * Example:
 *   node scripts/migrate-board-to-bundle.js src/assets/maps/defaultBoard.json dist/boards/default-board
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node migrate-board-to-bundle.js <input.json> <output-dir>');
        process.exit(1);
    }
    return {
        inputFile: path.resolve(args[0]),
        outputDir: path.resolve(args[1])
    };
}

function extractMetadata(boardJson) {
    return {
        name: boardJson.metadata?.name || boardJson.name || 'Untitled Board',
        author: boardJson.metadata?.author || boardJson.author || 'Unknown',
        version: boardJson.version || '1.0.0',
        description: boardJson.metadata?.description || boardJson.description || '',
        tags: boardJson.metadata?.tags || boardJson.tags || [],
        created: boardJson.metadata?.created || boardJson.created || new Date().toISOString(),
        modified: boardJson.metadata?.modified || boardJson.modified || new Date().toISOString()
    };
}

function extractEngine(boardJson) {
    return {
        type: boardJson.engine?.type || boardJson.metadata?.gameEngine?.type || 'turn-based',
        config: boardJson.engine?.config || boardJson.metadata?.gameEngine?.config || {}
    };
}

function extractDependencies(boardJson) {
    const requirements = boardJson.requirements || {};
    return {
        plugins: requirements.plugins || [],
        minPlayers: requirements.minPlayers,
        maxPlayers: requirements.maxPlayers
    };
}

function extractUI(boardJson) {
    return boardJson.ui || {
        layout: 'standard-board',
        theme: {},
        components: []
    };
}

function extractRules(boardJson) {
    const rules = boardJson.rules || {};
    return {
        turnOrder: rules.turnOrder || 'sequential',
        startingPositions: rules.startingPositions || {},
        recommendedPlayers: rules.recommendedPlayers || {},
        diceRolling: rules.diceRolling || {},
        winCondition: rules.winCondition || {}
    };
}

function extractTopology(boardJson) {
    const board = boardJson.board || {};
    const topology = board.topology || {};
    
    return {
        spaces: topology.spaces || [],
        connections: topology.connections || []
    };
}

function extractSettings(boardJson) {
    const board = boardJson.board || {};
    const rendering = board.rendering || {};
    
    // Extract any board-level settings
    const settings = {
        renderConfig: rendering
    };
    
    // Only return if there's actual content
    if (Object.keys(settings.renderConfig).length > 0) {
        return settings;
    }
    
    return null;
}

function createBoardManifest(boardId, hasSettings, hasDependencies) {
    const manifest = {
        schema_version: 2,
        id: boardId,
        paths: {
            metadata: 'metadata.json',
            engine: 'engine.json',
            rules: 'rules.json',
            ui: 'ui.json',
            topology: 'topology.json'
        },
        assetsRoot: 'assets/'
    };
    
    if (hasSettings) {
        manifest.paths.settings = 'settings.json';
    }
    
    if (hasDependencies) {
        manifest.paths.dependencies = 'dependencies.json';
    }
    
    return manifest;
}

async function migrateBoard(inputFile, outputDir) {
    console.log(`Reading board JSON from: ${inputFile}`);
    
    // Read input JSON
    const boardJson = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    
    // Extract board ID from filename or metadata
    const boardId = boardJson.metadata?.id || 
                   path.basename(inputFile, '.json').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    
    console.log(`Board ID: ${boardId}`);
    
    // Extract components
    const metadata = extractMetadata(boardJson);
    const engine = extractEngine(boardJson);
    const dependencies = extractDependencies(boardJson);
    const ui = extractUI(boardJson);
    const rules = extractRules(boardJson);
    const topology = extractTopology(boardJson);
    const settings = extractSettings(boardJson);
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create assets directory
    const assetsDir = path.join(outputDir, 'assets');
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    // Write component files
    console.log('Writing component files...');
    fs.writeFileSync(
        path.join(outputDir, 'board.json'),
        JSON.stringify(createBoardManifest(boardId, !!settings, dependencies.plugins?.length > 0), null, 2)
    );
    fs.writeFileSync(
        path.join(outputDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
    );
    fs.writeFileSync(
        path.join(outputDir, 'engine.json'),
        JSON.stringify(engine, null, 2)
    );
    fs.writeFileSync(
        path.join(outputDir, 'ui.json'),
        JSON.stringify(ui, null, 2)
    );
    fs.writeFileSync(
        path.join(outputDir, 'rules.json'),
        JSON.stringify(rules, null, 2)
    );
    fs.writeFileSync(
        path.join(outputDir, 'topology.json'),
        JSON.stringify(topology, null, 2)
    );
    
    if (settings) {
        fs.writeFileSync(
            path.join(outputDir, 'settings.json'),
            JSON.stringify(settings, null, 2)
        );
    }
    
    if (dependencies.plugins?.length > 0 || dependencies.minPlayers || dependencies.maxPlayers) {
        fs.writeFileSync(
            path.join(outputDir, 'dependencies.json'),
            JSON.stringify(dependencies, null, 2)
        );
    }
    
    console.log(`Migration complete! Files written to: ${outputDir}`);
    console.log('\nNext steps:');
    console.log('1. Add any assets (images, etc.) to the assets/ directory');
    console.log('2. Optionally add a preview.png file');
    console.log('3. Create a ZIP file from the directory');
    console.log(`4. Use: zip -r ${boardId}.zip ${outputDir}/*`);
}

// Main execution
const { inputFile, outputDir } = parseArgs();

if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file not found: ${inputFile}`);
    process.exit(1);
}

migrateBoard(inputFile, outputDir).catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
});

