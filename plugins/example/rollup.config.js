import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
    input: 'index.js',
    output: {
        file: 'dist/plugins/example-plugin.js',
        format: 'es',
        sourcemap: true
    },
    plugins: [json(), resolve(), commonjs()],
    external: (id) => {
        if (id.startsWith('.') || id.startsWith('/')) return false;
        return false;
    }
};
