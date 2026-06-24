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
        name: 'Sri Siri Home Foods',
        short_name: 'Sri Siri',
        description: 'Homemade pickles, sweets, snacks & batters — fresh to your door.',
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
          {
            urlPattern: ({ url }) => url.host.includes('fonts.googleapis.com') || url.host.includes('fonts.gstatic.com'),
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
});
