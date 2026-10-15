import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FileText, Plus, Minus, Send, Check, Undo2, Trash2, Wand2 } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceDot, ReferenceLine,
  ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis, LabelList,
} from 'recharts'
import { useStore } from '../lib/store'
import { KINDS, materialLabel, type CrackData, type CubeData, type ProctorData, type Run, type SieveData } from '../lib/db'
import { cubeStrength, sieveAnalysis, proctor, crackAnalysis, PROCTOR_MIN_POINTS, SIEVES, type Zone } from '../lib/calc'
import { f1, f2, f3, fmtDate, fmtDateTime } from '../lib/format'
import { summarize } from '../lib/summary'
import { PageHeader } from '../components/PageHeader'
import { TitleBlock } from '../components/TitleBlock'
import { ChartFrame, axisTick, gridStroke, ChartTooltip } from '../components/ChartFrame'
import { CrackPhoto } from '../components/CrackPhoto'
import { TestForm } from '../components/TestForm'
import { ResultPanel } from '../components/ResultPanel'
import { ErrorState } from '../components/States'
import { StatusChip } from '../components/StatusChip'
import { Btn, Select, TextInput } from '../components/ui'

const mono = 'IBM Plex Mono, monospace'

function Param({ k, children }: { k: string; children: ReactNode }) {
  return <div className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-small last:border-0"><span className="text-ink-2">{k}</span>{children}</div>
}
function NumParam({ k, unit, value, onChange, disabled, step = 'any', placeholder }: { k: string; unit?: string; value: number | null; onChange: (v: number | null) => void; disabled?: boolean; step?: string; placeholder?: string }) {
  return (
    <Param k={k}>
      <span className="flex items-center gap-1">
        <input type="number" step={step} inputMode="decimal" aria-label={`${k}${unit ? ' in ' + unit : ''}`} disabled={disabled} placeholder={placeholder}
          value={value ?? ''} onChange={e => onChange(e.target.value === '' ? null : +e.target.value)}
          className="num w-24 border border-line bg-surface px-2 py-1 text-right disabled:bg-surface-2 disabled:text-ink-2" />
        {unit && <span className="num text-ink-2">{unit}</span>}
      </span>
    </Param>
  )
}
const Rows = ({ n, onAdd, onRemove, min, disabled, label }: { n: number; onAdd: () => void; onRemove: () => void; min: number; disabled: boolean; label: string }) => (
  <div className="flex items-center gap-2 border-t border-line px-3 py-2">
    <Btn onClick={onAdd} disabled={disabled}><Plus size={14} />Add {label}</Btn>
    <Btn onClick={onRemove} disabled={disabled || n <= min}><Minus size={14} />Remove last</Btn>
    <span className="num ml-auto text-[12px] text-ink-2">{n} {label}s</span>
  </div>
)

/* ============================ CUBE STRENGTH ============================ */
function Cube({ run, ro, set }: { run: Run; ro: boolean; set: (f: (d: CubeData) => CubeData) => void }) {
  const d = run.data as CubeData
  const r = cubeStrength({ grade: d.grade, sizeMm: d.sizeMm, loads: d.loads })
  const rows = d.loads.map((l, i) => ({ label: `Cube ${i + 1}`, load: l }))
  const data = r.strengths.map((s, i) => ({ name: `Cube ${i + 1}`, mpa: s ?? undefined }))
  return {
    form: (
      <>
        <TestForm rowHeader="Specimen" caption="Cube failure loads" rows={rows} readOnly={ro}
          onChange={(i, _k, v) => set(x => ({ ...x, loads: x.loads.map((l, j) => (j === i ? v : l)) }))}
          columns={[
            { key: 'load', label: 'Failure load', unit: 'kN', step: '1' },
            { key: 'area', label: 'Area', unit: 'mm²', calc: () => (d.sizeMm * d.sizeMm).toLocaleString('en-IN') },
            { key: 'mpa', label: 'Strength', unit: 'MPa', calc: (_r, i) => <span className="font-medium">{f1(r.strengths[i])}</span> },
            { key: 'dev', label: 'vs mean', unit: '%', calc: (_r, i) => { const v = r.deviations[i]; return v == null ? '—' : <span style={{ color: v < -15 ? 'var(--fail)' : undefined }}>{v > 0 ? '+' : ''}{f1(v)}</span> } },
          ]} />
        <Rows n={d.loads.length} min={1} disabled={ro || d.loads.length >= 12} label="cube" onAdd={() => set(x => ({ ...x, loads: [...x.loads, null] }))} onRemove={() => set(x => ({ ...x, loads: x.loads.slice(0, -1) }))} />
      </>
    ),
    params: (
      <div className="grid gap-x-8 sm:grid-cols-2">
        <Param k="Grade of concrete">
          <Select aria-label="Grade of concrete" disabled={ro} value={d.grade} onChange={e => set(x => ({ ...x, grade: +e.target.value }))} className="!w-auto num">
            {[15, 20, 25, 30, 35, 40].map(g => <option key={g} value={g}>M{g} (fck {g} MPa)</option>)}
          </Select>
        </Param>
        <Param k="Cube size">
          <Select aria-label="Cube size" disabled={ro} value={d.sizeMm} onChange={e => set(x => ({ ...x, sizeMm: +e.target.value }))} className="!w-auto num">
            <option value={100}>100 mm</option><option value={150}>150 mm</option>
          </Select>
        </Param>
        <NumParam k="Age at test" unit="days" value={d.ageDays} disabled={ro} onChange={v => set(x => ({ ...x, ageDays: v ?? 28 }))} step="1" />
      </div>
    ),
    result: (
      <ResultPanel verdict={r.verdict} headline={r.n ? f1(r.mean) : '—'} headlineUnit="MPa mean" standard="IS 516 / IS 456" checks={r.checks}
        extra={[{ k: 'Std deviation', v: r.n > 1 ? `${f2(r.sd)} MPa` : '—' }, { k: 'Lowest cube', v: r.n ? `${f1(r.min)} MPa` : '—' }]}
        basis="Prototype acceptance rule: mean ≥ fck + 3 MPa and every cube ≥ fck − 3 MPa. Confirm against the current IS 456 and the project specification before relying on it." />
    ),
    chart: (
      <ChartFrame fig="FIG. 1" title="Cube strengths against limits" note="Dashed lines: acceptance limits for the chosen grade.">
        {!r.n ? <p className="py-10 text-center text-small text-ink-2">Enter a failure load to see the chart.</p> : (
          <div className="h-[280px]" role="img" aria-label="Bar chart of the cube strengths with the mean and individual acceptance limits">
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 16, right: 100, bottom: 0, left: -12 }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--line)' }} />
                <YAxis domain={[0, (m: number) => Math.ceil((Math.max(m, r.meanLimit) * 1.15) / 5) * 5]} tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip unit=" MPa" />} cursor={{ fill: 'var(--surface-2)' }} />
                <ReferenceLine y={r.meanLimit} stroke="var(--ink)" strokeDasharray="5 4" label={{ value: `mean ≥ ${f1(r.meanLimit)}`, position: 'right', fill: 'var(--ink)', fontSize: 11, fontFamily: mono }} />
                <ReferenceLine y={r.indivLimit} stroke="var(--fail)" strokeDasharray="5 4" label={{ value: `each ≥ ${f1(r.indivLimit)}`, position: 'right', fill: 'var(--fail)', fontSize: 11, fontFamily: mono }} />
                <ReferenceLine y={r.mean} stroke="var(--ink-2)" strokeWidth={1} label={{ value: `mean ${f1(r.mean)}`, position: 'right', fill: 'var(--ink-2)', fontSize: 11, fontFamily: mono }} />
                <Bar dataKey="mpa" name="Strength" barSize={48} isAnimationActive={false}>
                  {data.map((x, i) => <Cell key={i} fill={x.mpa != null && x.mpa < r.indivLimit ? 'var(--fail)' : 'var(--ink)'} />)}
                  <LabelList dataKey="mpa" position="insideTop" formatter={(v: any) => f1(Number(v))} style={{ fontFamily: mono, fontSize: 13, fill: '#F6F4EF' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartFrame>
    ),
  }
}

/* ============================ SIEVE ANALYSIS ============================ */
const sieveTick = (mm: number) => (mm === 0.6 ? '600 µm' : mm < 1 ? `${Math.round(mm * 1000)} µm` : `${mm} mm`)

function Sieve({ run, ro, set }: { run: Run; ro: boolean; set: (f: (d: SieveData) => SieveData) => void }) {
  const d = run.data as SieveData
  const r = sieveAnalysis(d.retained, d.pan, d.zone)
  const rows = SIEVES.map((s, i) => ({ label: s.size, retained: d.retained[i] }))
  const curve = [...r.rows].sort((a, b) => a.mm - b.mm).map(x => ({ mm: x.mm, passing: +x.passing.toFixed(2), lo: x.limit.lo, hi: x.limit.hi }))
  const lbl = (text: string, dy: number, at: number) => (p: any) => p.index === at ? <text x={p.x + 6} y={p.y + dy} fontFamily={mono} fontSize={11} fill="var(--ink-2)">{text}</text> : <g />
  return {
    form: (
      <TestForm rowHeader="Sieve" caption="Mass retained on each sieve" rows={rows} readOnly={ro}
        onChange={(i, _k, v) => set(x => ({ ...x, retained: x.retained.map((m, j) => (j === i ? v : m)) }))}
        columns={[
          { key: 'retained', label: 'Retained', unit: 'g', step: '1' },
          { key: 'p', label: 'Retained', unit: '%', calc: (_r, i) => (r.total ? f1(r.rows[i].pctRetained) : '—') },
          { key: 'c', label: 'Cumulative', unit: '%', calc: (_r, i) => (r.total ? f1(r.rows[i].cumRetained) : '—') },
          { key: 'pa', label: 'Passing', unit: '%', calc: (_r, i) => <span className="font-medium">{r.total ? f1(r.rows[i].passing) : '—'}</span> },
          { key: 'lim', label: `Zone ${d.zone}`, unit: '%', calc: (_r, i) => `${r.rows[i].limit.lo}–${r.rows[i].limit.hi}` },
          { key: 'ok', label: 'Check', calc: (_r, i) => (!r.total ? '—' : <span style={{ color: r.rows[i].ok ? 'var(--pass)' : 'var(--fail)' }}>{r.rows[i].ok ? 'OK' : 'OUT'}</span>) },
        ]} />
    ),
    params: (
      <div className="grid gap-x-8 sm:grid-cols-2">
        <NumParam k="Mass in pan" unit="g" value={d.pan} disabled={ro} onChange={v => set(x => ({ ...x, pan: v }))} />
        <Param k="Total sample mass"><span className="num font-medium">{r.total ? `${r.total.toFixed(0)} g` : '—'}</span></Param>
        <Param k="Grading zone to check">
          <Select aria-label="Grading zone" disabled={ro} value={d.zone} onChange={e => set(x => ({ ...x, zone: e.target.value as Zone }))} className="!w-auto num">
            {(['I', 'II', 'III', 'IV'] as Zone[]).map(z => <option key={z} value={z}>Zone {z}</option>)}
          </Select>
        </Param>
      </div>
    ),
    result: (
      <ResultPanel verdict={r.verdict} headline={r.total ? f2(r.fm) : '—'} headlineUnit="fineness modulus" standard={`IS 383, Zone ${d.zone}`}
        checks={[{ label: `Sieves inside Zone ${d.zone} band`, value: r.total ? `${r.rows.length - r.outside.length} of ${r.rows.length}` : '—', limit: 'all', ok: r.total > 0 && r.outside.length === 0 }]}
        extra={[{ k: 'Total mass', v: r.total ? `${r.total.toFixed(0)} g` : '—' }, { k: 'Outside band', v: r.total ? (r.outside.length ? r.outside.join(', ') : 'none') : '—' }]}
        basis="Grading limits follow the IS 383 fine-aggregate zones; confirm them against the current edition. Fineness modulus = sum of cumulative % retained on 4.75 mm to 150 µm ÷ 100." />
    ),
    chart: (
      <ChartFrame fig="FIG. 1" title="Grading curve" note={`Percentage passing against sieve size (log scale). Dashed: Zone ${d.zone} limits.`}>
        {!r.total ? <p className="py-10 text-center text-small text-ink-2">Enter the retained masses to see the grading curve.</p> : (
          <div className="h-[320px]" role="img" aria-label="Grading curve of percentage passing against sieve size with zone limits">
            <ResponsiveContainer>
              <ComposedChart data={curve} margin={{ top: 8, right: 24, bottom: 8, left: -12 }}>
                <CartesianGrid stroke={gridStroke} />
                <XAxis dataKey="mm" type="number" scale="log" domain={[0.1, 15]} allowDataOverflow ticks={[0.15, 0.3, 0.6, 1.18, 2.36, 4.75, 10]} tickFormatter={sieveTick} tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--line)' }} />
                <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip unit=" %" />} labelFormatter={(v: any) => sieveTick(Number(v))} />
                <Line name="Zone max" dataKey="hi" stroke="var(--ink-2)" strokeDasharray="5 4" strokeWidth={1} dot={false} isAnimationActive={false} label={lbl('zone max', -8, 1)} />
                <Line name="Zone min" dataKey="lo" stroke="var(--ink-2)" strokeDasharray="5 4" strokeWidth={1} dot={false} isAnimationActive={false} label={lbl('zone min', 16, 5)} />
                <Line name="% passing" dataKey="passing" stroke="var(--ink)" strokeWidth={2} dot={{ r: 3, fill: 'var(--ink)' }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartFrame>
    ),
  }
}

/* ============================ PROCTOR ============================ */
function Proctor({ run, ro, set }: { run: Run; ro: boolean; set: (f: (d: ProctorData) => ProctorData) => void }) {
  const d = run.data as ProctorData
  const r = proctor({ mouldMass: d.mouldMass, mouldVolume: d.mouldVolume, gs: d.gs, designMdd: d.designMdd, points: d.points })
  const rows = d.points.map((p, i) => ({ label: `Point ${i + 1}`, w: p.w, mass: p.mass }))
  const wMin = r.pts.length ? Math.min(...r.pts.map(p => p.w)) : 0
  const wMax = r.pts.length ? Math.max(...r.pts.map(p => p.w)) : 0
  const line = r.fit.map((x, i) => ({ w: x.w, fit: +x.dry.toFixed(4), zav: +r.zav[i].dry.toFixed(4) }))
  const inside = r.mdd > 0 && r.omc >= wMin && r.omc <= wMax
  const dm = d.designMdd
  return {
    form: (
      <>
        <TestForm rowHeader="Point" caption="Compaction points" rows={rows} readOnly={ro}
          onChange={(i, k, v) => set(x => ({ ...x, points: x.points.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }))}
          columns={[
            { key: 'w', label: 'Moisture content', unit: '%', step: '0.1' },
            { key: 'mass', label: 'Mould + soil', unit: 'g', step: '1' },
            { key: 'bulk', label: 'Bulk density', unit: 'g/cc', calc: (_r, i) => f3(r.rowBulk[i]) },
            { key: 'dry', label: 'Dry density', unit: 'g/cc', calc: (_r, i) => <span className="font-medium">{f3(r.rowDry[i])}</span> },
          ]} />
        <Rows n={d.points.length} min={3} disabled={ro || d.points.length >= 10} label="point" onAdd={() => set(x => ({ ...x, points: [...x.points, { w: null, mass: null }] }))} onRemove={() => set(x => ({ ...x, points: x.points.slice(0, -1) }))} />
      </>
    ),
    params: (
      <div className="grid gap-x-8 sm:grid-cols-2">
        <NumParam k="Mould mass" unit="g" value={d.mouldMass} disabled={ro} onChange={v => set(x => ({ ...x, mouldMass: v }))} />
        <NumParam k="Mould volume" unit="cc" value={d.mouldVolume} disabled={ro} onChange={v => set(x => ({ ...x, mouldVolume: v ?? 1000 }))} />
        <NumParam k="Specific gravity, Gs" value={d.gs} disabled={ro} onChange={v => set(x => ({ ...x, gs: v ?? 2.65 }))} step="0.01" />
        <NumParam k="Design MDD (optional)" unit="g/cc" value={d.designMdd} disabled={ro} onChange={v => set(x => ({ ...x, designMdd: v }))} step="0.01" placeholder="none" />
      </div>
    ),
    result: (
      <ResultPanel verdict={r.verdict} headline={r.mdd ? f2(r.mdd) : '—'} headlineUnit="g/cc MDD" standard="project specification"
        checks={[
          { label: 'Max dry density (MDD)', value: r.mdd ? `${f2(r.mdd)} g/cc` : '—', limit: dm != null ? `≥ ${f2(dm)} g/cc` : 'no design value', ok: r.mdd > 0 && (dm == null || r.mdd >= dm) },
          { label: 'Peak inside tested range', value: r.mdd ? `OMC ${f1(r.omc)} %` : '—', limit: r.pts.length ? `${wMin}–${wMax} %` : '—', ok: inside },
        ]}
        extra={[{ k: 'Optimum moisture (OMC)', v: r.mdd ? `${f1(r.omc)} %` : '—' }, { k: 'Complete points', v: `${r.pts.length} (need ${PROCTOR_MIN_POINTS})` }]}
        basis="MDD and OMC are the peak of a quadratic fitted to the dry-density points. Pass/fail applies only if you enter a design MDD (a project value, not a code limit)." />
    ),
    chart: (
      <ChartFrame fig="FIG. 1" title="Compaction curve" note="Dry density against moisture content. Dashed: zero-air-voids line and design MDD.">
        {r.pts.length < 3 || !r.mdd ? <p className="py-10 text-center text-small text-ink-2">Enter at least {PROCTOR_MIN_POINTS} complete points to see the curve.</p> : (
          <div className="h-[320px]" role="img" aria-label="Compaction curve of dry density against moisture content with zero air voids line and the optimum point">
            <ResponsiveContainer>
              <ComposedChart data={line} margin={{ top: 8, right: 90, bottom: 8, left: -4 }}>
                <CartesianGrid stroke={gridStroke} />
                <XAxis dataKey="w" type="number" domain={[wMin - 2, wMax + 2]} ticks={Array.from({ length: Math.floor((wMax - wMin) / 2) + 3 }, (_, i) => Math.round((wMin - 2 + i * 2) * 10) / 10)} allowDataOverflow tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--line)' }} unit="%" />
                <YAxis domain={[(m: number) => Math.floor((m - 0.1) * 10) / 10, (m: number) => Math.ceil((m + 0.15) * 10) / 10]} tickFormatter={(v: number) => v.toFixed(1)} tick={axisTick} tickLine={false} axisLine={false} allowDataOverflow />
                <Tooltip content={<ChartTooltip />} />
                {dm != null && <ReferenceLine y={dm} stroke="var(--fail)" strokeDasharray="5 4" label={{ value: `design ${f2(dm)}`, position: 'right', fill: 'var(--fail)', fontSize: 11, fontFamily: mono }} />}
                <Line name="Zero air voids" dataKey="zav" stroke="var(--ink-2)" strokeDasharray="5 4" strokeWidth={1} dot={false} isAnimationActive={false}
                  label={(q: any) => q.index === 36 ? <text x={q.x + 6} y={q.y + 4} fontFamily={mono} fontSize={11} fill="var(--ink-2)">ZAV</text> : <g />} />
                <Line name="Fitted curve" dataKey="fit" stroke="var(--ink)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Scatter name="Test points" data={r.pts.map(x => ({ w: x.w, fit: +x.dry.toFixed(4) }))} dataKey="fit" fill="var(--ink)" isAnimationActive={false} />
                <ReferenceDot x={r.omc} y={r.mdd} r={5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={1.5} label={{ value: `MDD ${f2(r.mdd)} @ ${f1(r.omc)}%`, position: 'top', fill: 'var(--ink)', fontSize: 11, fontFamily: mono }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartFrame>
    ),
  }
}

/* ============================ CRACK WIDTH (PHOTO) ============================ */
function Crack({ run, ro, set }: { run: Run; ro: boolean; set: (f: (d: CrackData) => CrackData) => void }) {
  const d = run.data as CrackData
  const r = crackAnalysis({ scale: d.scale, scaleMm: d.scaleMm, cracks: d.cracks, limit: d.limit, imgW: d.imgW })
  const data = r.widths.map((w, i) => ({ name: `#${i + 1}`, w: +w.toFixed(3) }))
  return {
    form: <CrackPhoto d={d} ro={ro} set={set} />,
    params: (
      <div className="grid gap-x-8 sm:grid-cols-2">
        <NumParam k="Known length on the ruler" unit="mm" value={d.scaleMm} disabled={ro} onChange={v => set(x => ({ ...x, scaleMm: v }))} placeholder="e.g. 50" />
        <NumParam k="Allowable crack width" unit="mm" value={d.limit} disabled={ro} step="0.1" onChange={v => set(x => ({ ...x, limit: v && v > 0 ? v : 0.3 }))} />
        <Param k="Scale from photo"><span className="num">{r.mmPerPx ? `${(1 / r.mmPerPx).toFixed(1)} px/mm` : '—'}</span></Param>
        <Param k="One pixel is"><span className="num">{r.mmPerPx ? `${r.mmPerPx.toFixed(3)} mm` : '—'}</span></Param>
      </div>
    ),
    result: (
      <ResultPanel verdict={r.verdict} headline={r.n ? f2(r.max) : '—'} headlineUnit="mm widest" standard="IS 456 cl. 35.3"
        checks={r.checks}
        extra={[{ k: 'Locations measured', v: String(r.n) }, { k: 'Mean width', v: r.n ? `${f2(r.mean)} mm` : '—' }]}
        basis="Widths come from the photo scale, so accuracy is about one pixel (shown under the readings) and depends on the camera being square to the surface. Treat this as a screening measurement and confirm critical cracks with a crack comparator or microscope. The allowable width is a project value, set it from your specification." />
    ),
    chart: (
      <ChartFrame fig="FIG. 1" title="Crack width at each location" note="Dashed line: allowable width.">
        {!data.length ? <p className="py-10 text-center text-small text-ink-2">Set the scale and measure at least one crack to see the chart.</p> : (
          <div className="h-[240px]" role="img" aria-label="Bar chart of measured crack widths against the allowable width">
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 10, right: 60, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={axisTick} tickLine={false} />
                <YAxis domain={[0, (m: number) => Math.ceil(Math.max(m, d.limit) * 12.5) / 10]} tickFormatter={(v: number) => v.toFixed(1)} tick={axisTick} tickLine={false} axisLine={false} unit=" mm" />
                <ReferenceLine y={d.limit} stroke="var(--fail)" strokeDasharray="5 4" label={{ value: `≤ ${d.limit.toFixed(1)}`, position: 'right', fill: 'var(--fail)', fontSize: 11, fontFamily: mono }} />
                <Bar dataKey="w" barSize={44} isAnimationActive={false}>
                  {data.map((x, i) => <Cell key={i} fill={x.w > d.limit ? 'var(--fail)' : 'var(--ink)'} />)}
                  <LabelList dataKey="w" position="insideTop" fill="#fff" fontSize={11} fontFamily={mono} formatter={(v: unknown) => Number(v).toFixed(2)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartFrame>
    ),
  }
}

/* ============================ PAGE ============================ */
export default function RunDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { db, act } = useStore()
  const [comment, setComment] = useState('')
  const run = db.runs.find(r => r.id === id)
  if (!run) return <div className="mx-auto max-w-xl pt-10"><ErrorState title="Test not found" body="It may have been deleted, or the data was cleared." /><p className="mt-4 text-center"><Link to="/tests" className="underline">Back to tests</Link></p></div>

  const sample = db.samples.find(s => s.id === run.sampleId)
  const project = db.projects.find(p => p.id === run.projectId)
  const batch = db.batches.find(b => b.id === sample?.batchId)
  const ro = run.status === 'review' || run.status === 'approved'
  const isEngineer = db.settings.role === 'engineer'
  const sum = summarize(run)
  const upd = <T,>(f: (d: T) => T) => act.updateRun(run.id, r => ({ ...r, data: f(r.data as T) as Run['data'] }))

  const view = run.kind === 'cube' ? Cube({ run, ro, set: upd }) : run.kind === 'sieve' ? Sieve({ run, ro, set: upd }) : run.kind === 'crack' ? Crack({ run, ro, set: upd }) : Proctor({ run, ro, set: upd })

  return (
    <div className="mx-auto max-w-[1360px]">
      <nav aria-label="Breadcrumb" className="mb-2 text-small text-ink-2">
        <Link to="/projects" className="underline">Projects</Link> / <Link to={`/projects/${run.projectId}`} className="underline">{project?.name ?? run.projectId}</Link> / <span className="num">{run.id}</span>
      </nav>
      <PageHeader title={KINDS[run.kind].title} right={
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip kind={run.status} />
          <Btn v={run.status === 'approved' ? 'primary' : 'secondary'} onClick={() => nav(`/reports/${run.id}`)}><FileText size={15} />{run.status === 'approved' ? 'Generate report (PDF)' : 'Preview report'}</Btn>
        </div>} />
      <TitleBlock items={[
        { k: 'Test ID', v: run.id }, { k: 'Sample ID', v: run.sampleId }, { k: 'Test date', v: fmtDate(run.testDate) },
        { k: 'Tested by', v: run.technician }, { k: 'Standard', v: KINDS[run.kind].standard },
      ]} />
      <p className="num mt-1.5 text-[12px] text-ink-2">{project?.name} · {batch?.name} · {sample ? materialLabel(sample.material) : ''}{sample?.description ? ` · ${sample.description}` : ''}</p>

      {/* workflow bar */}
      <div className="mt-3 border border-line bg-surface p-3">
        {run.status === 'rejected' && <p className="mb-3 border-l-[3px] bg-surface-2 px-3 py-2 text-small" style={{ borderColor: 'var(--warn)' }}><span className="font-medium">Sent back by the engineer:</span> {run.reviewComment ?? 'no comment'}. Fix the readings and submit again.</p>}
        {(run.status === 'draft' || run.status === 'rejected') && (
          <div className="flex flex-wrap items-center gap-2">
            <Btn v="primary" disabled={!sum.complete} onClick={() => act.submitRun(run.id)}><Send size={15} />Submit for review</Btn>
            <Btn onClick={() => act.useExample(run.id)}><Wand2 size={15} />Fill example readings</Btn>
            <Btn v="danger" className="ml-auto" onClick={() => { if (window.confirm(`Delete test ${run.id}? This cannot be undone.`)) { act.deleteRun(run.id); nav('/tests') } }}><Trash2 size={15} />Delete</Btn>
            <p className="basis-full text-[12px] text-ink-2">{sum.complete ? 'All readings are in. Submitting locks them until the engineer decides.' : 'Fill every reading to enable Submit. Your entries save automatically in this browser.'}</p>
          </div>
        )}
        {run.status === 'review' && (isEngineer ? (
          <div>
            <p className="mb-2 text-small"><span className="font-medium">Engineer review.</span> Check the readings and result, then approve or send back with a reason.</p>
            <div className="flex flex-wrap items-start gap-2">
              <TextInput aria-label="Review comment" value={comment} onChange={e => setComment(e.target.value)} placeholder="Comment (required to send back)" className="min-w-[240px] flex-1" />
              <Btn v="primary" onClick={() => { act.reviewRun(run.id, true, comment); setComment('') }}><Check size={15} />Approve</Btn>
              <Btn disabled={!comment.trim()} onClick={() => { act.reviewRun(run.id, false, comment); setComment('') }}><Undo2 size={15} />Send back</Btn>
            </div>
          </div>
        ) : <p className="text-small"><span className="font-medium">Waiting for an engineer.</span> Readings are locked. Use the user menu (top right) to switch role to Engineer and approve this test.</p>)}
        {run.status === 'approved' && <p className="text-small"><span className="font-medium">Approved</span> by {run.approvedBy} on {run.approvedAt ? fmtDateTime(run.approvedAt) : '—'}{run.reviewComment ? `: ${run.reviewComment}` : ''}. The report is ready to print.</p>}
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="grid content-start gap-3">
          <ChartFrame fig="SHEET 1" title="Readings" note={ro ? 'Locked while in review or after approval.' : 'Edit any value; results and graph update immediately.'}>
            <div className="-m-4">{view.form}</div>
            <div className="mt-4 pt-6">{view.params}</div>
          </ChartFrame>
          {view.chart}
        </div>
        <div className="grid content-start gap-3">
          <ChartFrame fig="SHEET 2" title="Calculated results">{view.result}</ChartFrame>
          <ChartFrame fig="LOG" title="Activity">
            <ol className="-my-1 divide-y divide-line">
              {[...run.events].reverse().map((e, i) => (
                <li key={i} className="py-2"><p className="num text-[11px] text-ink-2">{fmtDateTime(e.at)} · {e.by}</p><p className="text-small">{e.text}</p></li>
              ))}
            </ol>
          </ChartFrame>
        </div>
      </div>
    </div>
  )
}
