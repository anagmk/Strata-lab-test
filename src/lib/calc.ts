/**
 * Pure calculation functions. In the real product these live on the
 * Node/Express API (`POST /tests/:id/calculate`) so the formula exists once.
 * Blank readings are `null`; every function copes with them and reports `complete`.
 */

export type Verdict = 'pass' | 'warn' | 'fail' | 'info'
type N = number | null

const ok = (x: N | undefined): x is number => x != null && Number.isFinite(x)

/* ---------------- Concrete cube compressive strength (IS 516) ---------------- */

export interface CubeInput { grade: number; sizeMm: number; loads: N[] }
export interface CubeResult {
  strengths: N[]            // MPa, null where the load is blank
  n: number
  complete: boolean
  mean: number
  min: number
  sd: number
  meanLimit: number         // fck + 3
  indivLimit: number        // fck - 3
  deviations: N[]           // % vs mean
  verdict: Verdict
  checks: { label: string; value: string; limit: string; ok: boolean }[]
}

export function cubeStrength(i: CubeInput): CubeResult {
  const area = i.sizeMm * i.sizeMm // mm2
  const strengths = i.loads.map(l => (ok(l) && l > 0 ? (l * 1000) / area : null))
  const valid = strengths.filter(ok)
  const n = valid.length
  const mean = n ? valid.reduce((a, b) => a + b, 0) / n : 0
  const min = n ? Math.min(...valid) : 0
  const sd = n > 1 ? Math.sqrt(valid.reduce((a, s) => a + (s - mean) ** 2, 0) / (n - 1)) : 0
  const meanLimit = i.grade + 3
  const indivLimit = i.grade - 3
  const deviations = strengths.map(s => (ok(s) && mean ? ((s - mean) / mean) * 100 : null))
  const complete = n > 0 && n === i.loads.length
  const okMean = mean >= meanLimit
  const okIndiv = min >= indivLimit
  return {
    strengths, n, complete, mean, min, sd, meanLimit, indivLimit, deviations,
    verdict: !complete ? 'warn' : okMean && okIndiv ? 'pass' : 'fail',
    checks: [
      { label: 'Mean strength', value: n ? `${mean.toFixed(1)} MPa` : '—', limit: `≥ ${meanLimit.toFixed(1)} MPa`, ok: n > 0 && okMean },
      { label: 'Lowest cube', value: n ? `${min.toFixed(1)} MPa` : '—', limit: `≥ ${indivLimit.toFixed(1)} MPa`, ok: n > 0 && okIndiv },
    ],
  }
}

/* ---------------- Sieve analysis, fine aggregate (IS 2386 Pt 1 / IS 383) ---------------- */

export type Zone = 'I' | 'II' | 'III' | 'IV'
export interface SieveSpec { size: string; mm: number }
export const SIEVES: SieveSpec[] = [
  { size: '10 mm', mm: 10 }, { size: '4.75 mm', mm: 4.75 }, { size: '2.36 mm', mm: 2.36 },
  { size: '1.18 mm', mm: 1.18 }, { size: '600 µm', mm: 0.6 }, { size: '300 µm', mm: 0.3 }, { size: '150 µm', mm: 0.15 },
]
export interface ZoneLimit { lo: number; hi: number }

/** IS 383 grading zones for fine aggregate — % passing. Confirm against the current edition before use. */
export const ZONES: Record<Zone, Record<string, ZoneLimit>> = {
  I:   { '10 mm': { lo: 100, hi: 100 }, '4.75 mm': { lo: 90, hi: 100 }, '2.36 mm': { lo: 60, hi: 95 },  '1.18 mm': { lo: 30, hi: 70 },  '600 µm': { lo: 15, hi: 34 }, '300 µm': { lo: 5, hi: 20 },  '150 µm': { lo: 0, hi: 10 } },
  II:  { '10 mm': { lo: 100, hi: 100 }, '4.75 mm': { lo: 90, hi: 100 }, '2.36 mm': { lo: 75, hi: 100 }, '1.18 mm': { lo: 55, hi: 90 },  '600 µm': { lo: 35, hi: 59 }, '300 µm': { lo: 8, hi: 30 },  '150 µm': { lo: 0, hi: 10 } },
  III: { '10 mm': { lo: 100, hi: 100 }, '4.75 mm': { lo: 90, hi: 100 }, '2.36 mm': { lo: 85, hi: 100 }, '1.18 mm': { lo: 75, hi: 100 }, '600 µm': { lo: 60, hi: 79 }, '300 µm': { lo: 12, hi: 40 }, '150 µm': { lo: 0, hi: 10 } },
  IV:  { '10 mm': { lo: 95, hi: 100 },  '4.75 mm': { lo: 95, hi: 100 }, '2.36 mm': { lo: 95, hi: 100 }, '1.18 mm': { lo: 90, hi: 100 }, '600 µm': { lo: 80, hi: 100 }, '300 µm': { lo: 15, hi: 50 }, '150 µm': { lo: 0, hi: 15 } },
}

export interface SieveResult {
  total: number
  complete: boolean
  rows: { size: string; mm: number; retained: N; pctRetained: number; cumRetained: number; passing: number; limit: ZoneLimit; ok: boolean }[]
  fm: number
  verdict: Verdict
  outside: string[]
}

export function sieveAnalysis(retained: N[], pan: N, zone: Zone): SieveResult {
  const total = retained.reduce<number>((a, r) => a + (ok(r) ? r : 0), 0) + (ok(pan) ? pan : 0)
  const complete = total > 0 && retained.every(ok) && ok(pan)
  let cum = 0
  const rows = SIEVES.map((s, i) => {
    const r = retained[i]
    const pct = total ? ((ok(r) ? r : 0) / total) * 100 : 0
    cum += pct
    const passing = 100 - cum
    const limit = ZONES[zone][s.size]
    return { ...s, retained: r, pctRetained: pct, cumRetained: cum, passing, limit, ok: passing >= limit.lo - 0.05 && passing <= limit.hi + 0.05 }
  })
  // fineness modulus: sum of cumulative % retained on 4.75 mm … 150 µm sieves / 100
  const fm = rows.filter(r => r.mm <= 4.75).reduce((a, r) => a + r.cumRetained, 0) / 100
  const outside = total ? rows.filter(r => !r.ok).map(r => r.size) : []
  return { total, complete, rows, fm, outside, verdict: !complete ? 'warn' : outside.length ? 'fail' : 'pass' }
}

/* ---------------- Standard Proctor compaction (IS 2720 Pt 7) ---------------- */

export interface ProctorInput { mouldMass: N; mouldVolume: number; gs: number; designMdd: N; points: { w: N; mass: N }[] }
export interface ProctorResult {
  pts: { w: number; bulk: number; dry: number }[]
  rowDry: N[]               // per input row, null if the row is incomplete
  rowBulk: N[]
  complete: boolean
  mdd: number
  omc: number
  fit: { w: number; dry: number }[]
  zav: { w: number; dry: number }[]
  verdict: Verdict
}

/** least-squares quadratic through the points; the vertex gives OMC / MDD */
function quadFit(xs: number[], ys: number[]) {
  const n = xs.length
  const s = (p: number) => xs.reduce((a, x) => a + x ** p, 0)
  const t = (p: number) => xs.reduce((a, x, i) => a + ys[i] * x ** p, 0)
  const A = [[s(4), s(3), s(2)], [s(3), s(2), s(1)], [s(2), s(1), n]]
  const b = [t(2), t(1), t(0)]
  const det = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  const D = det(A)
  if (Math.abs(D) < 1e-9) return null
  const col = (k: number) => A.map((row, r) => row.map((v, c) => (c === k ? b[r] : v)))
  return { a: det(col(0)) / D, b: det(col(1)) / D, c: det(col(2)) / D }
}

export const PROCTOR_MIN_POINTS = 5

export function proctor(i: ProctorInput): ProctorResult {
  const rowBulk: N[] = i.points.map(p => (ok(p.mass) && ok(i.mouldMass) && i.mouldVolume > 0 ? (p.mass - i.mouldMass) / i.mouldVolume : null))
  const rowDry: N[] = i.points.map((p, k) => (ok(rowBulk[k]) && ok(p.w) ? rowBulk[k]! / (1 + p.w / 100) : null))
  const pts = i.points.flatMap((p, k) => (ok(rowDry[k]) && ok(p.w) ? [{ w: p.w, bulk: rowBulk[k]!, dry: rowDry[k]! }] : []))
  const complete = pts.length >= PROCTOR_MIN_POINTS && pts.length === i.points.filter(p => ok(p.w) || ok(p.mass)).length
  const q = pts.length >= 3 ? quadFit(pts.map(p => p.w), pts.map(p => p.dry)) : null
  let omc = 0, mdd = 0
  if (q && q.a < 0) { omc = -q.b / (2 * q.a); mdd = q.a * omc ** 2 + q.b * omc + q.c }
  const lo = pts.length ? Math.min(...pts.map(p => p.w)) : 0
  const hi = pts.length ? Math.max(...pts.map(p => p.w)) : 0
  const grid = (f: (w: number) => number) => (hi > lo ? Array.from({ length: 41 }, (_, k) => { const w = lo + ((hi - lo) * k) / 40; return { w: +w.toFixed(2), dry: f(w) } }) : [])
  const fit = q ? grid(w => q.a * w * w + q.b * w + q.c) : []
  const zav = grid(w => i.gs / (1 + (w / 100) * i.gs))
  const verdict: Verdict = !complete || !mdd ? 'warn' : !ok(i.designMdd) ? 'info' : mdd >= i.designMdd ? 'pass' : 'fail'
  return { pts, rowDry, rowBulk, complete, mdd, omc, fit, zav, verdict }
}

/* ---------------- Crack width from a photo (IS 456 cl. 35.3) ---------------- */

export interface Pt { x: number; y: number }
export interface CrackInput { scale: Pt[]; scaleMm: N; cracks: { a: Pt; b: Pt }[]; limit: number; imgW: number }
export interface CrackResult {
  mmPerPx: number           // 0 until the scale is set
  scalePx: number
  widths: number[]          // mm, one per marked crack
  n: number
  max: number
  mean: number
  complete: boolean
  verdict: Verdict
  checks: { label: string; value: string; limit: string; ok: boolean }[]
}

export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

export function crackAnalysis(i: CrackInput): CrackResult {
  const scalePx = i.scale.length === 2 ? dist(i.scale[0], i.scale[1]) : 0
  const mmPerPx = scalePx > 0 && ok(i.scaleMm) && i.scaleMm > 0 ? i.scaleMm / scalePx : 0
  const widths = mmPerPx ? i.cracks.map(c => dist(c.a, c.b) * mmPerPx) : []
  const n = widths.length
  const max = n ? Math.max(...widths) : 0
  const mean = n ? widths.reduce((a, b) => a + b, 0) / n : 0
  const complete = mmPerPx > 0 && n > 0
  return {
    mmPerPx, scalePx, widths, n, max, mean, complete,
    verdict: !complete ? 'warn' : max <= i.limit ? 'pass' : 'fail',
    checks: [
      { label: 'Widest crack', value: n ? `${max.toFixed(2)} mm` : '—', limit: `≤ ${i.limit.toFixed(1)} mm`, ok: n > 0 && max <= i.limit },
      { label: 'Scale set from photo', value: mmPerPx ? `${(1 / mmPerPx).toFixed(1)} px/mm` : '—', limit: 'required', ok: mmPerPx > 0 },
    ],
  }
}
