import { Check, X } from 'lucide-react'
import type { Verdict } from '../lib/calc'

const V = {
  pass: { word: 'Pass', color: 'var(--pass)' },
  warn: { word: 'Incomplete', color: 'var(--warn)' },
  fail: { word: 'Fail', color: 'var(--fail)' },
  info: { word: 'Reported', color: 'var(--ink-2)' },
} as const

export interface Check { label: string; value: string; limit: string; ok: boolean }

/** Live calculated results + pass/fail against the standard. */
export function ResultPanel({ verdict, headline, headlineUnit, checks, standard, extra, basis }: {
  verdict: Verdict; headline: string; headlineUnit: string; checks: Check[]; standard: string; extra?: { k: string; v: string }[]; basis?: string
}) {
  const v = V[verdict]
  return (
    <div aria-live="polite">
      <div className="flex items-stretch border border-line-strong" style={{ borderColor: 'var(--line-strong)' }}>
        <div className="flex min-w-[124px] flex-col justify-center px-4 py-3 text-white" style={{ background: v.color }}>
          <span className="label !text-white/80">Verdict</span>
          <span className="font-display text-4xl leading-none font-700 uppercase tracking-wide">{v.word}</span>
        </div>
        <div className="flex-1 bg-surface px-4 py-3">
          <p className="label">Result</p>
          <p className="font-display text-4xl leading-none font-600 tabular-nums">{headline}<span className="ml-1.5 text-xl text-ink-2">{headlineUnit}</span></p>
        </div>
      </div>

      <table className="mt-3 w-full border-collapse text-small">
        <caption className="label pb-1 text-left">Checks against {standard}</caption>
        <tbody>
          {checks.map(c => (
            <tr key={c.label} className="border-y border-line">
              <th scope="row" className="py-2 pr-2 text-left font-normal">{c.label}</th>
              <td className="num py-2 pr-3 text-right font-medium">{c.value}</td>
              <td className="num py-2 pr-3 text-right text-ink-2">{c.limit}</td>
              <td className="w-6 py-2 text-right">
                {c.ok ? <Check size={16} aria-label="within limit" style={{ color: 'var(--pass)' }} /> : <X size={16} aria-label="outside limit" style={{ color: 'var(--fail)' }} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {extra && (
        <dl className="mt-3 grid grid-cols-2 gap-px border border-line bg-line">
          {extra.map(e => (
            <div key={e.k} className="bg-surface px-3 py-2"><dt className="label">{e.k}</dt><dd className="num text-small font-medium">{e.v}</dd></div>
          ))}
        </dl>
      )}
      {basis && <p className="mt-3 text-[12px] leading-snug text-ink-2">{basis}</p>}
    </div>
  )
}
