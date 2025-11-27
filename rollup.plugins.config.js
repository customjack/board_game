import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
    {
        input: 'plugins/trouble/index.js',
        output: {
            file: 'dist/plugins/trouble-plugin.js',
            format: 'es',
            sourcemap: true,
            // Make external dependencies available via global variables
            globals: {
                // These will be injected at runtime by the plugin loader
            }
        },
        plugins: [resolve(), commonjs()],
        // Mark core dependencies as external - they'll be available in the main app
        // For now, we'll bundle everything and access externals via window
        external: (id) => {
            // Don't externalize relative imports (trouble-specific files)
            if (id.startsWith('.') || id.startsWith('/')) {
                return false;
            }
            // Externalize core app dependencies - these should be available globally
            // For now, we'll bundle everything to make it work
            return false;
        }
    }
];
