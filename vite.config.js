import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path:
// - Firebase Hosting (default): '/'
// - GitHub Pages: '/EliteProV2/' (set DEPLOY_TARGET=gh-pages)
/* global process */
const isGhPages = process.env.DEPLOY_TARGET === 'gh-pages'

export default defineConfig({
  plugins: [react()],
  base: isGhPages ? '/EliteProV2/' : '/',
})
