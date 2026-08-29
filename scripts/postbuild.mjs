import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
const indexPath = join(dist, 'index.html')
const expectedBase = (process.env.VITE_BASE_PATH || '/posmasinloqueno/').trim()

if (!existsSync(indexPath)) {
  console.error('[postbuild] dist/index.html is missing')
  process.exit(1)
}

if (expectedBase !== './') {
  if (!expectedBase.startsWith('/') || !expectedBase.endsWith('/') || /[^\x20-\x7E]/.test(expectedBase)) {
    console.error('[postbuild] invalid VITE_BASE_PATH; use ./ or an ASCII absolute path ending in /')
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
if (nonAscii.length) {
  console.error('[postbuild] non-ASCII asset URL detected')
  nonAscii.forEach(ref => console.error(`  ${ref}`))
  process.exit(1)
}

if (expectedBase === './') {
  const absolute = assetRefs.filter(ref => ref.startsWith('/'))
  if (absolute.length) {
    console.error('[postbuild] relative build emitted absolute assets')
    process.exit(1)
  }
} else {
  const wrongBase = assetRefs.filter(ref => !ref.startsWith(expectedBase))
  if (wrongBase.length) {
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
console.log(`[postbuild] verified ${assetRefs.length} asset reference(s) under ${expectedBase}`)
console.log('[postbuild] wrote 404.html and .nojekyll')
