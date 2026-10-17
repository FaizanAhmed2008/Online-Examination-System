import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Unique id for this `npm run dev` run. The browser re-reads it on every full
// page load, so restarting the dev server automatically starts a brand new
// demo simulation (no stale data from a previous run).
const devSessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const devSession = {
  name: 'oes-dev-session',
  apply: 'serve',
  transformIndexHtml() {
    return [
      {
        tag: 'script',
        injectTo: 'head',
        children: `window.__OES_DEV_SESSION__ = ${JSON.stringify(devSessionId)};`,
      },
    ]
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devSession],
})
