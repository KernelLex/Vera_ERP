import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    proxy: {
      "/api": {
        target: "http://hrms.localhost:8001",
        changeOrigin: true,
        // Rewrite cookie domain so browser on localhost accepts them
        cookieDomainRewrite: "localhost",
      },
    },
  },
})
