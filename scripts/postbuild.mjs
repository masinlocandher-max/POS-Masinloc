/**
 * Post-build hardening for static hosting.
 *
 * The build remains private staging: it must stay noindex, use portable asset
 * paths, and emit an SPA fallback plus .nojekyll for static hosts.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
const indexPath = join(dist, 'index.html')
const declaredBase = (process.env.VITE_BASE_PATH || '').trim()
const expectedBase = declaredBase || './'

if (!existsSync(indexPath)) {
  console.error('[postbuild] dist/index.html is missing — did `vite build` run?')
  process.exit(1)
}

if (expectedBase !== './') {
  if (!expectedBase.startsWith('/') || !expectedBase.endsWith('/') || /[^\x20-\x7E]/.test(expectedBase)) {
    console.error('[postbuild] VITE_BASE_PATH must be ./ or an ASCII absolute path ending in /')
    process.exit(1)
  }
}

const html = readFileSync(indexPath, 'utf8')
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1])
const assetRefs = refs.filter(ref => ref.includes('/assets/'))

if (assetRefs.length === 0) {
  console.error('[postbuild] no built asset references found in index.html')
  process.exit(1)
}

const nonAscii = assetRefs.filter(ref => /[^\x20-\x7E]/.test(ref))
if (nonAscii.length > 0) {
  console.error('[postbuild] non-ASCII asset URL detected')
  nonAscii.forEach(ref => console.error(`  ${ref}`))
  process.exit(1)
}

if (expectedBase === './') {
  const absolute = assetRefs.filter(ref => ref.startsWith('/'))
  if (absolute.length > 0) {
    console.error('[postbuild] relative build emitted absolute asset URLs')
    absolute.forEach(ref => console.error(`  ${ref}`))
    process.exit(1)
  }
} else {
  const wrongBase = assetRefs.filter(ref => !ref.startsWith(expectedBase))
  if (wrongBase.length > 0) {
    console.error(`[postbuild] asset URL escaped expected base ${expectedBase}`)
    wrongBase.forEach(ref => console.error(`  ${ref}`))
    process.exit(1)
  }
}

if (!html.includes('noindex')) {
  console.error('[postbuild] staging build must remain noindex until launch approval')
  process.exit(1)
}

writeFileSync(join(dist, '404.html'), html)
writeFileSync(join(dist, '.nojekyll'), '')

console.log(`[postbuild] base="${expectedBase}"`)
console.log(`[postbuild] verified ${assetRefs.length} asset reference(s)`)
console.log('[postbuild] wrote dist/404.html and dist/.nojekyll')

if (!declaredBase) {
  console.log('[postbuild] note: declare VITE_BASE_PATH on hosts that must support deep-link fallbacks at any URL depth')
}
