import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The demo is one static page: `vite dev` to present it, `vite build` to hand
 * over a `dist/` folder that runs from any file server. There is no proxy
 * because there is no server to proxy to.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174 },
});
