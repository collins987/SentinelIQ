import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Changed to bind to all interfaces for Docker
    watch: {
      usePolling: true, // Enable polling for Docker volumes
    },
    proxy: {
      '/api': {
        target: 'http://api:8000', // Use Docker service name
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://api:8000', // Use Docker service name
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          ui: ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
});
