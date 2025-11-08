const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin'); // Import copy plugin
const webpack = require('webpack');
const path = require('path');
require('dotenv').config(); // Load .env file

module.exports = {
    entry: './src/js/app.js', // Entry point of your application
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js', // Output bundle file
        clean: true, // Clean the output directory before emit
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader', // Transpile ES6+ code
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader, // Extract CSS into files
                    'css-loader', // Translates CSS into CommonJS
                ],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html', // Path to your template file
            filename: 'index.html',       // Output file name
            inject: 'head',
        }),
        new MiniCssExtractPlugin({
            filename: 'styles.css', // Specify the output filename
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/assets', to: 'assets' }, // Copy assets folder to dist
            ],
        }), // Copy the assets folder
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
            'process.env.PEERJS_HOST': JSON.stringify(process.env.PEERJS_HOST),
            'process.env.PEERJS_PORT': JSON.stringify(process.env.PEERJS_PORT),
            'process.env.PEERJS_PATH': JSON.stringify(process.env.PEERJS_PATH),
            'process.env.PEERJS_KEY': JSON.stringify(process.env.PEERJS_KEY),
            'process.env.PEERJS_SECURE': JSON.stringify(process.env.PEERJS_SECURE),
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'), // Serve files from dist/
        },
        compress: true,
        port: 9000,
        hot: false,          // Disable Hot Module Replacement
        liveReload: true,    // Enable live reloading
    },
    mode: 'development',
};
