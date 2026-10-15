import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { KINDS, type Flow, type Run } from '../lib/db'
import { summarize } from '../lib/summary'
import { fmtDate } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { ChartFrame } from '../components/ChartFrame'
import { DataTable, type Column } from '../components/DataTable'
import { StatusChip } from '../components/StatusChip'
import { Btn } from '../components/ui'

const FILTERS: ('all' | Flow)[] = ['all', 'approved', 'review', 'draft', 'rejected']
const NAME: Record<string, string> = { all: 'All', approved: 'Approved', review: 'In review', draft: 'Draft', rejected: 'Sent back' }

export default function Reports() {
  const nav = useNavigate()
  const { db } = useStore()
  const [f, setF] = useState<'all' | Flow>('all')
  const cp = db.settings.currentProject
  const all = db.runs.filter(r => cp === 'all' || r.projectId === cp)
  const rows = all.filter(r => f === 'all' || r.status === f).slice().reverse()
  const cols: Column<Run>[] = [
    { key: 'id', header: 'Report', mono: true, nowrap: true, sort: r => r.id, render: r => <span className="font-medium">{r.id.replace('T-', 'R-')}</span> },
    { key: 'sampleId', header: 'Sample', mono: true, nowrap: true },
    { key: 'kind', header: 'Test', render: r => KINDS[r.kind].short },
    { key: 'result', header: 'Result', mono: true, nowrap: true, align: 'right', render: r => summarize(r).result },
    { key: 'verdict', header: 'Verdict', render: r => <StatusChip kind={summarize(r).verdict} /> },
    { key: 'status', header: 'Status', render: r => <StatusChip kind={r.status} /> },
    { key: 'date', header: 'Date', mono: true, hideBelow: 'md', sort: r => r.testDate, render: r => fmtDate(r.testDate) },
    { key: 'act', header: '', render: r => <Btn v={r.status === 'approved' ? 'primary' : 'secondary'} onClick={e => { e.stopPropagation(); nav(`/reports/${r.id}`) }}>{r.status === 'approved' ? 'Open' : 'Preview'}</Btn> },
  ]
  return (
    <div className="mx-auto max-w-[1360px]">
      <PageHeader eyebrow="Step 6" title="Reports" />
      <ChartFrame fig="TABLE" title="Reports" note="Approved tests produce the final report. Earlier ones show a draft watermark.">
        <div className="-mx-4 -mt-4 mb-3 flex flex-wrap gap-1.5 border-b border-line px-4 py-3" role="group" aria-label="Filter by status">
          {FILTERS.map(k => <button key={k} onClick={() => setF(k)} aria-pressed={f === k} className={`border px-2.5 py-1 text-small ${f === k ? 'border-ink bg-ink font-medium text-bg' : 'border-line hover:border-ink-2'}`}>{NAME[k]}<span className="num ml-1.5 text-[11px] opacity-70">{k === 'all' ? all.length : all.filter(r => r.status === k).length}</span></button>)}
        </div>
        <div className="-mx-4 -mb-4">
          <DataTable caption="Reports" rows={rows} columns={cols} rowKey={r => r.id} onRowClick={r => nav(`/reports/${r.id}`)} maxHeight="560px"
            empty={{ title: 'No reports yet', body: 'A report exists for every test. Start a test, enter readings, submit it and get it approved.' }} />
        </div>
      </ChartFrame>
    </div>
  )
}
