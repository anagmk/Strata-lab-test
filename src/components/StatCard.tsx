import { useCountUp } from '../lib/useCountUp'

export function StatCard({ label, value, decimals = 0, suffix, note, critical, empty }: {
  label: string; value: number; decimals?: number; suffix?: string; note: string; critical?: boolean; empty?: boolean
}) {
  const shown = useCountUp(value, 700, decimals)
  return (
    <div className="relative border border-line bg-surface p-4">
      {critical && <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] bg-accent" />}
      <p className="label">{label}</p>
      <p className="mt-2 font-display text-kpi leading-none font-600 tabular-nums">
        {empty ? '—' : shown}{!empty && suffix && <span className="ml-0.5 text-2xl text-ink-2">{suffix}</span>}
      </p>
      <p className="num mt-2 text-[12px] text-ink-2">{note}</p>
    </div>
  )
}
