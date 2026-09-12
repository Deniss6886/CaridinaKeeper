/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.CARIDINA_BASE_PATH ?? '/';

export default defineConfig(({ command }) => ({
  base,
  plugins: [
    {
      name: 'caridina-content-security-policy',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          // Vite's local dev server injects React Refresh scripts and CSS.
          // Production remains restricted to scripts and styles from this origin.
          const development = command === 'serve';
          const policy = [
            "default-src 'self'",
            `script-src 'self'${development ? " 'unsafe-inline'" : ''}`,
            `style-src 'self'${development ? " 'unsafe-inline'" : ''}`,
            "img-src 'self' data: blob:",
            "font-src 'self'",
            `connect-src 'self'${development ? ' ws://127.0.0.1:* ws://localhost:*' : ''}`,
            "worker-src 'self'",
            "manifest-src 'self'",
            "object-src 'none'",
            "base-uri 'none'",
            "form-action 'self'"
          ].join('; ');
          return html.replace('__CARIDINA_CSP__', policy);
        }
      }
    },
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        id: base,
        name: 'CaridinaKeeper',
        short_name: 'Caridina',
        description: 'Private, offline-first shrimp breeding and aquarium management.',
        theme_color: '#0c6b64',
        background_color: '#071b1d',
        display: 'standalone',
        start_url: base,
        scope: base,
        lang: 'en',
        categories: ['lifestyle', 'utilities'],
        icons: [
          {
            src: `${base}pwa-192x192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: `${base}pwa-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: []
      }
    })
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react')) return 'react';
          if (id.includes('dexie') || id.includes('zod')) return 'data';
          if (id.includes('i18next')) return 'i18n';
          return undefined;
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'tests/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/domain/**/*.ts', 'src/data/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test/**']
    }
  },
  server: { host: '127.0.0.1', port: 4173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true }
}));
