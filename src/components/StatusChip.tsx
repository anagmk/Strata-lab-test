export type ChipKind = 'pass' | 'warn' | 'fail' | 'info' | 'draft' | 'review' | 'approved' | 'rejected'

const MAP: Record<ChipKind, { label: string; color: string }> = {
  pass: { label: 'Pass', color: 'var(--pass)' },
  fail: { label: 'Fail', color: 'var(--fail)' },
  warn: { label: 'Incomplete', color: 'var(--warn)' },
  info: { label: 'Reported', color: 'var(--ink-2)' },
  draft: { label: 'Draft', color: 'var(--ink-2)' },
  review: { label: 'In review', color: 'var(--ink)' },
  approved: { label: 'Approved', color: 'var(--ink)' },
  rejected: { label: 'Sent back', color: 'var(--warn)' },
}

/** Text stays ink for AA contrast; status colour lives in the marker and border. */
export function StatusChip({ kind, label }: { kind: ChipKind; label?: string }) {
  const m = MAP[kind]
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap border px-1.5 py-px text-[11px] font-medium uppercase tracking-wider" style={{ borderColor: m.color }}>
      <span aria-hidden className="inline-block h-2 w-2" style={{ background: kind === 'approved' ? 'var(--ink)' : m.color }} />
      {label ?? m.label}
    </span>
  )
}
