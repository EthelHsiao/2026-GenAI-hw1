import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://llama.sdc.nycu.club',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ddg': {
        target: 'https://api.duckduckgo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ddg/, ''),
      },
    },
  },
})
