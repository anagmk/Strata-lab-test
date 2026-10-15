import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Printer, ArrowLeft } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, XAxis, YAxis } from 'recharts'
import { useStore } from '../lib/store'
import { KINDS, materialLabel, type CrackData, type CubeData, type ProctorData, type SieveData } from '../lib/db'
import { cubeStrength, sieveAnalysis, proctor, crackAnalysis, SIEVES, type Verdict } from '../lib/calc'
import { f1, f2, f3, fmtDate, fmtDateTime } from '../lib/format'
import { APP_NAME } from '../lib/config'
import { ErrorState } from '../components/States'
import { CrackFigure } from '../components/CrackPhoto'
import { TitleBlock } from '../components/TitleBlock'
import { axisTick, gridStroke } from '../components/ChartFrame'

const WORD: Record<Verdict, string> = { pass: 'CONFORMS', fail: 'DOES NOT CONFORM', warn: 'INCOMPLETE', info: 'REPORTED' }
const COLOR: Record<Verdict, string> = { pass: 'var(--pass)', fail: 'var(--fail)', warn: 'var(--warn)', info: 'var(--ink-2)' }

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="mb-2 border-b border-line pb-1 font-display text-lg font-600 uppercase tracking-wide"><span className="num mr-2 text-[12px] font-normal text-ink-2">{n}.</span>{title}</h2>
      {children}
    </section>
  )
}
function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full border-collapse text-small">
      <thead><tr className="bg-surface-2">{head.map((h, i) => <th key={h} className={`label border border-line px-2 py-1.5 ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={`border border-line px-2 py-1.5 ${j ? 'num text-right' : 'num'}`}>{c}</td>)}</tr>)}</tbody>
    </table>
  )
}

export default function ReportView() {
  const { id } = useParams()
  const { db } = useStore()
  const run = db.runs.find(r => r.id === id)
  if (!run) return <div className="mx-auto max-w-xl pt-10"><ErrorState title="Report not available" body="That test does not exist (it may have been deleted)." /><p className="mt-4 text-center"><Link to="/reports" className="underline">Back to reports</Link></p></div>

  const sample = db.samples.find(s => s.id === run.sampleId)
  const project = db.projects.find(p => p.id === run.projectId)
  const batch = db.batches.find(b => b.id === sample?.batchId)
  const rno = run.id.replace('T-', 'R-')
  const approved = run.status === 'approved'

  let verdict: Verdict = 'warn'
  let details: [string, string][] = []
  let readings: ReactNode = null, results: ReactNode = null, chart: ReactNode = null
  let conclusion = ''

  if (run.kind === 'cube') {
    const d = run.data as CubeData
    const r = cubeStrength({ grade: d.grade, sizeMm: d.sizeMm, loads: d.loads })
    verdict = r.verdict
    details = [['Grade of concrete', `M${d.grade}`], ['Specimen', `${d.sizeMm} mm cubes, ${d.loads.length} nos.`], ['Age at test', `${d.ageDays} days`]]
    readings = <Table head={['Specimen', 'Load [kN]', 'Area [mm²]', 'Strength [MPa]', 'vs mean [%]']} rows={d.loads.map((l, i) => [`Cube ${i + 1}`, l ?? '—', (d.sizeMm ** 2).toLocaleString('en-IN'), f1(r.strengths[i]), r.deviations[i] == null ? '—' : `${r.deviations[i]! > 0 ? '+' : ''}${f1(r.deviations[i])}`])} />
    results = <Table head={['Check', 'Value', 'Requirement', 'Result']} rows={r.checks.map(k => [k.label, k.value, k.limit, k.ok ? 'OK' : 'NOT MET'])} />
    const data = r.strengths.map((s, i) => ({ n: `Cube ${i + 1}`, v: s ?? undefined }))
    chart = (
      <ResponsiveContainer><BarChart data={data} margin={{ top: 10, right: 60, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} vertical={false} /><XAxis dataKey="n" tick={axisTick} tickLine={false} />
        <YAxis domain={[0, (m: number) => Math.ceil((Math.max(m, r.meanLimit) * 1.15) / 5) * 5]} tick={axisTick} tickLine={false} axisLine={false} />
        <ReferenceLine y={r.meanLimit} stroke="var(--ink)" strokeDasharray="5 4" label={{ value: 'mean limit', position: 'right', fontSize: 10, fill: 'var(--ink)' }} />
        <ReferenceLine y={r.indivLimit} stroke="var(--fail)" strokeDasharray="5 4" label={{ value: 'each ≥', position: 'right', fontSize: 10, fill: 'var(--fail)' }} />
        <Bar dataKey="v" barSize={48} isAnimationActive={false}>{data.map((x, i) => <Cell key={i} fill={x.v != null && x.v < r.indivLimit ? 'var(--fail)' : 'var(--ink)'} />)}</Bar>
      </BarChart></ResponsiveContainer>
    )
    conclusion = r.n ? `Mean strength is ${f1(r.mean)} MPa against a requirement of ${f1(r.meanLimit)} MPa; the lowest cube is ${f1(r.min)} MPa against ${f1(r.indivLimit)} MPa. ${r.complete ? `The sample ${verdict === 'pass' ? 'meets' : 'does not meet'} the prototype acceptance rule for M${d.grade}.` : 'Some readings are still missing.'}` : 'No readings entered yet.'
  } else if (run.kind === 'sieve') {
    const d = run.data as SieveData
    const r = sieveAnalysis(d.retained, d.pan, d.zone)
    verdict = r.verdict
    details = [['Grading zone checked', `Zone ${d.zone} (IS 383)`], ['Total sample mass', r.total ? `${r.total.toFixed(0)} g` : '—'], ['Material', sample ? materialLabel(sample.material) : '—']]
    readings = <Table head={['Sieve', 'Retained [g]', 'Retained [%]', 'Cumulative [%]', 'Passing [%]', `Zone ${d.zone} [%]`]} rows={[...r.rows.map(x => [x.size, x.retained ?? '—', r.total ? f1(x.pctRetained) : '—', r.total ? f1(x.cumRetained) : '—', r.total ? f1(x.passing) : '—', `${x.limit.lo}–${x.limit.hi}`]), ['Pan', d.pan ?? '—', '', '', '', '']]} />
    results = <Table head={['Check', 'Value', 'Requirement', 'Result']} rows={[[`Sieves inside Zone ${d.zone}`, r.total ? `${SIEVES.length - r.outside.length} of ${SIEVES.length}` : '—', 'all', r.total && !r.outside.length ? 'OK' : 'NOT MET'], ['Fineness modulus', r.total ? f2(r.fm) : '—', 'reported', '—']]} />
    const curve = [...r.rows].sort((a, b) => a.mm - b.mm).map(x => ({ mm: x.mm, p: +x.passing.toFixed(2), lo: x.limit.lo, hi: x.limit.hi }))
    chart = (
      <ResponsiveContainer><ComposedChart data={curve} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} />
        <XAxis dataKey="mm" type="number" scale="log" domain={[0.1, 15]} allowDataOverflow ticks={[0.15, 0.3, 0.6, 1.18, 2.36, 4.75, 10]} tick={axisTick} tickLine={false} />
        <YAxis domain={[0, 100]} tick={axisTick} tickLine={false} axisLine={false} />
        <Line dataKey="hi" stroke="var(--ink-2)" strokeDasharray="5 4" dot={false} isAnimationActive={false} />
        <Line dataKey="lo" stroke="var(--ink-2)" strokeDasharray="5 4" dot={false} isAnimationActive={false} />
        <Line dataKey="p" stroke="var(--ink)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
      </ComposedChart></ResponsiveContainer>
    )
    conclusion = r.total ? `Fineness modulus is ${f2(r.fm)}. ${r.outside.length ? `Grading falls outside the Zone ${d.zone} band on: ${r.outside.join(', ')}.` : `Grading lies within the Zone ${d.zone} band on every sieve.`}` : 'No readings entered yet.'
  } else if (run.kind === 'crack') {
    const d = run.data as CrackData
    const r = crackAnalysis({ scale: d.scale, scaleMm: d.scaleMm, cracks: d.cracks, limit: d.limit, imgW: d.imgW })
    verdict = r.verdict
    details = [['Allowable crack width', `${d.limit.toFixed(1)} mm`], ['Scale', r.mmPerPx ? `${(1 / r.mmPerPx).toFixed(1)} px/mm (1 px = ${r.mmPerPx.toFixed(3)} mm)` : '—'], ['Method', 'Photo measurement against a ruler in frame']]
    readings = (
      <div>
        <CrackFigure d={d} className="mb-3 max-w-[520px]" />
        <Table head={['#', 'Location', 'Width [mm]', 'Method']} rows={d.cracks.map((c, i) => [String(i + 1), c.note || '—', r.widths[i] != null ? r.widths[i].toFixed(2) : '—', c.snapped ? 'edge-detected' : 'by hand'])} />
      </div>
    )
    results = <Table head={['Check', 'Value', 'Requirement', 'Result']} rows={r.checks.map(k => [k.label, k.value, k.limit, k.ok ? 'OK' : 'NOT MET'])} />
    const data = r.widths.map((w, i) => ({ n: `#${i + 1}`, v: +w.toFixed(3) }))
    chart = (
      <ResponsiveContainer><BarChart data={data} margin={{ top: 10, right: 60, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} vertical={false} /><XAxis dataKey="n" tick={axisTick} tickLine={false} />
        <YAxis domain={[0, (m: number) => Math.ceil(Math.max(m, d.limit) * 12.5) / 10]} tickFormatter={(v: number) => v.toFixed(1)} tick={axisTick} tickLine={false} axisLine={false} />
        <ReferenceLine y={d.limit} stroke="var(--fail)" strokeDasharray="5 4" label={{ value: 'limit', position: 'right', fontSize: 10, fill: 'var(--fail)' }} />
        <Bar dataKey="v" barSize={40} isAnimationActive={false}>{data.map((x, i) => <Cell key={i} fill={x.v > d.limit ? 'var(--fail)' : 'var(--ink)'} />)}</Bar>
      </BarChart></ResponsiveContainer>
    )
    conclusion = r.n ? `The widest measured crack is ${f2(r.max)} mm against an allowable ${d.limit.toFixed(1)} mm. ${verdict === 'pass' ? 'All measured locations are within the limit.' : 'At least one location exceeds the limit.'} Widths are read from a photograph (1 pixel = ${r.mmPerPx.toFixed(3)} mm) and should be confirmed with a crack comparator or microscope where the result is critical.` : 'No measurements yet.'
  } else {
    const d = run.data as ProctorData
    const r = proctor({ mouldMass: d.mouldMass, mouldVolume: d.mouldVolume, gs: d.gs, designMdd: d.designMdd, points: d.points })
    verdict = r.verdict
    details = [['Mould', `${d.mouldVolume} cc, ${d.mouldMass ?? '—'} g`], ['Specific gravity', f2(d.gs)], ['Design MDD', d.designMdd != null ? `${f2(d.designMdd)} g/cc` : 'not set']]
    readings = <Table head={['Point', 'Moisture [%]', 'Mould + soil [g]', 'Bulk density [g/cc]', 'Dry density [g/cc]']} rows={d.points.map((p, i) => [`Point ${i + 1}`, p.w ?? '—', p.mass ?? '—', f3(r.rowBulk[i]), f3(r.rowDry[i])])} />
    results = <Table head={['Quantity', 'Value', 'Requirement', 'Result']} rows={[['Max dry density', r.mdd ? `${f2(r.mdd)} g/cc` : '—', d.designMdd != null ? `≥ ${f2(d.designMdd)} g/cc` : 'none set', d.designMdd != null && r.mdd ? (r.mdd >= d.designMdd ? 'OK' : 'NOT MET') : '—'], ['Optimum moisture content', r.mdd ? `${f1(r.omc)} %` : '—', 'reported', '—']]} />
    const line = r.fit.map(x => ({ w: x.w, fit: +x.dry.toFixed(4) }))
    chart = r.mdd ? (
      <ResponsiveContainer><ComposedChart data={line} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={gridStroke} />
        <XAxis dataKey="w" type="number" domain={['dataMin - 1', 'dataMax + 1']} tick={axisTick} tickLine={false} unit="%" />
        <YAxis domain={[(m: number) => Math.floor((m - 0.1) * 10) / 10, (m: number) => Math.ceil((m + 0.1) * 10) / 10]} tickFormatter={(v: number) => v.toFixed(1)} tick={axisTick} tickLine={false} axisLine={false} />
        <Line dataKey="fit" stroke="var(--ink)" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Scatter data={r.pts.map(x => ({ w: x.w, fit: +x.dry.toFixed(4) }))} dataKey="fit" fill="var(--ink)" isAnimationActive={false} />
      </ComposedChart></ResponsiveContainer>
    ) : <p className="py-10 text-center text-small text-ink-2">Not enough complete points for a curve.</p>
    conclusion = r.mdd ? `Maximum dry density is ${f2(r.mdd)} g/cc at an optimum moisture content of ${f1(r.omc)} %.${d.designMdd != null ? ` This ${r.mdd >= d.designMdd ? 'meets' : 'does not meet'} the design value of ${f2(d.designMdd)} g/cc.` : ''}` : 'No result yet. Enter at least five complete points.'
  }

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link to={`/runs/${run.id}`} className="flex items-center gap-1.5 text-small underline"><ArrowLeft size={14} />Back to test</Link>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-accent px-3.5 py-2 text-small font-medium text-accent-ink hover:opacity-90"><Printer size={15} />Print / Save as PDF</button>
      </div>

      <article className="report-sheet relative border border-line bg-surface p-8 print:p-0">
        {!approved && <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"><span className="font-display -rotate-[24deg] text-[110px] font-700 uppercase tracking-widest opacity-[0.07]">Draft</span></div>}
        <header className="flex items-start justify-between gap-4 border-b-2 pb-3" style={{ borderColor: 'var(--line-strong)' }}>
          <div>
            <p className="font-display text-2xl font-700 uppercase leading-none tracking-wide">{db.settings.labName}</p>
            <p className="mt-1 text-small text-ink-2">{project?.name}{project?.location ? ` · ${project.location}` : ''} · generated by {APP_NAME}</p>
          </div>
          <div className="text-right"><p className="label">Test report</p><p className="num text-lg font-medium">{rno}</p></div>
        </header>

        {!approved && <p className="mt-3 border-l-[3px] bg-surface-2 px-3 py-2 text-small" style={{ borderColor: 'var(--warn)' }}>Draft: this test has not been approved by an engineer yet (status: {run.status === 'review' ? 'in review' : run.status === 'rejected' ? 'sent back' : 'draft'}).</p>}

        <h1 className="mt-5 font-display text-h1 font-700 uppercase leading-tight tracking-wide">{KINDS[run.kind].title}</h1>
        <div className="mt-3"><TitleBlock dense items={[{ k: 'Sample ID', v: run.sampleId }, { k: 'Test date', v: fmtDate(run.testDate) }, { k: 'Tested by', v: run.technician }, { k: 'Standard', v: KINDS[run.kind].standard }]} /></div>

        <div className="mt-4 flex items-center gap-3 border px-4 py-3" style={{ borderColor: COLOR[verdict] }}>
          <span aria-hidden className="h-4 w-4 shrink-0" style={{ background: COLOR[verdict] }} />
          <p className="font-display text-2xl font-700 tracking-wide">{WORD[verdict]}</p>
          <p className="ml-auto max-w-[60%] text-right text-small text-ink-2">{conclusion}</p>
        </div>

        <Section n={1} title="Sample and test details">
          <dl className="grid grid-cols-2 gap-x-8 text-small">
            {([['Project', project?.name ?? '—'], ['Batch', batch?.name ?? '—'], ['Sample', sample ? `${materialLabel(sample.material)}${sample.description ? ', ' + sample.description : ''}` : '—'], ['Received', sample ? fmtDate(sample.receivedOn) : '—'], ...details] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5"><dt className="text-ink-2">{k}</dt><dd className="num text-right">{v}</dd></div>
            ))}
          </dl>
        </Section>
        <Section n={2} title="Readings and calculations">{readings}</Section>
        <Section n={3} title="Results against the standard">{results}</Section>
        <Section n={4} title="Graph"><div className="h-[240px]">{chart}</div></Section>

        <footer className="mt-10 grid grid-cols-3 gap-6 break-inside-avoid">
          <div><div className="h-10 border-b border-ink" /><p className="label mt-1">Tested by</p><p className="num text-[12px]">{run.technician}</p></div>
          <div><div className="h-10 border-b border-ink" /><p className="label mt-1">Checked by</p><p className="num text-[12px]">&nbsp;</p></div>
          <div><div className="h-10 border-b border-ink" /><p className="label mt-1">Approved by (Engineer)</p><p className="num text-[12px]">{approved ? `${run.approvedBy}, ${run.approvedAt ? fmtDateTime(run.approvedAt) : ''}` : ' '}</p></div>
        </footer>
        <p className="mt-6 text-[11px] text-ink-2">Results are calculated from the readings above. Acceptance limits in this prototype are simplified and must be confirmed against the current standard and project specification before use.</p>
      </article>
    </div>
  )
}
