import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,
    port: 5173,

    allowedHosts: [
      'saddlebag-document-filler.ngrok-free.dev'
    ],

    hmr: {
      protocol: 'wss',
      host: 'saddlebag-document-filler.ngrok-free.dev',
      clientPort: 443
    },

    proxy: {
      // Laravel API
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },

      // Shopify OAuth / authentication routes
      '/auth': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      // Shopify webhooks, if your Laravel routes use /webhooks
      '/webhooks': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },

    watch: {
      usePolling: true,
      interval: 300
    }
  }
});