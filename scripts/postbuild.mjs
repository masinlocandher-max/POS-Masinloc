/**
 * Post-build hardening for static hosting.
 *
 * 1. Writes dist/404.html as a copy of index.html so a deep link or a stale
 *    bookmark renders the app instead of the host's 404 page.
 * 2. Writes dist/.nojekyll so GitHub Pages serves files and folders whose
 *    names start with an underscore.
 * 3. Fails the build if index.html still references assets with a hardcoded
 *    absolute or non-ASCII base — the exact defect that produced the 404s.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
const indexPath = join(dist, 'index.html')

if (!existsSync(indexPath)) {
  console.error('[postbuild] dist/index.html is missing — did `vite build` run?')
  process.exit(1)
}

const html = readFileSync(indexPath, 'utf8')
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1])
const assetRefs = refs.filter(ref => ref.includes('/assets/'))

if (assetRefs.length === 0) {
  console.error('[postbuild] no asset references found in index.html')
  process.exit(1)
}

const nonAscii = assetRefs.filter(ref => /[^\x20-\x7E]/.test(ref))
if (nonAscii.length > 0) {
  console.error('[postbuild] asset URLs contain non-ASCII characters and will 404 on hosts that percent-encode paths:')
  nonAscii.forEach(ref => console.error(`  ${ref}`))
  process.exit(1)
}

const declaredBase = (process.env.VITE_BASE_PATH || '').trim()
if (!declaredBase) {
  const absolute = assetRefs.filter(ref => ref.startsWith('/'))
  if (absolute.length > 0) {
    console.error('[postbuild] asset URLs are absolute but no VITE_BASE_PATH was declared; the build will 404 under any other path:')
    absolute.forEach(ref => console.error(`  ${ref}`))
    process.exit(1)
  }
}

writeFileSync(join(dist, '404.html'), html)
writeFileSync(join(dist, '.nojekyll'), '')

console.log(`[postbuild] base="${declaredBase || './ (relative)'}"`)
console.log(`[postbuild] verified ${assetRefs.length} asset reference(s): ${assetRefs.join(', ')}`)
console.log('[postbuild] wrote dist/404.html and dist/.nojekyll')

if (!declaredBase) {
  // Worth stating plainly rather than discovering it in production: a relative
  // base makes dist/ portable across hosts, but the 404.html fallback resolves
  // "./assets/*" against the directory of whatever URL was requested. At the
  // site root and one level down that is still the app directory, so the app
  // boots. Two or more levels down it is not, and the fallback renders blank.
  // The app has no router, so it never generates such a URL itself.
  console.log('[postbuild] note: relative base — the 404.html fallback boots at the site root')
  console.log('[postbuild]       and one level down. Declare VITE_BASE_PATH for a host whose')
  console.log('[postbuild]       path is known and ASCII to make it work at any depth.')
}
