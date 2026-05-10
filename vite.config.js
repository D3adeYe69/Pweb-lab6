import { defineConfig } from 'vite'

// Set base to the repository subpath so built assets load on GitHub Pages
export default defineConfig({
  base: '/Pweb-lab6/',
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/token': 'http://localhost:3001',
      '/docs': 'http://localhost:3001'
    }
  }
})
