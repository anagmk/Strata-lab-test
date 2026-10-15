import { useEffect, useRef, useState } from 'react'
import { Upload, Ruler, Crosshair, Trash2 } from 'lucide-react'
import { crackAnalysis, type Pt } from '../lib/calc'
import type { CrackData } from '../lib/db'
import { fileToStoredImage, loadGray, snapAcross } from '../lib/image'
import { Btn } from './ui'

type Gray = Awaited<ReturnType<typeof loadGray>>

/** The photo with the scale line and measured crack lines drawn over it. Read-only; used here and in the report. */
export function CrackFigure({ d, className = '' }: { d: CrackData; className?: string }) {
  const r = crackAnalysis({ scale: d.scale, scaleMm: d.scaleMm, cracks: d.cracks, limit: d.limit, imgW: d.imgW })
  if (!d.image) return null
  const sw = Math.max(2, d.imgW / 450)         // stroke scales with the photo so it stays readable
  const fs = Math.max(14, d.imgW / 55)
  return (
    <div className={`relative ${className}`}>
      <img src={d.image} alt="Photo of the concrete surface being measured" className="block w-full" />
      <svg viewBox={`0 0 ${d.imgW} ${d.imgH}`} className="absolute inset-0 h-full w-full" aria-hidden>
        {d.scale.length === 2 && <line x1={d.scale[0].x} y1={d.scale[0].y} x2={d.scale[1].x} y2={d.scale[1].y} stroke="#f26a1b" strokeWidth={sw} />}
        {d.scale.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={sw * 1.8} fill="#f26a1b" />)}
        {d.cracks.map((c, i) => {
          const w = r.widths[i]; const bad = w != null && w > d.limit
          const col = bad ? '#d0342c' : '#1e9e55'
          return (
            <g key={i}>
              <line x1={c.a.x} y1={c.a.y} x2={c.b.x} y2={c.b.y} stroke={col} strokeWidth={sw} />
              <circle cx={c.a.x} cy={c.a.y} r={sw * 1.2} fill={col} /><circle cx={c.b.x} cy={c.b.y} r={sw * 1.2} fill={col} />
              <text x={Math.max(c.a.x, c.b.x) + fs * 0.6} y={(c.a.y + c.b.y) / 2 + fs * 0.35} fontSize={fs} fontFamily="IBM Plex Mono, monospace" fontWeight={600} fill="#fff" stroke="#111" strokeWidth={fs / 5} paintOrder="stroke">{i + 1}{w != null ? ` · ${w.toFixed(2)} mm` : ''}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Upload, calibrate and measure. Edits flow back through `set`. */
export function CrackPhoto({ d, ro, set }: { d: CrackData; ro: boolean; set: (f: (d: CrackData) => CrackData) => void }) {
  const [mode, setMode] = useState<'scale' | 'crack'>(d.scale.length === 2 ? 'crack' : 'scale')
  const [pending, setPending] = useState<Pt | null>(null)
  const [snap, setSnap] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const gray = useRef<{ src: string; g: Gray } | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const r = crackAnalysis({ scale: d.scale, scaleMm: d.scaleMm, cracks: d.cracks, limit: d.limit, imgW: d.imgW })

  useEffect(() => { setPending(null) }, [mode, d.image])

  async function upload(f: File | undefined) {
    if (!f) return
    setMsg(null)
    try { const im = await fileToStoredImage(f); set(x => ({ ...x, ...im, exampleImage: false, scale: [], cracks: [], scaleMm: null })); setMode('scale') }
    catch (e) { setMsg((e as Error).message) }
  }

  async function click(e: React.MouseEvent<SVGSVGElement>) {
    if (ro || !svg.current) return
    const b = svg.current.getBoundingClientRect()
    const p = { x: ((e.clientX - b.left) / b.width) * d.imgW, y: ((e.clientY - b.top) / b.height) * d.imgH }
    if (!pending) { setPending(p); setMsg(null); return }
    const a = pending; setPending(null)
    if (mode === 'scale') { set(x => ({ ...x, scale: [a, p] })); setMode('crack'); return }
    let pts = { a, b: p }, snapped = false
    if (snap && d.image) {
      try {
        if (gray.current?.src !== d.image) gray.current = { src: d.image, g: await loadGray(d.image) }
        const s = snapAcross(gray.current.g, a, p)
        if (s) { pts = s; snapped = true } else setMsg('No clear crack found on that line, so your two points were used as drawn. Draw the line across the whole crack, ends on clean surface.')
      } catch { /* fall back to the points as drawn */ }
    }
    set(x => ({ ...x, cracks: [...x.cracks, { ...pts, note: '', snapped }] }))
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <label className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-small ${ro ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-surface-2'}`} style={{ borderColor: 'var(--line-strong)' }}>
          <Upload size={14} />{d.image ? 'Replace photo' : 'Upload photo'}
          <input type="file" accept="image/*" className="sr-only" disabled={ro} onChange={e => { upload(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        {d.image && <>
          <Btn onClick={() => setMode('scale')} disabled={ro} className={mode === 'scale' ? '!border-accent' : ''}><Ruler size={14} />1 · Set scale</Btn>
          <Btn onClick={() => setMode('crack')} disabled={ro || !r.mmPerPx} className={mode === 'crack' ? '!border-accent' : ''}><Crosshair size={14} />2 · Measure crack</Btn>
          <label className="ml-auto flex items-center gap-1.5 text-small"><input type="checkbox" checked={snap} disabled={ro} onChange={e => setSnap(e.target.checked)} />Snap to crack edges</label>
        </>}
      </div>

      {!d.image ? (
        <div className="px-4 py-10 text-center text-small text-ink-2">
          <p className="font-medium text-ink">No photo yet</p>
          <p className="mx-auto mt-1 max-w-md">Photograph the crack straight on, with a ruler or scale bar of known length beside it. Upload it here, or use “Fill example readings” to try a sample photo.</p>
        </div>
      ) : (
        <>
          <p className="border-b border-line bg-surface-2 px-3 py-2 text-[12px]" aria-live="polite">
            {mode === 'scale'
              ? (pending ? 'Now click the other end of the known length.' : 'Step 1: click two points on the ruler a known distance apart, then enter that distance below.')
              : (pending ? 'Now click the other side of the crack. Run the line across the whole crack, at right angles to it, ends on clean surface.' : 'Step 2: click one side of the crack, then the other, at right angles to it. Repeat at each location you want to measure.')}
          </p>
          <div className="relative p-3">
            <div className="relative select-none" style={{ cursor: ro ? 'default' : 'crosshair' }}>
              <CrackFigure d={d} />
              <svg ref={svg} viewBox={`0 0 ${d.imgW} ${d.imgH}`} className="absolute inset-0 h-full w-full" onClick={click} role="img" aria-label="Click on the photo to place measurement points">
                {pending && <circle cx={pending.x} cy={pending.y} r={Math.max(4, d.imgW / 220)} fill="none" stroke="#f26a1b" strokeWidth={Math.max(2, d.imgW / 450)} />}
              </svg>
            </div>
          </div>
        </>
      )}
      {msg && <p className="border-t border-line px-3 py-2 text-[12px]" style={{ color: 'var(--warn)' }}>{msg}</p>}

      {d.image && (
        <div className="border-t border-line px-3 py-2">
          <p className="label mb-1">Measured locations</p>
          {d.cracks.length === 0 ? <p className="py-2 text-small text-ink-2">{r.mmPerPx ? 'None yet. Choose “2 · Measure crack” and click across the crack.' : 'Set the scale first.'}</p> : (
            <table className="w-full border-collapse text-small">
              <thead><tr className="text-left"><th className="label py-1 font-normal">#</th><th className="label py-1 font-normal">Where</th><th className="label py-1 text-right font-normal">Width [mm]</th><th className="label py-1 pl-3 font-normal">Method</th><th /></tr></thead>
              <tbody>
                {d.cracks.map((c, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="num py-1.5 pr-2">{i + 1}</td>
                    <td className="py-1.5 pr-2"><input aria-label={`Location of crack ${i + 1}`} disabled={ro} value={c.note} placeholder="e.g. mid-span" onChange={e => set(x => ({ ...x, cracks: x.cracks.map((k, j) => (j === i ? { ...k, note: e.target.value } : k)) }))} className="w-full border border-line bg-surface px-2 py-1 disabled:bg-surface-2" /></td>
                    <td className="num py-1.5 text-right font-medium" style={{ color: r.widths[i] > d.limit ? 'var(--fail)' : undefined }}>{r.widths[i] != null ? r.widths[i].toFixed(2) : '—'}</td>
                    <td className="py-1.5 pl-3 text-[12px] text-ink-2">{c.snapped ? 'edge-detected' : 'by hand'}</td>
                    <td className="py-1.5 text-right"><button aria-label={`Remove crack ${i + 1}`} disabled={ro} onClick={() => set(x => ({ ...x, cracks: x.cracks.filter((_, j) => j !== i) }))} className="p-1 text-ink-2 hover:text-ink disabled:opacity-40"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
