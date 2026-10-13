import { defineConfig } from 'vite';

export default defineConfig({
  // relative asset URLs so the same build works from the dev server, GitHub-style hosting and Capacitor
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // the live preview is served from a proxied host name, so accept any Host header
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    target: 'es2020',
  },
});
