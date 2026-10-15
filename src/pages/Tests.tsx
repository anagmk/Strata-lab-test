import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { KINDS, type Kind, type Run } from '../lib/db'
import { summarize } from '../lib/summary'
import { fmtDate } from '../lib/format'
import { GROUP_LABEL, TESTS } from '../data/tests'
import type { Material, TestDef } from '../data/tests'
import { PageHeader } from '../components/PageHeader'
import { ChartFrame } from '../components/ChartFrame'
import { DataTable, type Column } from '../components/DataTable'
import { StatusChip } from '../components/StatusChip'
import { Btn } from '../components/ui'
import { NewRunForm } from '../components/Forms'

const MATERIALS: ('All' | Material)[] = ['All', 'Soil', 'Aggregate', 'Cement', 'Steel', 'Brick', 'Bitumen', 'Concrete', 'NDT']

function GroupBadge({ g }: { g: TestDef['group'] }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-ink px-1.5 py-px text-[11px] font-medium" title={GROUP_LABEL[g]}>
      <span className="num font-medium">{g}</span><span className="hidden text-ink-2 sm:inline">{GROUP_LABEL[g]}</span>
    </span>
  )
}

export default function Tests() {
  const nav = useNavigate()
  const { db } = useStore()
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') === 'library' ? 'library' : 'runs'
  const [startKind, setStartKind] = useState<Kind | undefined>()
  const [open, setOpen] = useState(!!sp.get('sample'))
  const [mat, setMat] = useState<'All' | Material>('All')
  const [liveOnly, setLiveOnly] = useState(false)
  const cp = db.settings.currentProject

  const runs = db.runs.filter(r => cp === 'all' || r.projectId === cp).slice().reverse()
  const lib = useMemo(() => TESTS.filter(t => (mat === 'All' || t.material === mat) && (!liveOnly || t.live)), [mat, liveOnly])
  const counts = useMemo(() => { const m: Record<string, number> = { All: TESTS.length }; TESTS.forEach(t => { m[t.material] = (m[t.material] ?? 0) + 1 }); return m }, [])

  const rcols: Column<Run>[] = [
    { key: 'id', header: 'Test', mono: true, nowrap: true, sort: r => r.id, render: r => <span className="font-medium">{r.id}</span> },
    { key: 'sampleId', header: 'Sample', mono: true, nowrap: true, sort: r => r.sampleId },
    { key: 'kind', header: 'Type', sort: r => r.kind, render: r => KINDS[r.kind].short },
    { key: 'result', header: 'Result', mono: true, nowrap: true, align: 'right', render: r => summarize(r).result },
    { key: 'verdict', header: 'Verdict', render: r => <StatusChip kind={summarize(r).verdict} /> },
    { key: 'status', header: 'Status', sort: r => r.status, render: r => <StatusChip kind={r.status} /> },
    { key: 'tech', header: 'Technician', hideBelow: 'lg', render: r => r.technician },
    { key: 'date', header: 'Date', mono: true, hideBelow: 'md', sort: r => r.testDate, render: r => fmtDate(r.testDate) },
  ]
  const lcols: Column<TestDef>[] = [
    { key: 'code', header: 'Code', mono: true, sort: t => t.code, width: '90px' },
    { key: 'name', header: 'Test', sort: t => t.name, render: t => <span className="font-medium">{t.name}</span> },
    { key: 'material', header: 'Material', sort: t => t.material, hideBelow: 'md' },
    { key: 'standard', header: 'Standard', mono: true, hideBelow: 'md', sort: t => t.standard },
    { key: 'group', header: 'Coverage group', sort: t => t.group, render: t => <GroupBadge g={t.group} /> },
    { key: 'live', header: 'Prototype', render: t => t.live
      ? <span className="inline-flex items-center gap-1.5 text-small font-medium"><span aria-hidden className="h-2 w-2 bg-accent" />Start</span>
      : <span className="text-small text-ink-2">Planned</span> },
  ]
  const setTab = (t: 'runs' | 'library') => setSp(t === 'library' ? { tab: 'library' } : {})

  return (
    <div className="mx-auto max-w-[1360px]">
      <PageHeader eyebrow="Step 4" title="Tests" right={tab === 'runs' && <Btn v="primary" onClick={() => { setStartKind(undefined); setOpen(o => !o) }}><Plus size={15} />Start a test</Btn>} />
      <div role="tablist" aria-label="Tests view" className="mb-3 flex gap-1.5">
        {([['runs', 'Test runs'], ['library', 'Test library (40)']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`border px-3 py-1.5 text-small ${tab === k ? 'border-ink bg-ink font-medium text-bg' : 'border-line bg-surface hover:border-ink-2'}`}>{l}</button>
        ))}
      </div>

      {tab === 'runs' ? (
        <div className="grid gap-3">
          {open && <NewRunForm key={startKind ?? 'any'} sampleId={sp.get('sample') ?? undefined} fixedProject={cp !== 'all' ? cp : undefined} kind0={startKind} />}
          <ChartFrame fig="TABLE" title={`${runs.length} test${runs.length === 1 ? '' : 's'}`} note={cp === 'all' ? 'All projects.' : 'Filtered to the selected project (top bar).'}>
            <div className="-m-4">
              <DataTable caption="Test runs" rows={runs} columns={rcols} rowKey={r => r.id} onRowClick={r => nav(`/runs/${r.id}`)} maxHeight="600px"
                empty={{ title: 'No tests yet', body: db.samples.length ? 'Use “Start a test” to pick a sample and a test.' : 'Create a project, add a batch and register a sample first. Then start a test here.' }} />
            </div>
          </ChartFrame>
        </div>
      ) : (
        <ChartFrame fig="TABLE" title={`${lib.length} of ${TESTS.length} tests`} note="Group A: full software support · B: needs instrument · C: image-based · D: specialist hardware. Click a test marked Start to begin one.">
          <div className="-mx-4 -mt-4 mb-3 flex flex-wrap items-center gap-1.5 border-b border-line px-4 py-3" role="group" aria-label="Filter by material">
            {MATERIALS.map(m => (
              <button key={m} onClick={() => setMat(m)} aria-pressed={mat === m} className={`border px-2.5 py-1 text-small ${mat === m ? 'border-ink bg-ink font-medium text-bg' : 'border-line hover:border-ink-2'}`}>{m}<span className="num ml-1.5 text-[11px] opacity-70">{counts[m] ?? 0}</span></button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-small"><input type="checkbox" checked={liveOnly} onChange={e => setLiveOnly(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />Built in prototype only</label>
          </div>
          <div className="-mx-4 -mb-4">
            <DataTable caption="Test library" rows={lib} columns={lcols} rowKey={t => t.code} maxHeight="620px"
              onRowClick={t => { if (t.live) { setStartKind(t.live); setOpen(true); setSp({}) } }}
              empty={{ title: 'No tests match', body: 'Try another material.' }} />
          </div>
        </ChartFrame>
      )}
    </div>
  )
}
