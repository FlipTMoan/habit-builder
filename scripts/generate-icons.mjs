// Generates PWA icons as PNGs with no external dependencies.
// Usage: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const AA = 1.5

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r)
  const qy = Math.abs(py - cy) - (hh - r)
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r
}

function sdCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r
}

function sdAnnulus(px, py, cx, cy, r, w) {
  return Math.abs(Math.hypot(px - cx, py - cy) - r) - w
}

// coverage in [-1,1] style alpha: returns alpha 0..1
function glyphAlpha(x, y, size) {
  const cx = size / 2
  const cy = size / 2
  const ringR = size * 0.32
  const ringW = size * 0.11
  const dotR = size * 0.075
  const acx = cx + ringR * 0.9
  const acy = cy - ringR * 0.5
  const a = smoothstep(AA, -AA, sdAnnulus(x, y, cx, cy, ringR, ringW))
  const b = smoothstep(AA, -AA, sdCircle(x, y, acx, acy, dotR))
  return Math.min(1, a + b)
}

function backgroundRGB(x, y, size) {
  const t = (y / size) * 2 - 1 // -1 top .. 1 bottom
  const stop = (t + 1) / 2
  const top = [139, 92, 246]
  const mid = [99, 102, 241]
  const bot = [30, 27, 75]
  let r, g, b
  if (stop < 0.5) {
    const k = stop * 2
    r = top[0] + (mid[0] - top[0]) * k
    g = top[1] + (mid[1] - top[1]) * k
    b = top[2] + (mid[2] - top[2]) * k
  } else {
    const k = (stop - 0.5) * 2
    r = mid[0] + (bot[0] - mid[0]) * k
    g = mid[1] + (bot[1] - mid[1]) * k
    b = mid[2] + (bot[2] - mid[2]) * k
  }
  return [r, g, b]
}

function renderPixel(x, y, size, opts = {}) {
  const pad = opts.pad
  let rx = x
  let ry = y
  let s = size
  if (pad) {
    const scale = 1 - pad * 2
    // sample within shrunk coordinate space
    rx = (x - pad * s) / scale
    ry = (y - pad * s) / scale
    s = size * scale
  }
  const bg = backgroundRGB(rx, ry, s)
  const edge = smoothstep(AA, -AA, sdRoundRect(rx, ry, s / 2, s / 2, (s / 2) * 0.985, (s / 2) * 0.985, s * 0.2))
  const glyph = glyphAlpha(rx, ry, s)
  const isIcon = opts.rounded // regular icons have rounded-corner transparency; maskable fills full canvas
  let final = [0, 0, 0, 0]
  if (isIcon) {
    // outside rounded rect -> transparent
    if (edge <= 0) return final
  }
  const alpha = edge
  const mix = glyph
  final[0] = Math.round(bg[0] + (255 - bg[0]) * mix)
  final[1] = Math.round(bg[1] + (255 - bg[1]) * mix)
  final[2] = Math.round(bg[2] + (255 - bg[2]) * mix)
  final[3] = Math.round(255 * alpha)
  return final
}

// --- minimal PNG encoder ---
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePNG(size, opts) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = renderPixel(x, y, size, opts)
      raw[p++] = r
      raw[p++] = g
      raw[p++] = b
      raw[p++] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const targets = [
  { size: 192, file: 'icon-192.png', opts: { rounded: true } },
  { size: 512, file: 'icon-512.png', opts: { rounded: true } },
  { size: 512, file: 'icon-512-maskable.png', opts: { rounded: false, pad: 0.12 } },
]

for (const t of targets) {
  writeFileSync(join(outDir, t.file), encodePNG(t.size, t.opts))
  console.log('wrote', t.file)
}