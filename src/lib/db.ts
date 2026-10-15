import { todayISO } from './format'
import { SIEVES } from './calc'
import type { Zone, Pt } from './calc'
import { makeExampleCrackImage } from './image'

/* ------------------------------------------------------------------
   Data model. Everything is plain JSON so the same shapes can later be
   served by the Node/MongoDB API (collections: projects, batches,
   samples, runs, equipment).
   ------------------------------------------------------------------ */

export type Role = 'technician' | 'engineer'
export type Kind = 'cube' | 'sieve' | 'proctor' | 'crack'
export type Flow = 'draft' | 'review' | 'approved' | 'rejected'
export type MaterialKey = 'concrete' | 'fine-agg' | 'soil' | 'other'
type N = number | null

export const MATERIALS: { key: MaterialKey; label: string; prefix: string; suggest: Kind | null }[] = [
  { key: 'concrete', label: 'Concrete (cubes)', prefix: 'CUB', suggest: 'cube' },
  { key: 'fine-agg', label: 'Fine aggregate (sand)', prefix: 'FAG', suggest: 'sieve' },
  { key: 'soil', label: 'Soil', prefix: 'SOL', suggest: 'proctor' },
  { key: 'other', label: 'Other', prefix: 'GEN', suggest: null },
]
export const materialLabel = (k: MaterialKey) => MATERIALS.find(m => m.key === k)?.label ?? k

export const KINDS: Record<Kind, { title: string; code: string; standard: string; short: string }> = {
  cube: { title: 'Concrete cube compressive strength', code: 'CON-02', standard: 'IS 516 (Pt 1)', short: 'Cube strength' },
  sieve: { title: 'Sieve analysis, fine aggregate', code: 'AGG-01', standard: 'IS 2386 (Pt 1) / IS 383', short: 'Sieve analysis' },
  proctor: { title: 'Standard Proctor compaction', code: 'SOL-03', standard: 'IS 2720 (Pt 7)', short: 'Proctor compaction' },
  crack: { title: 'Concrete crack width from photo', code: 'NDT-03', standard: 'IS 456 (cl. 35.3)', short: 'Crack width (photo)' },
}

export interface Project { id: string; name: string; location: string; createdAt: string }
export interface Batch { id: string; projectId: string; name: string; material: MaterialKey; grade: number | null; note: string; createdAt: string }
export interface Sample { id: string; projectId: string; batchId: string; material: MaterialKey; description: string; receivedOn: string; createdAt: string }
export interface RunEvent { at: string; by: string; text: string }

export interface CubeData { grade: number; sizeMm: number; ageDays: number; loads: N[] }
export interface SieveData { zone: Zone; pan: N; retained: N[] }
export interface ProctorData { mouldMass: N; mouldVolume: number; gs: number; designMdd: N; points: { w: N; mass: N }[] }

export interface CrackData { image: string | null; imgW: number; imgH: number; scaleMm: N; scale: Pt[]; limit: number; cracks: { a: Pt; b: Pt; note: string; snapped?: boolean }[]; exampleImage?: boolean }

export interface Run {
  id: string
  sampleId: string
  projectId: string
  kind: Kind
  status: Flow
  technician: string
  testDate: string
  createdAt: string
  data: CubeData | SieveData | ProctorData | CrackData
  events: RunEvent[]
  reviewComment?: string
  approvedBy?: string
  approvedAt?: string
}
export interface Equipment { id: string; name: string; location: string; due: string }
export interface Settings { labName: string; user: string; role: Role; currentProject: string; range: '7' | '30' | '90' | 'all' }

export interface DB {
  v: 1
  seq: { project: number; batch: number; sample: number; run: number; equip: number }
  settings: Settings
  projects: Project[]
  batches: Batch[]
  samples: Sample[]
  runs: Run[]
  equipment: Equipment[]
}

export const emptyDB = (): DB => ({
  v: 1,
  seq: { project: 0, batch: 0, sample: 0, run: 0, equip: 0 },
  settings: { labName: 'Materials Testing Laboratory', user: 'Lab user', role: 'technician', currentProject: 'all', range: 'all' },
  projects: [], batches: [], samples: [], runs: [], equipment: [],
})

/** fresh, blank readings for a new test run */
export function newRunData(kind: Kind, batchGrade: number | null): Run['data'] {
  if (kind === 'cube') return { grade: batchGrade ?? 25, sizeMm: 150, ageDays: 28, loads: [null, null, null] } as CubeData
  if (kind === 'sieve') return { zone: 'II', pan: null, retained: SIEVES.map(() => null) } as SieveData
  if (kind === 'crack') return { image: null, imgW: 0, imgH: 0, scaleMm: null, scale: [], limit: 0.3, cracks: [] } as CrackData
  return { mouldMass: null, mouldVolume: 1000, gs: 2.65, designMdd: null, points: [0, 1, 2, 3, 4].map(() => ({ w: null, mass: null })) } as ProctorData
}

/** optional "try it" readings so a first run does not need a lab bench */
export function exampleData(kind: Kind, base: Run['data']): Run['data'] {
  if (kind === 'cube') return { ...(base as CubeData), loads: [612, 640, 470] }
  if (kind === 'sieve') return { ...(base as SieveData), zone: 'II', retained: [0, 38, 92, 178, 262, 258, 132], pan: 40 }
  if (kind === 'crack') return { ...(base as CrackData), ...makeExampleCrackImage(), limit: 0.3 }
  return {
    ...(base as ProctorData), mouldMass: 4200, designMdd: 1.8,
    points: [[8, 6058], [10, 6180], [12, 6272], [14, 6275], [16, 6218]].map(([w, mass]) => ({ w, mass })),
  }
}

const KEY = 'strata-lab.v1'

export function loadDB(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyDB()
    const p = JSON.parse(raw)
    if (p?.v !== 1) return emptyDB()
    return { ...emptyDB(), ...p, settings: { ...emptyDB().settings, ...p.settings }, seq: { ...emptyDB().seq, ...p.seq } }
  } catch { return emptyDB() }
}
export function saveDB(db: DB): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(db)); return true } catch { return false /* storage full or unavailable: data stays in memory for this session */ }
}
export const pad = (n: number, w = 3) => String(n).padStart(w, '0')
export const nowISO = () => new Date().toISOString()
export { todayISO }
