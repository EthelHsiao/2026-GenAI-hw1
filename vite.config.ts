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
      '/llm-api': {
        target: 'http://llama.sdc.nycu.club',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/llm-api/, '/v1'),
      },
    },
  },
})
