import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/sui-graphql': {
        target: 'https://sui-mainnet.mystenlabs.com/graphql',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sui-graphql/, '')
      }
    }
  }
})
