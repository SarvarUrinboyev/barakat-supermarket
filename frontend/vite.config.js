import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The production build is emitted straight into the backend's static
// resources, so the Spring Boot JAR serves the UI and the API together.
export default defineConfig({
  plugins: [react()],
  // Absolute asset paths ("/assets/...") so nested routes like
  // /warehouse/3 still resolve the bundle correctly.
  base: '/',
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8086',
    },
  },
  build: {
    outDir: '../backend/src/main/resources/static',
    emptyOutDir: true,
  },
});
