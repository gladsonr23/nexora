import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  configFile: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    assetsInlineLimit: 0,
    outDir: resolve(import.meta.dirname, '../dist'),
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/main.jsx'),
      formats: ['es'],
      fileName: () => 'pdf-viewer-react.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: asset => asset.name?.endsWith('.css')
          ? 'pdf-viewer-react.css'
          : 'pdf-viewer-assets/[name]-[hash][extname]',
      },
    },
  },
});
