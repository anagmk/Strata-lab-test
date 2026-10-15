import type { ReactNode } from 'react'
import { AlertTriangle, Inbox } from 'lucide-react'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />
}

export function SkeletonRows({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-4 px-3 py-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} className="h-3.5" />)}
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="paper flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <Inbox size={20} className="text-ink-2" aria-hidden />
      <p className="font-display text-xl font-600 tracking-wide uppercase">{title}</p>
      {body && <p className="max-w-sm text-ink-2">{body}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ title = 'Could not load this view', body, onRetry }: { title?: string; body?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 border border-fail px-6 py-10 text-center">
      <AlertTriangle size={20} style={{ color: 'var(--fail)' }} aria-hidden />
      <p className="font-display text-xl font-600 tracking-wide uppercase">{title}</p>
      {body && <p className="max-w-sm text-ink-2">{body}</p>}
      {onRetry && <button onClick={onRetry} className="mt-2 border border-ink px-3 py-1.5 text-small font-medium hover:bg-surface-2">Retry</button>}
    </div>
  )
}
