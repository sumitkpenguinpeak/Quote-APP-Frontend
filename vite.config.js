import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'cache-arrest-verdict.ngrok-free.dev'
    ],
    // HMR Configuration
    // Do NOT bind server to the remote ngrok IP (that caused EADDRNOTAVAIL).
    // Provide client-side connection info only so the browser connects via secure WSS.
    hmr: {
      protocol: 'wss',
      clientPort: 443
    },
    // Watch configuration for file changes
    watch: {
      usePolling: true,
      interval: 300
    }
    
  }
});