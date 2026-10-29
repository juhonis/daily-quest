import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    },
    host: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.png', 'app-icon.svg'],
      manifest: {
        name: 'Daily Quest',
        short_name: 'Daily Quest',
        id: '/',
        description: 'A local-first calendar, quests, and notes workspace.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#020617',
        theme_color: '#020617',
        icons: [
          { src: '/app-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/app-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
