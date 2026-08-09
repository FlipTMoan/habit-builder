/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/habit-builder/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Habit Builder',
        short_name: 'Habits',
        description: 'Local-first habit tracking: streaks, goals, and achievements.',
        theme_color: '#4f46e5',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/habit-builder/',
        icons: [
          { src: '/habit-builder/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/habit-builder/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/habit-builder/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})