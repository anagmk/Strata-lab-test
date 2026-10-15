import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { materialLabel, KINDS, type Batch, type Run, type Sample } from '../lib/db'
import { summarize } from '../lib/summary'
import { fmtDate } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { ChartFrame } from '../components/ChartFrame'
import { DataTable, type Column } from '../components/DataTable'
import { EmptyState, ErrorState } from '../components/States'
import { StatusChip } from '../components/StatusChip'
import { Btn } from '../components/ui'
import { NewBatchForm, NewProjectForm, NewRunForm, NewSampleForm } from '../components/Forms'
import { TitleBlock } from '../components/TitleBlock'

export function Projects() {
  const nav = useNavigate()
  const { db, act } = useStore()
  const [adding, setAdding] = useState(false)
  return (
    <div className="mx-auto max-w-[1360px]">
      <PageHeader eyebrow="Step 1" title="Projects" right={<Btn v="primary" onClick={() => setAdding(a => !a)}><Plus size={15} />New project</Btn>} />
      {(adding || db.projects.length === 0) && <div className="mb-3"><NewProjectForm onDone={id => { setAdding(false); nav(`/projects/${id}`) }} /></div>}
      <ChartFrame fig="TABLE" title="Your projects" note="Open a project to add batches, samples and tests.">
        <div className="-m-4">
          <DataTable
            caption="Projects" rows={db.projects} rowKey={p => p.id} onRowClick={p => { act.setSettings({ currentProject: p.id }); nav(`/projects/${p.id}`) }}
            empty={{ title: 'No projects yet', body: 'Create a project above. Everything else (batches, samples, tests) is filed under it.' }}
            columns={[
              { key: 'name', header: 'Project', sort: p => p.name, render: p => <span className="font-medium">{p.name}</span> },
              { key: 'location', header: 'Location', hideBelow: 'md' },
              { key: 'b', header: 'Batches', mono: true, align: 'right', render: p => db.batches.filter(b => b.projectId === p.id).length },
              { key: 's', header: 'Samples', mono: true, align: 'right', render: p => db.samples.filter(s => s.projectId === p.id).length },
              { key: 't', header: 'Tests', mono: true, align: 'right', render: p => db.runs.filter(r => r.projectId === p.id).length },
              { key: 'createdAt', header: 'Created', mono: true, sort: p => p.createdAt, render: p => fmtDate(p.createdAt), hideBelow: 'md' },
            ]}
          />
        </div>
      </ChartFrame>
    </div>
  )
}

type Panel = null | 'batch' | 'sample' | 'run'

export function ProjectDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { db } = useStore()
  const [panel, setPanel] = useState<Panel>(null)
  const project = db.projects.find(p => p.id === id)
  if (!project) return <div className="mx-auto max-w-xl pt-10"><ErrorState title="Project not found" body="It may have been removed by clearing the data." /><p className="mt-4 text-center"><Link to="/projects" className="underline">Back to projects</Link></p></div>

  const batches = db.batches.filter(b => b.projectId === project.id)
  const samples = db.samples.filter(s => s.projectId === project.id)
  const runs = db.runs.filter(r => r.projectId === project.id)
  const toggle = (p: Panel) => setPanel(cur => (cur === p ? null : p))

  const bcols: Column<Batch>[] = [
    { key: 'name', header: 'Batch', sort: b => b.name, render: b => <span className="font-medium">{b.name}</span> },
    { key: 'material', header: 'Material', render: b => `${materialLabel(b.material)}${b.grade ? ` · M${b.grade}` : ''}` },
    { key: 'note', header: 'Note', hideBelow: 'md' },
    { key: 'n', header: 'Samples', mono: true, align: 'right', render: b => samples.filter(s => s.batchId === b.id).length },
  ]
  const scols: Column<Sample>[] = [
    { key: 'id', header: 'Sample ID', mono: true, sort: s => s.id, render: s => <span className="font-medium">{s.id}</span> },
    { key: 'batch', header: 'Batch', render: s => batches.find(b => b.id === s.batchId)?.name ?? '—' },
    { key: 'description', header: 'Description', hideBelow: 'md' },
    { key: 'receivedOn', header: 'Received', mono: true, sort: s => s.receivedOn, render: s => fmtDate(s.receivedOn), hideBelow: 'md' },
    { key: 'n', header: 'Tests', mono: true, align: 'right', render: s => runs.filter(r => r.sampleId === s.id).length },
  ]
  const rcols: Column<Run>[] = [
    { key: 'id', header: 'Test', mono: true, sort: r => r.id, render: r => <span className="font-medium">{r.id}</span> },
    { key: 'sampleId', header: 'Sample', mono: true },
    { key: 'kind', header: 'Type', render: r => KINDS[r.kind].short },
    { key: 'result', header: 'Result', mono: true, align: 'right', render: r => summarize(r).result },
    { key: 'status', header: 'Status', render: r => <StatusChip kind={r.status} /> },
  ]

  return (
    <div className="mx-auto max-w-[1360px]">
      <nav aria-label="Breadcrumb" className="mb-2 text-small text-ink-2"><Link to="/projects" className="underline">Projects</Link> / <span className="num">{project.id}</span></nav>
      <PageHeader title={project.name} right={
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => toggle('batch')}><Plus size={15} />Batch</Btn>
          <Btn onClick={() => toggle('sample')}><Plus size={15} />Sample</Btn>
          <Btn v="primary" onClick={() => toggle('run')}><Plus size={15} />Test</Btn>
        </div>} />
      <TitleBlock items={[{ k: 'Project ID', v: project.id }, { k: 'Location', v: project.location || '—' }, { k: 'Created', v: fmtDate(project.createdAt) }, { k: 'Batches / samples / tests', v: `${batches.length} / ${samples.length} / ${runs.length}` }]} />

      <div className="mt-3 grid gap-3">
        {panel === 'batch' && <NewBatchForm projectId={project.id} onDone={() => setPanel(null)} />}
        {panel === 'sample' && <NewSampleForm fixedProject={project.id} onDone={() => setPanel(null)} />}
        {panel === 'run' && <NewRunForm fixedProject={project.id} />}

        <ChartFrame fig="STEP 2" title="Batches" note="One pour, one source or one borehole.">
          <div className="-m-4">
            {batches.length ? <DataTable caption="Batches" rows={batches} columns={bcols} rowKey={b => b.id} maxHeight="320px" /> :
              <EmptyState title="No batches yet" body="Add a batch, for example a concrete pour or a sand source." action={<Btn v="primary" onClick={() => setPanel('batch')}><Plus size={15} />Add batch</Btn>} />}
          </div>
        </ChartFrame>
        <ChartFrame fig="STEP 3" title="Samples" note="Each sample gets a unique ID.">
          <div className="-m-4">
            {samples.length ? <DataTable caption="Samples" rows={samples} columns={scols} rowKey={s => s.id} maxHeight="320px" /> :
              <EmptyState title="No samples yet" body={batches.length ? 'Register a sample from one of the batches.' : 'Add a batch first, then register samples.'} action={batches.length ? <Btn v="primary" onClick={() => setPanel('sample')}><Plus size={15} />Register sample</Btn> : undefined} />}
          </div>
        </ChartFrame>
        <ChartFrame fig="STEP 4" title="Tests" note="Open a test to enter readings, submit and report.">
          <div className="-m-4">
            {runs.length ? <DataTable caption="Tests" rows={runs} columns={rcols} rowKey={r => r.id} onRowClick={r => nav(`/runs/${r.id}`)} maxHeight="320px" /> :
              <EmptyState title="No tests yet" body={samples.length ? 'Start a test on one of the samples.' : 'Register a sample before starting a test.'} action={samples.length ? <Btn v="primary" onClick={() => setPanel('run')}><Plus size={15} />Start test</Btn> : undefined} />}
          </div>
        </ChartFrame>
      </div>
    </div>
  )
}
