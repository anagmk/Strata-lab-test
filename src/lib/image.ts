import type { Pt } from './calc'

/** Downscale an uploaded photo so it fits in browser storage. */
export function fileToStoredImage(file: File, maxDim = 1200, quality = 0.8): Promise<{ image: string; imgW: number; imgH: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k)
      const c = document.createElement('canvas'); c.width = w; c.height = h
      const g = c.getContext('2d')
      if (!g) { URL.revokeObjectURL(url); return reject(new Error('Canvas not available')) }
      g.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve({ image: c.toDataURL('image/jpeg', quality), imgW: w, imgH: h })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This file could not be read as an image.')) }
    img.src = url
  })
}

/**
 * A synthetic "try it" photo: grey concrete texture, a 50 mm ruler and one crack
 * whose width varies. Drawn with canvas, so no real specimen is implied.
 * Scale: 10 px per mm.
 */
export function makeExampleCrackImage() {
  const W = 1000, H = 700, PX_MM = 10
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#a9a8a3'; g.fillRect(0, 0, W, H)
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 9000; i++) { const v = 150 + Math.floor(rnd() * 50); g.fillStyle = `rgba(${v},${v},${v - 4},0.35)`; g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 3, 2 + rnd() * 3) }

  const keys: [number, number][] = [[0, 2], [150, 3], [300, 5], [450, 2], [700, 2.5]]
  const wAt = (y: number) => { for (let i = 1; i < keys.length; i++) if (y <= keys[i][0]) { const [y0, w0] = keys[i - 1], [y1, w1] = keys[i]; return w0 + ((w1 - w0) * (y - y0)) / (y1 - y0) } return keys[keys.length - 1][1] }
  const cx = (y: number) => 480 + 38 * Math.sin(y / 70) + 14 * Math.sin(y / 23)
  const L: Pt[] = [], R: Pt[] = []
  for (let y = 0; y <= 600; y += 4) { L.push({ x: cx(y) - wAt(y) / 2, y }); R.push({ x: cx(y) + wAt(y) / 2, y }) }
  g.fillStyle = '#1f1e1c'; g.beginPath()
  L.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)))
  R.slice().reverse().forEach(p => g.lineTo(p.x, p.y)); g.closePath(); g.fill()

  // ruler along the bottom: 50 mm = 500 px
  g.fillStyle = '#f3f0e6'; g.fillRect(250, 630, 520, 44)
  g.strokeStyle = '#111'; g.fillStyle = '#111'; g.lineWidth = 2; g.font = '14px sans-serif'
  for (let mm = 0; mm <= 50; mm++) { const x = 260 + mm * PX_MM; g.beginPath(); g.moveTo(x, 630); g.lineTo(x, 630 + (mm % 10 === 0 ? 22 : mm % 5 === 0 ? 16 : 9)); g.stroke(); if (mm % 10 === 0) g.fillText(String(mm / 10), x - 4, 668) }
  g.fillText('cm', 700, 668)

  const across = (y: number): { a: Pt; b: Pt; note: string } => ({ a: { x: cx(y) - wAt(y) / 2, y }, b: { x: cx(y) + wAt(y) / 2, y }, note: `${y} px from top` })
  return {
    image: c.toDataURL('image/jpeg', 0.8), imgW: W, imgH: H, exampleImage: true,
    scaleMm: 50, scale: [{ x: 260, y: 640 }, { x: 760, y: 640 }] as Pt[],
    cracks: [across(150), across(300), across(450)].map((k, i) => ({ ...k, note: ['upper', 'middle', 'lower'][i] })),
  }
}

/* ---------------- Edge snapping for the crack measurement ---------------- */

/**
 * Find the dark crack in a brightness profile sampled along a line drawn across it.
 * Width is measured at half-depth between the crack floor and the surrounding surface,
 * with sub-sample interpolation at both edges. Returns sample positions (i0 < i1), or
 * null when there is no clear dark band or it runs off either end of the line.
 */
export function crackEdges(profile: number[]): { i0: number; i1: number } | null {
  const n = profile.length
  if (n < 9) return null
  const s = profile.map((_, i) => { let t = 0, c = 0; for (let k = -1; k <= 1; k++) { const v = profile[i + k]; if (v != null) { t += v; c++ } } return t / c })
  let m = 0; for (let i = 1; i < n; i++) if (s[i] < s[m]) m = i
  const sorted = [...s].sort((a, b) => a - b)
  const bg = sorted[Math.floor(n * 0.75)]            // surface level: upper quartile, robust to the crack itself
  const lo = s[m]
  if (bg - lo < 30) return null                      // not enough contrast to call it a crack
  const th = (bg + lo) / 2
  let l = m; while (l > 0 && s[l] < th) l--
  let r = m; while (r < n - 1 && s[r] < th) r++
  if (l === 0 || r === n - 1) return null            // band touches the end: line does not cross the whole crack
  const cross = (i: number, j: number) => i + ((th - s[i]) / (s[j] - s[i])) * (j - i)
  return { i0: cross(l, l + 1), i1: cross(r, r - 1) }
}

/** Gray values of an image, read once from the stored data URL. */
export function loadGray(src: string): Promise<{ w: number; h: number; px: Uint8ClampedArray }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
      const g = c.getContext('2d', { willReadFrequently: true })
      if (!g) return reject(new Error('Canvas not available'))
      g.drawImage(img, 0, 0)
      const d = g.getImageData(0, 0, c.width, c.height).data
      const px = new Uint8ClampedArray(c.width * c.height)
      for (let i = 0; i < px.length; i++) px[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]
      resolve({ w: c.width, h: c.height, px })
    }
    img.onerror = () => reject(new Error('Image could not be read'))
    img.src = src
  })
}

/** Snap a hand-drawn line a→b to the crack edges along it. null if no crack is found. */
export function snapAcross(gray: { w: number; h: number; px: Uint8ClampedArray }, a: Pt, b: Pt): { a: Pt; b: Pt } | null {
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  if (len < 6) return null
  const n = Math.ceil(len * 2) + 1, ux = (b.x - a.x) / (n - 1), uy = (b.y - a.y) / (n - 1)
  const at = (x: number, y: number) => {
    const X = Math.min(gray.w - 1.001, Math.max(0, x)), Y = Math.min(gray.h - 1.001, Math.max(0, y))
    const x0 = Math.floor(X), y0 = Math.floor(Y), fx = X - x0, fy = Y - y0, p = gray.px, W = gray.w
    return p[y0 * W + x0] * (1 - fx) * (1 - fy) + p[y0 * W + x0 + 1] * fx * (1 - fy) + p[(y0 + 1) * W + x0] * (1 - fx) * fy + p[(y0 + 1) * W + x0 + 1] * fx * fy
  }
  const prof = Array.from({ length: n }, (_, i) => at(a.x + ux * i, a.y + uy * i))
  const e = crackEdges(prof)
  if (!e) return null
  return { a: { x: a.x + ux * e.i0, y: a.y + uy * e.i0 }, b: { x: a.x + ux * e.i1, y: a.y + uy * e.i1 } }
}
