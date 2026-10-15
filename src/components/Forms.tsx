import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { KINDS, MATERIALS, materialLabel, todayISO, type Kind, type MaterialKey } from '../lib/db'
import { Field, FormCard, Select, TextInput } from './ui'

const GRADES = [15, 20, 25, 30, 35, 40]

export function NewProjectForm({ onDone }: { onDone?: (id: string) => void }) {
  const { act } = useStore()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  return (
    <FormCard title="New project" submit="Create project" disabled={!name.trim()}
      onSubmit={() => { const id = act.addProject({ name, location }); setName(''); setLocation(''); onDone?.(id) }}>
      <Field label="Project name"><TextInput value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Block C foundations" required autoFocus /></Field>
      <Field label="Location (optional)"><TextInput value={location} onChange={e => setLocation(e.target.value)} placeholder="Site or address" /></Field>
    </FormCard>
  )
}

export function NewBatchForm({ projectId, onDone }: { projectId: string; onDone?: (id: string) => void }) {
  const { act } = useStore()
  const [name, setName] = useState('')
  const [material, setMaterial] = useState<MaterialKey>('concrete')
  const [grade, setGrade] = useState(25)
  const [note, setNote] = useState('')
  return (
    <FormCard title="New batch" submit="Add batch" disabled={!name.trim()}
      note="A batch groups samples from one pour, one source or one borehole."
      onSubmit={() => { const id = act.addBatch({ projectId, name, material, grade: material === 'concrete' ? grade : null, note }); setName(''); setNote(''); onDone?.(id) }}>
      <Field label="Batch name"><TextInput value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Slab L2 pour, 14 Oct" required /></Field>
      <Field label="Material">
        <Select value={material} onChange={e => setMaterial(e.target.value as MaterialKey)}>
          {MATERIALS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
        </Select>
      </Field>
      {material === 'concrete' && (
        <Field label="Grade of concrete"><Select value={grade} onChange={e => setGrade(+e.target.value)}>{GRADES.map(g => <option key={g} value={g}>M{g} (fck {g} MPa)</option>)}</Select></Field>
      )}
      <Field label="Note (optional)"><TextInput value={note} onChange={e => setNote(e.target.value)} placeholder="Mix ID, supplier, borehole depth…" /></Field>
    </FormCard>
  )
}

export function NewSampleForm({ fixedProject, onDone }: { fixedProject?: string; onDone?: (id: string) => void }) {
  const { db, act } = useStore()
  const first = fixedProject ?? (db.settings.currentProject !== 'all' ? db.settings.currentProject : db.projects[0]?.id ?? '')
  const [projectId, setProjectId] = useState(first)
  const batches = db.batches.filter(b => b.projectId === projectId)
  const [batchId, setBatchId] = useState('')
  const [description, setDescription] = useState('')
  const [receivedOn, setReceivedOn] = useState(todayISO())

  useEffect(() => { if (!projectId && first) setProjectId(first) }, [first, projectId])
  useEffect(() => { if (!batches.some(b => b.id === batchId)) setBatchId(batches[0]?.id ?? '') }, [projectId, batches.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const batch = batches.find(b => b.id === batchId)

  const blocked = !db.projects.length ? 'Create a project first.' : !batches.length ? 'This project has no batches yet. Add a batch first.' : ''
  return (
    <FormCard title="Register a sample" submit="Register sample" disabled={!!blocked || !batch} note={blocked || 'The sample ID is generated automatically.'}
      onSubmit={() => { const id = act.addSample({ projectId, batchId, material: batch!.material, description, receivedOn }); setDescription(''); onDone?.(id) }}>
      {!fixedProject && (
        <Field label="Project"><Select value={projectId} onChange={e => setProjectId(e.target.value)}>{db.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      )}
      <Field label="Batch"><Select value={batchId} onChange={e => setBatchId(e.target.value)}>{batches.map(b => <option key={b.id} value={b.id}>{b.name} ({materialLabel(b.material)})</option>)}</Select></Field>
      <Field label="Description (optional)"><TextInput value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Cubes 1–3, column C4" /></Field>
      <Field label="Date received"><TextInput type="date" value={receivedOn} onChange={e => setReceivedOn(e.target.value)} /></Field>
    </FormCard>
  )
}

export function NewRunForm({ sampleId, fixedProject, kind0 }: { sampleId?: string; fixedProject?: string; kind0?: Kind }) {
  const nav = useNavigate()
  const { db, act } = useStore()
  const pool = db.samples.filter(s => !fixedProject || s.projectId === fixedProject)
  const [sid, setSid] = useState(sampleId ?? pool[pool.length - 1]?.id ?? '')
  const sample = db.samples.find(s => s.id === sid)
  const suggest = MATERIALS.find(m => m.key === sample?.material)?.suggest ?? 'cube'
  const [kind, setKind] = useState<Kind>(kind0 ?? suggest)
  useEffect(() => { if (!pool.some(s => s.id === sid)) setSid(pool[pool.length - 1]?.id ?? '') }, [pool.length]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!kind0) setKind(suggest) }, [sid]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <FormCard title="Start a test" submit="Start test" disabled={!sample}
      note={pool.length ? 'You enter the readings on the next screen.' : 'Register a sample first.'}
      onSubmit={() => nav(`/runs/${act.addRun({ sampleId: sid, kind })}`)}>
      <Field label="Sample">
        <Select value={sid} onChange={e => setSid(e.target.value)} disabled={!pool.length}>
          {pool.map(s => <option key={s.id} value={s.id}>{s.id}{s.description ? ` · ${s.description}` : ''}</option>)}
        </Select>
      </Field>
      <Field label="Test" hint="Four tests are built in this prototype.">
        <Select value={kind} onChange={e => setKind(e.target.value as Kind)}>
          {(Object.keys(KINDS) as Kind[]).map(k => <option key={k} value={k}>{KINDS[k].title} ({KINDS[k].standard})</option>)}
        </Select>
      </Field>
    </FormCard>
  )
}
