import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label mb-1 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-ink-2">{hint}</span>}
    </label>
  )
}

const input = 'w-full border border-line bg-surface px-2.5 py-1.5 text-small hover:border-ink-2 focus:border-ink disabled:bg-surface-2 disabled:text-ink-2'
export const TextInput = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${input} ${p.className ?? ''}`} />
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={`${input} ${p.className ?? ''}`} />

type V = 'primary' | 'secondary' | 'danger'
export function Btn({ v = 'secondary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { v?: V }) {
  const base = 'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-small font-medium disabled:cursor-not-allowed disabled:opacity-45'
  const look = v === 'primary' ? 'bg-accent text-accent-ink hover:opacity-90'
    : v === 'danger' ? 'border border-line text-fail hover:bg-surface-2'
    : 'border border-ink bg-surface hover:bg-surface-2'
  return <button type="button" {...p} className={`${base} ${look} ${className}`} />
}

/** inline form card used for "New project / batch / sample / test" */
export function FormCard({ title, children, onSubmit, submit, disabled, note }: { title: string; children: ReactNode; onSubmit: () => void; submit: string; disabled?: boolean; note?: string }) {
  return (
    <form onSubmit={e => { e.preventDefault(); if (!disabled) onSubmit() }} className="border border-line bg-surface-2 p-4">
      <p className="font-display mb-3 text-lg font-600 uppercase tracking-wide">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      <div className="mt-4 flex items-center gap-3">
        <Btn v="primary" type="submit" disabled={disabled}>{submit}</Btn>
        {note && <span className="text-[12px] text-ink-2">{note}</span>}
      </div>
    </form>
  )
}
