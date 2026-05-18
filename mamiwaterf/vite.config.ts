import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 5173 is Vite's default but is taken by another project on this
    // machine. strictPort makes startup fail loudly instead of silently
    // grabbing the next free port (which would change between runs).
    port: 5183,
    strictPort: true,
    proxy: {
      '/sui-graphql': {
        target: 'https://sui-mainnet.mystenlabs.com/graphql',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sui-graphql/, '')
      }
    }
  }
})
