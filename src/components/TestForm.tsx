import type { ReactNode } from 'react'

export interface FormCol {
  key: string
  label: string
  unit?: string
  step?: string
  /** editable number input, or computed read-only cell */
  calc?: (row: Record<string, any>, i: number) => ReactNode
}

/** Reading-entry grid: one row per specimen / sieve / compaction point. */
export function TestForm({ columns, rows, onChange, rowHeader, caption, readOnly }: {
  columns: FormCol[]
  rows: Record<string, any>[]
  onChange: (rowIndex: number, key: string, value: number | null) => void
  rowHeader: string
  caption: string
  readOnly?: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-small">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line bg-surface-2">
            <th scope="col" className="label px-3 py-2 text-left">{rowHeader}</th>
            {columns.map(c => (
              <th key={c.key} scope="col" className={`label px-3 py-2 text-right whitespace-nowrap ${c.calc ? 'text-ink' : ''}`}>
                {c.label}{c.unit && <span className="num ml-1 normal-case tracking-normal">[{c.unit}]</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line">
              <th scope="row" className="num px-3 py-1.5 text-left font-medium whitespace-nowrap">{r.label}</th>
              {columns.map(c => (
                <td key={c.key} className={`px-2 py-1 text-right ${c.calc ? 'num bg-surface-2/60 px-3' : ''}`}>
                  {c.calc ? c.calc(r, i) : (
                    <input
                      type="number"
                      inputMode="decimal"
                      step={c.step ?? 'any'}
                      value={r[c.key] != null && Number.isFinite(r[c.key]) ? r[c.key] : ''}
                      aria-label={`${r.label} ${c.label}${c.unit ? ' in ' + c.unit : ''}`}
                      disabled={readOnly}
                      onChange={e => onChange(i, c.key, e.target.value === '' ? null : parseFloat(e.target.value))}
                      className="num w-full min-w-[84px] border border-line bg-surface px-2 py-1 text-right hover:border-ink-2 focus:border-ink disabled:bg-surface-2 disabled:text-ink-2"
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
