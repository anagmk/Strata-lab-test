import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
import {
  type DB, type Run, type Kind, type MaterialKey, type Role, type Settings, type Batch,
  emptyDB, loadDB, saveDB, nowISO, todayISO, pad, newRunData, exampleData, MATERIALS,
} from './db'

/**
 * The store is the app's "API". Every action here maps 1:1 to a backend call
 * (see README), so swapping localStorage for Express + MongoDB means
 * re-implementing these functions and nothing else.
 */
export interface Actions {
  addProject(p: { name: string; location: string }): string
  addBatch(b: { projectId: string; name: string; material: MaterialKey; grade: number | null; note: string }): string
  addSample(s: { projectId: string; batchId: string; material: MaterialKey; description: string; receivedOn: string }): string
  addRun(r: { sampleId: string; kind: Kind }): string
  updateRun(id: string, fn: (r: Run) => Run): void
  useExample(id: string): void
  submitRun(id: string): void
  reviewRun(id: string, approve: boolean, comment: string): void
  deleteRun(id: string): void
  addEquipment(e: { name: string; location: string; due: string }): void
  deleteEquipment(id: string): void
  setSettings(s: Partial<Settings>): void
  setRole(r: Role): void
  exportJSON(): string
  importJSON(text: string): string | null
  clearAll(): void
}

const Ctx = createContext<{ db: DB; act: Actions; storageOk: boolean } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(loadDB)
  const [storageOk, setStorageOk] = useState(true)
  const ref = useRef(db)

  const commit = (next: DB) => { ref.current = next; setDb(next); setStorageOk(saveDB(next)) }
  const cur = () => ref.current
  const who = () => cur().settings.user

  const act: Actions = {
    addProject(p) {
      const d = cur(); const n = d.seq.project + 1; const id = `P-${pad(n, 2)}`
      commit({ ...d, seq: { ...d.seq, project: n }, projects: [...d.projects, { id, name: p.name.trim(), location: p.location.trim(), createdAt: nowISO() }], settings: { ...d.settings, currentProject: id } })
      return id
    },
    addBatch(b) {
      const d = cur(); const n = d.seq.batch + 1; const id = `B-${pad(n)}`
      commit({ ...d, seq: { ...d.seq, batch: n }, batches: [...d.batches, { id, ...b, name: b.name.trim(), createdAt: nowISO() }] })
      return id
    },
    addSample(s) {
      const d = cur(); const n = d.seq.sample + 1
      const prefix = MATERIALS.find(m => m.key === s.material)?.prefix ?? 'GEN'
      const id = `S-${prefix}-${pad(n, 4)}`
      commit({ ...d, seq: { ...d.seq, sample: n }, samples: [...d.samples, { id, ...s, description: s.description.trim(), createdAt: nowISO() }] })
      return id
    },
    addRun({ sampleId, kind }) {
      const d = cur(); const n = d.seq.run + 1; const id = `T-${pad(n, 4)}`
      const sample = d.samples.find(s => s.id === sampleId)!
      const batch: Batch | undefined = d.batches.find(b => b.id === sample.batchId)
      const run: Run = {
        id, sampleId, projectId: sample.projectId, kind, status: 'draft', technician: d.settings.user,
        testDate: todayISO(), createdAt: nowISO(), data: newRunData(kind, batch?.grade ?? null),
        events: [{ at: nowISO(), by: d.settings.user, text: 'Test run created' }],
      }
      commit({ ...d, seq: { ...d.seq, run: n }, runs: [...d.runs, run] })
      return id
    },
    updateRun(id, fn) {
      const d = cur()
      commit({ ...d, runs: d.runs.map(r => (r.id === id ? fn(r) : r)) })
    },
    useExample(id) {
      const d = cur()
      commit({ ...d, runs: d.runs.map(r => (r.id === id ? { ...r, data: exampleData(r.kind, r.data), events: [...r.events, { at: nowISO(), by: who(), text: 'Example readings filled in' }] } : r)) })
    },
    submitRun(id) {
      const d = cur()
      commit({ ...d, runs: d.runs.map(r => (r.id === id ? { ...r, status: 'review', reviewComment: undefined, events: [...r.events, { at: nowISO(), by: who(), text: 'Submitted for review; readings locked' }] } : r)) })
    },
    reviewRun(id, approve, comment) {
      const d = cur()
      commit({
        ...d,
        runs: d.runs.map(r => (r.id !== id ? r : {
          ...r,
          status: approve ? 'approved' : 'rejected',
          reviewComment: comment.trim() || undefined,
          approvedBy: approve ? who() : undefined,
          approvedAt: approve ? nowISO() : undefined,
          events: [...r.events, { at: nowISO(), by: who(), text: approve ? `Approved${comment.trim() ? ': ' + comment.trim() : ''}` : `Sent back: ${comment.trim()}` }],
        })),
      })
    },
    deleteRun(id) { const d = cur(); commit({ ...d, runs: d.runs.filter(r => r.id !== id) }) },
    addEquipment(e) {
      const d = cur(); const n = d.seq.equip + 1
      commit({ ...d, seq: { ...d.seq, equip: n }, equipment: [...d.equipment, { id: `EQ-${pad(n, 2)}`, ...e, name: e.name.trim(), location: e.location.trim() }] })
    },
    deleteEquipment(id) { const d = cur(); commit({ ...d, equipment: d.equipment.filter(e => e.id !== id) }) },
    setSettings(s) { const d = cur(); commit({ ...d, settings: { ...d.settings, ...s } }) },
    setRole(r) { const d = cur(); commit({ ...d, settings: { ...d.settings, role: r } }) },
    exportJSON() { return JSON.stringify(cur(), null, 2) },
    importJSON(text) {
      try {
        const p = JSON.parse(text)
        if (p?.v !== 1 || !Array.isArray(p.projects) || !Array.isArray(p.runs)) return 'This file is not a Strata Lab export.'
        commit({ ...emptyDB(), ...p, settings: { ...emptyDB().settings, ...p.settings }, seq: { ...emptyDB().seq, ...p.seq } })
        return null
      } catch { return 'Could not read the file as JSON.' }
    },
    clearAll() { commit(emptyDB()) },
  }

  return <Ctx.Provider value={{ db, act, storageOk }}>{children}</Ctx.Provider>
}

export function useStore() {
  const c = useContext(Ctx)
  if (!c) throw new Error('StoreProvider missing')
  return c
}
