import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Base path:
// - Firebase Hosting (default): '/'
// - GitHub Pages: '/EliteProV2/' (set DEPLOY_TARGET=gh-pages)
/* global process */
const isGhPages = process.env.DEPLOY_TARGET === 'gh-pages'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Cache all build output (JS, CSS, HTML)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // fontkit is 694 KB and is only ever reached by the CJK PDF path, which
        // is dynamically imported. Precaching it would add that to every
        // install — including the majority of sessions that never generate a
        // Chinese invoice — so it is left to be fetched (and runtime-cached)
        // alongside the font it exists to read. Same reasoning as the .ttf.
        globIgnores: ['**/fontkit*.js'],
        // Don't cache Firebase SDK network requests
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/firebase-messaging-sw\.js$/],
        runtimeCaching: [
          {
            // The CJK PDF font and the fontkit chunk that parses it. Neither is
            // precached — the font is 5.7 MB, fontkit 694 KB, and
            // most sessions never generate a Chinese invoice at all (see
            // public/fonts/README.md). Cached on first use instead, so each is
            // paid once per device rather than by every install.
            urlPattern: /(\/fonts\/.*\.ttf|fontkit.*\.js)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdf-fonts',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      // Don't auto-inject manifest — we have our own in public/manifest.json
      manifest: false,
      // Exclude the Firebase messaging SW from being replaced
      selfDestroying: false,
    }),
  ],
  base: isGhPages ? '/EliteProV2/' : '/',
  // Front-end unit tests only. functions/ and firestore-tests/ run on Jest against the
  // Firestore emulator and have their own npm scripts — leaving them in vitest's default
  // glob makes it try to run Jest suites and fail on missing globals.
  test: {
    include: ['src/**/*.test.{js,jsx}'],
    environment: 'node',
  },
})
