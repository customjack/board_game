import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
    {
        input: 'plugins/example/index.js',
        output: {
            file: 'dist/plugins/example.js',
            format: 'es',
            sourcemap: true
        },
        plugins: [resolve(), commonjs()]
    },
    {
        input: 'plugins/trouble/index.js',
        output: {
            file: 'dist/plugins/trouble.js',
            format: 'es',
            sourcemap: true
        },
        plugins: [resolve(), commonjs()]
    }
];
