import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { useStore } from '../lib/store'
import { KINDS, type Run } from '../lib/db'
import { cubeStrength } from '../lib/calc'
import { allFlags, inRange, summarize } from '../lib/summary'
import { daysBetween, fmtDate, todayISO } from '../lib/format'
import { TESTS, GROUP_LABEL } from '../data/tests'
import type { Group } from '../data/tests'
import { PageHeader } from '../components/PageHeader'
import { TitleBlock } from '../components/TitleBlock'
import { StatCard } from '../components/StatCard'
import { PathBar } from '../components/PathBar'
import { ChartFrame, axisTick, gridStroke, ChartTooltip } from '../components/ChartFrame'
import { DataTable, type Column } from '../components/DataTable'
import { StatusChip } from '../components/StatusChip'
import { EmptyState } from '../components/States'
import { Btn } from '../components/ui'

const COVERAGE: { group: Group; note: string }[] = [
  { group: 'A', note: 'Readings in, calculation, graph, report' },
  { group: 'B', note: 'Rebound hammer, UPV meter' },
  { group: 'C', note: 'Camera / thermal / radiograph images' },
  { group: 'D', note: 'GPR unit, structural sensors' },
]

function swatch(g: Group, live: boolean) {
  const style: React.CSSProperties =
    g === 'A' ? { background: 'var(--ink)' }
    : g === 'B' ? { background: 'var(--ink-2)' }
    : g === 'C' ? { background: 'repeating-linear-gradient(45deg, var(--ink) 0 2px, transparent 2px 5px)', border: '1px solid var(--ink)' }
    : { border: '1px dashed var(--ink)' }
  return <span className="relative block h-[18px] w-full" style={style} aria-hidden>{live && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 bg-accent" />}</span>
}

const endLabel = (lastIndex: number, text: string, color: string) => (p: any) =>
  p.index === lastIndex ? <text x={p.x + 8} y={p.y + 4} fontFamily="IBM Plex Mono, monospace" fontSize={11} fill={color}>{text}</text> : <g />

export default function Overview() {
  const nav = useNavigate()
  const { db } = useStore()
  const { currentProject: cp, range } = db.settings
  const today = todayISO()

  const d = useMemo(() => {
    const inProject = <T extends { projectId: string }>(x: T) => cp === 'all' || x.projectId === cp
    const runs = db.runs.filter(inProject)
    const rangeRuns = runs.filter(r => inRange(r.createdAt, range))
    const samplesToday = db.samples.filter(s => inProject(s) && s.createdAt.slice(0, 10) === today).length
    const inProgress = runs.filter(r => r.status === 'draft' || r.status === 'rejected').length
    const awaiting = runs.filter(r => r.status === 'review').length
    const decided = rangeRuns.filter(r => r.status === 'review' || r.status === 'approved').map(r => summarize(r).verdict).filter(v => v === 'pass' || v === 'fail')
    const passRate = decided.length ? (decided.filter(v => v === 'pass').length / decided.length) * 100 : null
    const flags = allFlags(db).filter(f => inProject(db.runs.find(r => r.id === f.runId)!))

    // strength by batch: mean of each run's mean strength at 7 / 14 / 28 days
    const cube = rangeRuns.filter((r): r is Run & { kind: 'cube' } => r.kind === 'cube')
    const byBatch = new Map<string, { name: string; order: number; grade: number; age: Record<number, number[]> }>()
    cube.forEach(r => {
      const sample = db.samples.find(s => s.id === r.sampleId); if (!sample) return
      const batch = db.batches.find(b => b.id === sample.batchId); if (!batch) return
      const data = r.data as { grade: number; sizeMm: number; ageDays: number; loads: (number | null)[] }
      const res = cubeStrength({ grade: data.grade, sizeMm: data.sizeMm, loads: data.loads })
      if (!res.n) return
      const e = byBatch.get(batch.id) ?? { name: batch.name, order: db.batches.indexOf(batch), grade: data.grade, age: {} }
      ;(e.age[data.ageDays] ??= []).push(res.mean)
      e.grade = data.grade
      byBatch.set(batch.id, e)
    })
    const avg = (a?: number[]) => (a?.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : undefined)
    const trend = [...byBatch.values()].sort((a, b) => a.order - b.order).map(e => ({ batch: e.name, d7: avg(e.age[7]), d14: avg(e.age[14]), d28: avg(e.age[28]), fck: e.grade }))

    const cal = db.equipment.map(e => ({ ...e, daysLeft: daysBetween(today, e.due) })).filter(e => e.daysLeft <= 45).sort((a, b) => a.daysLeft - b.daysLeft)
    return { runs, samplesToday, inProgress, awaiting, passRate, decided: decided.length, flags, trend, cal, recent: runs.slice().reverse().slice(0, 8) }
  }, [db, cp, range, today])

  const last = (k: 'd7' | 'd14' | 'd28') => { for (let i = d.trend.length - 1; i >= 0; i--) if (d.trend[i][k] != null) return i; return -1 }
  const projectName = cp === 'all' ? 'All projects' : db.projects.find(p => p.id === cp)?.name ?? '—'

  const cols: Column<Run>[] = [
    { key: 'sample', header: 'Sample ID', mono: true, nowrap: true, sort: r => r.sampleId, render: r => <span className="font-medium">{r.sampleId}</span> },
    { key: 'test', header: 'Test', sort: r => r.kind, render: r => <span className="inline-flex items-center gap-1">{KINDS[r.kind].short}<ArrowUpRight size={13} aria-hidden /></span> },
    { key: 'result', header: 'Result', mono: true, nowrap: true, align: 'right', render: r => summarize(r).result },
    { key: 'verdict', header: 'Verdict', render: r => <StatusChip kind={summarize(r).verdict} /> },
    { key: 'status', header: 'Status', nowrap: true, sort: r => r.status, render: r => <StatusChip kind={r.status} /> },
    { key: 'tech', header: 'Technician', hideBelow: '2xl', render: r => r.technician },
  ]

  return (
    <div className="mx-auto max-w-[1360px]">
      <PageHeader eyebrow="Overview" title="Laboratory overview" />
      <TitleBlock items={[
        { k: 'Laboratory', v: db.settings.labName }, { k: 'Project', v: projectName }, { k: 'Date', v: fmtDate(today) },
        { k: 'Period', v: range === 'all' ? 'All time' : `Last ${range} days` },
      ]} />
      <div className="mt-3"><PathBar /></div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Samples today" value={d.samplesToday} note={`${db.samples.length} registered in total`} />
        <StatCard label="Tests in progress" value={d.inProgress} note="drafts and sent-back tests" />
        <StatCard label="Pass rate" value={d.passRate ?? 0} decimals={1} suffix="%" empty={d.passRate == null} note={d.passRate == null ? 'no submitted tests yet' : `of ${d.decided} submitted test${d.decided === 1 ? '' : 's'}`} />
        <StatCard label="Awaiting approval" value={d.awaiting} note="submitted, not yet approved" />
        <StatCard label="Open flags" value={d.flags.length} note={d.flags.length ? `${d.flags.filter(f => f.severity === 'fail').length} critical` : 'nothing flagged'} critical={d.flags.some(f => f.severity === 'fail')} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <ChartFrame fig="FIG. 1" title="Concrete compressive strength by batch" note="Mean cube strength at 7 / 14 / 28 days from your saved tests. Dashed: characteristic strength (fck).">
          {d.trend.length === 0 ? (
            <EmptyState title="No cube results yet" body="Run a cube compressive strength test with at least one failure load. The batch trend draws here." action={<Btn v="primary" onClick={() => nav('/tests')}>Go to tests</Btn>} />
          ) : (
            <div className="h-[300px]" role="img" aria-label="Line chart of mean cube strength by batch at 7, 14 and 28 days with the characteristic strength">
              <ResponsiveContainer>
                <ComposedChart data={d.trend} margin={{ top: 8, right: 56, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="batch" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--line)' }} />
                  <YAxis domain={[0, (m: number) => Math.ceil((m + 4) / 5) * 5]} tick={axisTick} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip unit=" MPa" />} />
                  <Line name="fck" dataKey="fck" type="stepAfter" stroke="var(--fail)" strokeDasharray="5 4" strokeWidth={1} dot={false} isAnimationActive={false} label={endLabel(d.trend.length - 1, 'fck', 'var(--fail)')} />
                  <Line name="7 d" dataKey="d7" stroke="var(--ink-2)" strokeWidth={1} dot={{ r: 3 }} connectNulls isAnimationActive={false} label={endLabel(last('d7'), '7 d', 'var(--ink-2)')} />
                  <Line name="14 d" dataKey="d14" stroke="var(--ink-2)" strokeWidth={1.5} dot={{ r: 3 }} connectNulls isAnimationActive={false} label={endLabel(last('d14'), '14 d', 'var(--ink-2)')} />
                  <Line name="28 d" dataKey="d28" stroke="var(--ink)" strokeWidth={2} dot={{ r: 3.5 }} connectNulls isAnimationActive={false} label={endLabel(last('d28'), '28 d', 'var(--ink)')} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartFrame>

        <ChartFrame fig="FIG. 2" title="Test coverage" note="The 40 tests in the library, by how much the app can do alone.">
          <div className="grid grid-cols-10 gap-1" role="img" aria-label="40 tests grouped by support level">
            {TESTS.map(t => <div key={t.code} title={`${t.name} (${t.live ? 'built in this prototype' : 'planned'})`}>{swatch(t.group, !!t.live)}</div>)}
          </div>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {COVERAGE.map(c => (
              <li key={c.group} className="flex items-center gap-3 py-2">
                <span className="w-6">{swatch(c.group, false)}</span>
                <div className="min-w-0 flex-1"><p className="text-small font-medium">{GROUP_LABEL[c.group]}</p><p className="truncate text-[12px] text-ink-2">{c.note}</p></div>
                <span className="font-display text-2xl font-600 tabular-nums">{TESTS.filter(t => t.group === c.group).length}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-2 text-[12px] text-ink-2"><span className="inline-block h-2 w-2 bg-accent" aria-hidden />Built in this prototype: cube strength, sieve analysis, Proctor, crack width from photo.</p>
        </ChartFrame>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <ChartFrame fig="TABLE 1" title="Recent tests" note="Latest eight. Select a row to open it." right={<Btn onClick={() => nav('/tests')}>All tests</Btn>}>
          <div className="-m-4">
            <DataTable caption="Recent tests" rows={d.recent} columns={cols} rowKey={r => r.id} onRowClick={r => nav(`/runs/${r.id}`)} maxHeight="520px"
              empty={{ title: 'No tests yet', body: 'Follow the path above: create a project, add a batch, register a sample, then start a test.' }} />
          </div>
        </ChartFrame>

        <div className="grid content-start gap-3">
          <ChartFrame fig="FEED" title="Flags" note="Rule-based checks on saved readings.">
            {d.flags.length === 0 ? <p className="text-small text-ink-2">Nothing flagged. Flags appear when a saved reading breaks a rule.</p> : (
              <ul className="-my-1 divide-y divide-line">
                {d.flags.slice(0, 4).map((f, i) => (
                  <li key={i} className="relative py-3 pl-3">
                    <span aria-hidden className="absolute bottom-3 left-0 top-3 w-[3px]" style={{ background: f.severity === 'fail' ? 'var(--accent)' : 'var(--warn)' }} />
                    <p className="num text-[11px] text-ink-2">{f.sampleId} · {f.runId}</p>
                    <p className="text-small font-medium">{f.reason}</p>
                    <p className="text-[12px] text-ink-2">{f.detail}</p>
                    <button onClick={() => nav(`/runs/${f.runId}`)} className={`mt-1.5 px-2.5 py-1 text-small font-medium ${f.severity === 'fail' ? 'bg-accent text-accent-ink hover:opacity-90' : 'border border-ink hover:bg-surface-2'}`}>Review</button>
                  </li>
                ))}
              </ul>
            )}
          </ChartFrame>

          <ChartFrame fig="EQUIP." title="Calibration due" note="Overdue or due in 45 days.">
            {d.cal.length === 0 ? (
              <p className="text-small text-ink-2">{db.equipment.length ? 'Nothing due in the next 45 days.' : <>No equipment added yet. <Link to="/equipment" className="underline">Add equipment</Link> to track calibration.</>}</p>
            ) : (
              <ul className="-my-1 divide-y divide-line">
                {d.cal.map(c => (
                  <li key={c.id} className="py-2.5">
                    <div className="flex items-baseline justify-between gap-2"><p className="text-small font-medium">{c.name}</p><p className="num whitespace-nowrap text-small">{fmtDate(c.due)}</p></div>
                    <p className="num text-[11px]" style={{ color: c.daysLeft < 0 ? 'var(--fail)' : 'var(--ink-2)' }}>{c.id}{c.location ? ` · ${c.location}` : ''} · {c.daysLeft < 0 ? `${-c.daysLeft} d overdue` : `${c.daysLeft} d left`}</p>
                  </li>
                ))}
              </ul>
            )}
          </ChartFrame>
        </div>
      </div>
    </div>
  )
}
