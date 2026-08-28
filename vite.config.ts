import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Base path notes (this is what caused the deployed 404s):
 *
 * The previous config hardcoded `base: '/posmasinloqueño/'`. That produced
 * absolute asset URLs baked into index.html, so the bundle only resolved when
 * the app was served from exactly that path — every preview, staging host and
 * project-pages URL returned 404 for /assets/*. The `ñ` made it worse: browsers
 * request the percent-encoded form (`%C3%B1`) and not every static host maps
 * that back to the on-disk directory name.
 *
 * The default is now a relative base, so the same `dist/` works unchanged at
 * `/`, at `/posmasinloqueño/`, and at any other subpath. Set VITE_BASE_PATH
 * only when a host genuinely requires absolute URLs (and keep it ASCII).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE_PATH?.trim() || './'

  return {
    base,
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    server: { host: true, port: 5173 },
    preview: { host: true, port: 4173 },
  }
})
