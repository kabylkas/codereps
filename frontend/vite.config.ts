import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Block Prism's default light theme CSS — we use our own in index.css
      'prismjs/themes/prism.css': path.resolve(__dirname, './src/empty.css'),
    },
  },
})
