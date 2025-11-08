import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import external from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const packageJson = require('./package.json');

const baseConfig = {
    input: 'src/index.ts',
    plugins: [
        external(),
        resolve(),
        commonjs(),
        postcss({
            extensions: ['.css'],
            minimize: true,
            extract: 'styles.css',
        }),
        terser(),
    ],
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-pdf', 'pdf-lib', 'react-signature-canvas', 'dayjs'],
};

export default {
    ...baseConfig,
    output: {
        dir: 'dist',
        format: 'esm',
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        sourcemap: true,
        exports: 'named'
    },
    plugins: [
        ...baseConfig.plugins,
        typescript({
            tsconfig: './tsconfig.json',
            exclude: ['**/*.test.tsx', '**/*.test.ts', '**/*.stories.tsx'],
            declaration: true,
            declarationDir: 'dist',
            noEmit: false,
            sourceMap: true,
        }),
    ]
};