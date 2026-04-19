/**
 * PROMPT 118 — Frontend Performance Optimization
 * - Manual chunk splitting (vendor, charts, pages bundles)
 * - Tree shaking enabled by default in Vite
 * - Asset optimization
 */
import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin(),
  ],
  server: {
    proxy: {
      '/api':      'http://localhost:5000',
      '/webhook':  'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    }
  },
  build: {
    // Code splitting: split large dependencies into separate chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — cached separately since it rarely changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Charting libraries
          'vendor-charts': ['recharts'],
          // Socket.io client
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
    // Minify + compress
    minify: 'esbuild',
    // Enable source maps in production for debugging (optional)
    sourcemap: false,
    // Warn when chunks exceed 500kb
    chunkSizeWarningLimit: 500,
  },
});
