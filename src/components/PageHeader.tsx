import type { ReactNode } from 'react'
export function PageHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="label mb-1">{eyebrow}</p>}
        <h1 className="font-display text-h1 leading-none font-700 uppercase tracking-wide">{title}</h1>
      </div>
      {right}
    </div>
  )
}
