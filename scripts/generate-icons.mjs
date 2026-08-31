/**
 * Generates the PWA / home-screen icons from the Masinloc "M" brand mark.
 *
 * Written as a dependency-free PNG encoder so icons can be regenerated in CI
 * or on any machine with just Node installed: `npm run icons`.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const NAVY = [13, 59, 158]
const BLUE = [30, 99, 233]
const RED = [230, 30, 37]
const YELLOW = [255, 199, 0]
const WHITE = [255, 255, 255]

// The brand mark, in fractions of the mark's box — same geometry as the CSS
// clip-path used by the in-app <Brand /> component.
const MARK = [
  [0.00, 1.00], [0.23, 0.00], [0.49, 0.58], [0.70, 0.00], [1.00, 1.00],
  [0.74, 1.00], [0.67, 0.55], [0.50, 1.00], [0.35, 0.55], [0.28, 1.00],
]

const STRIPES = [
  { poly: [[0.23, 0.00], [0.49, 0.58], [0.40, 0.82], [0.18, 0.25]], color: BLUE },
  { poly: [[0.40, 0.82], [0.49, 0.58], [0.58, 0.80], [0.50, 1.00]], color: RED },
  { poly: [[0.70, 0.00], [1.00, 1.00], [0.75, 1.00], [0.67, 0.55]], color: YELLOW },
]

const inside = (poly, x, y) => {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

const crc32 = buf => {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const chunk = (type, data) => {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

const encodePng = (size, pixels) => {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/**
 * @param size    output edge length in pixels
 * @param padding fraction of the canvas kept clear around the mark. Maskable
 *                icons need a generous safe zone because launchers crop them.
 */
const renderIcon = (size, padding) => {
  const pixels = Buffer.alloc(size * size * 4)
  const samples = 3 // supersampling factor, keeps the diagonals smooth
  const markSize = size * (1 - padding * 2)
  const markX = size * padding
  // The mark is wider than it is tall; centre it on the square canvas.
  const markH = markSize * 0.86
  const markY = (size - markH) / 2
  const radius = size * 0.22

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const px = x + (sx + 0.5) / samples
          const py = y + (sy + 0.5) / samples

          // Rounded-square background.
          const cx = Math.min(Math.max(px, radius), size - radius)
          const cy = Math.min(Math.max(py, radius), size - radius)
          if (Math.hypot(px - cx, py - cy) > radius) continue

          let color = NAVY
          const mx = (px - markX) / markSize
          const my = (py - markY) / markH
          if (mx >= 0 && mx <= 1 && my >= 0 && my <= 1 && inside(MARK, mx, my)) {
            color = WHITE
            for (const stripe of STRIPES) {
              if (inside(stripe.poly, mx, my)) { color = stripe.color; break }
            }
          }
          r += color[0]; g += color[1]; b += color[2]; a += 255
        }
      }
      const total = samples * samples
      const i = (y * size + x) * 4
      pixels[i] = Math.round(r / total)
      pixels[i + 1] = Math.round(g / total)
      pixels[i + 2] = Math.round(b / total)
      pixels[i + 3] = Math.round(a / total)
    }
  }
  return encodePng(size, pixels)
}

const outDir = join(process.cwd(), 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const targets = [
  { file: 'icon-192.png', size: 192, padding: 0.16 },
  { file: 'icon-512.png', size: 512, padding: 0.16 },
  { file: 'icon-maskable-512.png', size: 512, padding: 0.26 },
  { file: 'apple-touch-icon.png', size: 180, padding: 0.14 },
  { file: 'favicon-32.png', size: 32, padding: 0.10 },
]

for (const { file, size, padding } of targets) {
  writeFileSync(join(outDir, file), renderIcon(size, padding))
  console.log(`[icons] public/icons/${file} (${size}×${size})`)
}
