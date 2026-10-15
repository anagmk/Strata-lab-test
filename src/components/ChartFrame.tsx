import type { ReactNode } from 'react'

/** Panel with a drawing-sheet header: figure number, title, note. */
export function ChartFrame({ fig, title, note, right, children, className = '' }: {
  fig?: string; title: string; note?: string; right?: ReactNode; children: ReactNode; className?: string
}) {
  return (
    <section className={`border border-line bg-surface ${className}`} aria-label={title}>
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-2.5">
        <div>
          <h2 className="font-display text-lg leading-tight font-600 uppercase tracking-wide">
            {fig && <span className="num mr-2 text-[11px] font-normal tracking-normal text-ink-2">{fig}</span>}{title}
          </h2>
          {note && <p className="text-[12px] text-ink-2">{note}</p>}
        </div>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

/** shared recharts text style */
export const axisTick = { fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fill: 'var(--ink-2)' }
export const gridStroke = 'var(--line)'

export function ChartTooltip({ active, payload, label, unit = '' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="border border-line bg-surface px-2.5 py-1.5 text-[12px]" style={{ borderColor: 'var(--line-strong)' }}>
      <p className="num mb-1 font-medium">{label}</p>
      {payload.filter((p: any) => p.value != null).map((p: any) => (
        <p key={p.dataKey} className="num flex justify-between gap-4 text-ink-2">
          <span>{p.name}</span><span className="text-ink">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}{unit}</span>
        </p>
      ))}
    </div>
  )
}
