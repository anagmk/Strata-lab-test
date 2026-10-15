import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { KINDS, materialLabel, type Sample } from '../lib/db'
import { fmtDate } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { ChartFrame } from '../components/ChartFrame'
import { DataTable, type Column } from '../components/DataTable'
import { Btn } from '../components/ui'
import { NewSampleForm } from '../components/Forms'

export default function Samples() {
  const nav = useNavigate()
  const { db } = useStore()
  const [sp, setSp] = useSearchParams()
  const [adding, setAdding] = useState(false)
  const q = (sp.get('q') ?? '').trim().toLowerCase()
  const cp = db.settings.currentProject

  const proj = (id: string) => db.projects.find(p => p.id === id)?.name ?? '—'
  const batch = (id: string) => db.batches.find(b => b.id === id)?.name ?? '—'
  const rows = db.samples.filter(s => (cp === 'all' || s.projectId === cp) &&
    (!q || `${s.id} ${s.description} ${batch(s.batchId)} ${proj(s.projectId)} ${materialLabel(s.material)}`.toLowerCase().includes(q)))
  const runMatches = q ? db.runs.filter(r => `${r.id} ${r.sampleId} ${KINDS[r.kind].title}`.toLowerCase().includes(q)) : []

  const cols: Column<Sample>[] = [
    { key: 'id', header: 'Sample ID', mono: true, nowrap: true, sort: s => s.id, render: s => <span className="font-medium">{s.id}</span> },
    { key: 'project', header: 'Project', hideBelow: 'lg', render: s => proj(s.projectId) },
    { key: 'batch', header: 'Batch', render: s => batch(s.batchId) },
    { key: 'material', header: 'Material', hideBelow: 'md', render: s => materialLabel(s.material) },
    { key: 'description', header: 'Description', hideBelow: 'lg' },
    { key: 'receivedOn', header: 'Received', mono: true, hideBelow: 'md', sort: s => s.receivedOn, render: s => fmtDate(s.receivedOn) },
    { key: 'n', header: 'Tests', mono: true, align: 'right', render: s => db.runs.filter(r => r.sampleId === s.id).length },
    { key: 'act', header: '', render: s => <Btn onClick={() => nav(`/tests?sample=${s.id}`)}>Add test</Btn> },
  ]
  return (
    <div className="mx-auto max-w-[1360px]">
      <PageHeader eyebrow="Step 3" title="Samples" right={<Btn v="primary" onClick={() => setAdding(a => !a)}><Plus size={15} />Register sample</Btn>} />
      {adding && <div className="mb-3"><NewSampleForm onDone={() => setAdding(false)} /></div>}
      <ChartFrame fig="TABLE" title={`${rows.length} sample${rows.length === 1 ? '' : 's'}`} note="Each sample has a unique ID. Use “Add test” to start a test on it."
        right={q ? <button className="border border-ink px-2.5 py-1 text-small hover:bg-surface-2" onClick={() => setSp({})}>Clear search “{sp.get('q')}”</button> : undefined}>
        <div className="-m-4">
          <DataTable caption="Samples" rows={rows} columns={cols} rowKey={s => s.id} maxHeight="560px"
            empty={{ title: q ? 'No samples match' : 'No samples yet', body: q ? 'Try a different search.' : db.batches.length ? 'Register your first sample with the button above.' : 'Create a project and add a batch first, then register samples.' }} />
        </div>
      </ChartFrame>
      {runMatches.length > 0 && (
        <div className="mt-3"><ChartFrame fig="SEARCH" title="Matching tests">
          <ul className="-my-1 divide-y divide-line">{runMatches.map(r => <li key={r.id}><button className="flex w-full justify-between py-2 text-left text-small hover:bg-surface-2" onClick={() => nav(`/runs/${r.id}`)}><span className="num font-medium">{r.id} · {r.sampleId}</span><span className="text-ink-2">{KINDS[r.kind].short}</span></button></li>)}</ul>
        </ChartFrame></div>
      )}
    </div>
  )
}
