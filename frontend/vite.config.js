import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: true },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // lo que casi no cambia va aparte: se cachea y no se vuelve a bajar en cada versión
        manualChunks(id) {
          if (id.includes('node_modules/pixi.js') || id.includes('node_modules/@pixi')) return 'pixi';
          if (id.includes('node_modules/gsap')) return 'gsap';
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion-')) return 'movimiento';
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
});
