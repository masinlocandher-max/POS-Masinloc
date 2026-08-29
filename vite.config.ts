import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const DEFAULT_BASE = '/posmasinloqueno/'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE_PATH?.trim() || DEFAULT_BASE

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
