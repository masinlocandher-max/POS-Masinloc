import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Default to a relative base so one build works at the root or any subpath.
 * A host can declare an ASCII absolute VITE_BASE_PATH when deep-link fallback
 * behavior requires a known deployment path.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE_PATH?.trim() || './'

  if (base !== './') {
    if (!base.startsWith('/') || !base.endsWith('/')) {
      throw new Error('VITE_BASE_PATH must be ./ or an absolute path ending in /')
    }
    if (/[^\x20-\x7E]/.test(base)) {
      throw new Error('VITE_BASE_PATH must contain ASCII characters only')
    }
  }

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
