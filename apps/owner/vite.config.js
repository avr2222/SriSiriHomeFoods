import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// '/' for dev + Capacitor; the Pages workflow sets BASE_PATH to the repo subpath.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'Sri Siri Owner Cockpit',
        short_name: 'Sri Siri Owner',
        description: 'Run Sri Siri Home Foods — orders, POS, stock, expenses & reports.',
        theme_color: '#2a2014',
        background_color: '#fbf2dd',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: base + 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/rest/') || url.host.includes('supabase'),
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase', networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
});
