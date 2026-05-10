import { defineConfig } from 'vite';

export default defineConfig({
  base: '/skydock-demo/',    // ← git or local
  publicDir: 'public',
  build: {
    outDir: 'docs',
    assetsDir: 'assets',
  },
  server: {
    port: 5173,
    open: true,
  },
});
