import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Backend (Cloudways). Local dev ma alag backend vapravo hoy to
// .env ma VITE_PROXY_TARGET=http://127.0.0.1:8000 muko.
const DEFAULT_BACKEND = 'https://phplaravel-1446948-6722720.cloudwaysapps.com';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const proxyTarget = (env.VITE_PROXY_TARGET || DEFAULT_BACKEND).replace(/\/$/, '');
  const isHttps = proxyTarget.startsWith('https://');

  // Optional: local dev ma ngrok vapro to .env ma VITE_DEV_HOST=your-name.ngrok-free.dev
  const devHost = env.VITE_DEV_HOST || '';

  const proxyOptions = {
    target: proxyTarget,
    changeOrigin: true,
    secure: isHttps, // https backend (Cloudways) mate certificate verify thase
  };

  return {
    plugins: [react()],

    // Aa `server` section fakt `npm run dev` ma chale chhe.
    // Vercel build (`npm run build`) ma tena par koi asar nathi.
    server: {
      host: true,
      port: 5173,

      allowedHosts: devHost ? [devHost] : true,

      ...(devHost && {
        hmr: {
          protocol: 'wss',
          host: devHost,
          clientPort: 443,
        },
      }),

      proxy: {
        '/api': proxyOptions,      // Laravel API
        '/auth': proxyOptions,     // Shopify OAuth routes
        '/webhooks': proxyOptions, // Shopify webhooks
      },

      watch: {
        usePolling: true,
        interval: 300,
      },
    },
  };
});