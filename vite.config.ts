import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'MyReactLib',
      fileName: (format) => `my-react-lib.${format}.js`,
      formats: ['es', 'umd'],
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react-pdf',
        'react-signature-canvas'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'react/jsx-runtime',
          'react-pdf': 'ReactPdf',
          'react-signature-canvas': 'ReactSignatureCanvas'
        },
      },
    },
  },
})



