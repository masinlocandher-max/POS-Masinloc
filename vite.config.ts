import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // The public ñ route is an alias only. Assets live under the ASCII path so
  // browsers, CDNs and Vercel never need to normalize a Unicode directory.
  base: '/posmasinloqueno/',
  plugins: [react()],
})
