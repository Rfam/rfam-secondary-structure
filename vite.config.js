import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
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
          external: ['react', 'react-dom', 'prop-types'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
              'prop-types': 'PropTypes'
            }
          }
        }
      }
    };
  }
  return {
    plugins: [react()],
    server: { port: 3001 }
  };
});
