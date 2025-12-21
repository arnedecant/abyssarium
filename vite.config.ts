import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  // For GitHub Pages: if BASE_PATH is set, use it; otherwise default to '/'
  // This allows building for both local development and GitHub Pages
  const base = process.env.BASE_PATH || '/'

  return {
    base,
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      port: 5173,
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
    publicDir: 'public',
  }
})


