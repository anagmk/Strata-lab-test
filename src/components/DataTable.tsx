import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { SkeletonRows, EmptyState, ErrorState } from './States'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  sort?: (row: T) => string | number
  mono?: boolean
  align?: 'left' | 'right'
  width?: string
  hideBelow?: 'md' | 'lg' | '2xl'
  nowrap?: boolean
}

interface Props<T> {
  rows: T[] | null
  columns: Column<T>[]
  rowKey: (r: T) => string
  onRowClick?: (r: T) => void
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  empty?: { title: string; body?: string }
  maxHeight?: string
  caption: string
}

export function DataTable<T>({ rows, columns, rowKey, onRowClick, loading, error, onRetry, empty, maxHeight = '420px', caption }: Props<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)

  const sorted = useMemo(() => {
    if (!rows) return []
    if (!sort) return rows
    const col = columns.find(c => c.key === sort.key)
    if (!col?.sort) return rows
    return [...rows].sort((a, b) => {
      const x = col.sort!(a), y = col.sort!(b)
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir
    })
  }, [rows, sort, columns])

  if (error) return <ErrorState body={error} onRetry={onRetry} />
  if (loading) return <SkeletonRows rows={6} cols={Math.min(columns.length, 6)} />
  if (!rows?.length) return <EmptyState title={empty?.title ?? 'Nothing here yet'} body={empty?.body} />

  const hide = (h?: string) => (h === 'md' ? 'hidden md:table-cell' : h === 'lg' ? 'hidden lg:table-cell' : h === '2xl' ? 'hidden 2xl:table-cell' : '')

  return (
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className="w-full border-collapse text-left text-small">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 z-10 bg-surface-2">
          <tr className="border-b border-line">
            {columns.map(c => {
              const active = sort?.key === c.key
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort!.dir === 1 ? 'ascending' : 'descending') : undefined}
                  className={`label whitespace-nowrap px-3 py-2 ${c.align === 'right' ? 'text-right' : ''} ${hide(c.hideBelow)}`}
                  style={{ width: c.width }}
                >
                  {c.sort ? (
                    <button
                      className={`inline-flex items-center gap-1 uppercase tracking-[0.08em] hover:text-ink ${c.align === 'right' ? 'flex-row-reverse' : ''}`}
                      onClick={() => setSort(s => (s?.key === c.key ? (s.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 }))}
                    >
                      {c.header}
                      {active ? (sort!.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ChevronsUpDown size={12} className="opacity-50" />}
                    </button>
                  ) : c.header}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr
              key={rowKey(r)}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(r) } } : undefined}
              className={`border-b border-line hover:bg-surface-2 ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map(c => (
                <td key={c.key} className={`px-3 py-2 align-middle ${c.mono ? 'num' : ''} ${c.nowrap ? 'whitespace-nowrap' : ''} ${c.align === 'right' ? 'text-right' : ''} ${hide(c.hideBelow)}`}>
                  {c.render ? c.render(r) : String((r as any)[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
