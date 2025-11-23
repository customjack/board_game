import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            // Could also be a dictionary or array of multiple entry points
            entry: resolve(__dirname, 'src/index.js'),
            name: 'MyPlugin',
            // the proper extensions will be added
            fileName: 'my-plugin',
            formats: ['es']
        },
        rollupOptions: {
            // make sure to externalize deps that shouldn't be bundled
            // into your library
            external: [],
            output: {
                // Provide global variables to use in the UMD build
                // for externalized deps
                globals: {}
            }
        }
    }
});
