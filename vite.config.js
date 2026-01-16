import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Standalone build - bundles everything for embedding in non-React apps
  if (mode === 'standalone') {
    return {
      plugins: [react()],
      define: {
        'process.env.NODE_ENV': JSON.stringify('production')
      },
      build: {
        lib: {
          entry: path.resolve(__dirname, 'src/standalone.jsx'),
          name: 'RfamSecondaryStructures',
          formats: ['iife'],
          fileName: () => 'secondary-structures.min.js'
        },
        cssCodeSplit: false,
        outDir: 'dist/standalone',
        rollupOptions: {
          output: {
            assetFileNames: 'secondary-structures.[ext]'
          }
        }
      }
    };
  }

  // Library build - for use in React apps (externalize React)
  if (mode === 'library') {
    return {
      plugins: [react()],
      build: {
        lib: {
          entry: path.resolve(__dirname, 'src/SecondaryStructures.jsx'),
          name: 'SecondaryStructure',
          formats: ['umd'],
          fileName: () => 'secondary-structures.umd.js'
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'prop-types', 'svg-pan-zoom'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
              'prop-types': 'PropTypes',
              'svg-pan-zoom': 'svgPanZoom'
            }
          }
        }
      }
    };
  }

  // Development mode
  return {
    plugins: [react()],
    server: { port: 3001 }
  };
});
