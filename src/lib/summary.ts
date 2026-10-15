import { cubeStrength, sieveAnalysis, proctor, crackAnalysis, type Verdict } from './calc'
import { f1, f2 } from './format'
import { KINDS, type CrackData, type CubeData, type DB, type ProctorData, type Run, type SieveData } from './db'

export interface FlagItem { runId: string; sampleId: string; severity: 'warn' | 'fail'; reason: string; detail: string; at: string }
export interface Summary { complete: boolean; verdict: Verdict; result: string; flags: Omit<FlagItem, 'runId' | 'sampleId' | 'at'>[] }

/** Result text, verdict and rule-based flags for one run. Used by every table, the dashboard and the AI Insights page. */
export function summarize(run: Run): Summary {
  const flags: Summary['flags'] = []

  if (run.kind === 'cube') {
    const d = run.data as CubeData
    const r = cubeStrength({ grade: d.grade, sizeMm: d.sizeMm, loads: d.loads })
    if (r.n >= 2) {
      r.strengths.forEach((s, i) => {
        const dev = r.deviations[i]
        if (s != null && dev != null && dev < -15) flags.push({ severity: 'fail', reason: `Cube ${i + 1} strength ${Math.abs(dev).toFixed(0)}% below the mean`, detail: `${f1(s)} MPa against a mean of ${f1(r.mean)} MPa. Check the cube for defects and the load reading.` })
      })
    }
    if (r.complete && r.verdict === 'fail') flags.push({ severity: 'fail', reason: `M${d.grade} acceptance rule not met`, detail: `Mean ${f1(r.mean)} MPa (needs ≥ ${f1(r.meanLimit)}), lowest cube ${f1(r.min)} MPa (needs ≥ ${f1(r.indivLimit)}).` })
    return { complete: r.complete, verdict: r.verdict, result: r.n ? `${f1(r.mean)} MPa mean` : '—', flags }
  }

  if (run.kind === 'sieve') {
    const d = run.data as SieveData
    const r = sieveAnalysis(d.retained, d.pan, d.zone)
    if (r.outside.length) flags.push({ severity: 'fail', reason: `Grading outside Zone ${d.zone} on ${r.outside.length} sieve${r.outside.length > 1 ? 's' : ''}`, detail: r.outside.join(', ') })
    return { complete: r.complete, verdict: r.verdict, result: r.total ? `FM ${f2(r.fm)}` : '—', flags }
  }

  if (run.kind === 'crack') {
    const d = run.data as CrackData
    const r = crackAnalysis({ scale: d.scale, scaleMm: d.scaleMm, cracks: d.cracks, limit: d.limit, imgW: d.imgW })
    if (r.complete && r.max > d.limit) flags.push({ severity: 'fail', reason: `Crack width ${f2(r.max)} mm exceeds the ${d.limit.toFixed(1)} mm limit`, detail: `${r.widths.filter(w => w > d.limit).length} of ${r.n} marked locations are over the limit. Confirm with a crack comparator or microscope.` })
    if (r.complete && r.mmPerPx > d.limit / 4) flags.push({ severity: 'warn', reason: 'Photo resolution is coarse for this limit', detail: `One pixel is ${r.mmPerPx.toFixed(2)} mm, so a ${d.limit.toFixed(1)} mm crack is only ${(d.limit / r.mmPerPx).toFixed(1)} px wide. Retake closer to the crack.` })
    return { complete: r.complete, verdict: r.verdict, result: r.n ? `${f2(r.max)} mm widest` : '—', flags }
  }

  const d = run.data as ProctorData
  const r = proctor({ mouldMass: d.mouldMass, mouldVolume: d.mouldVolume, gs: d.gs, designMdd: d.designMdd, points: d.points })
  if (r.mdd && r.pts.length) {
    const lo = Math.min(...r.pts.map(p => p.w)), hi = Math.max(...r.pts.map(p => p.w))
    if (r.omc < lo || r.omc > hi) flags.push({ severity: 'warn', reason: 'Peak of the curve is outside the tested moisture range', detail: `OMC ${f1(r.omc)} % against tested ${lo}–${hi} %. Add points on the missing side.` })
  }
  if (r.complete && r.verdict === 'fail') flags.push({ severity: 'fail', reason: 'MDD below the design value', detail: `${f2(r.mdd)} g/cc against ≥ ${f2(d.designMdd)} g/cc.` })
  return { complete: r.complete, verdict: r.verdict, result: r.mdd ? `MDD ${f2(r.mdd)} g/cc` : '—', flags }
}

export function allFlags(db: DB): FlagItem[] {
  return db.runs.flatMap(run =>
    summarize(run).flags.map(f => ({ ...f, runId: run.id, sampleId: run.sampleId, at: run.createdAt })),
  ).sort((a, b) => (a.severity === b.severity ? b.at.localeCompare(a.at) : a.severity === 'fail' ? -1 : 1))
}

export const runTitle = (r: Run) => KINDS[r.kind].short
export function inRange(iso: string, range: string) {
  if (range === 'all') return true
  return Date.now() - new Date(iso).getTime() <= Number(range) * 86400000
}
