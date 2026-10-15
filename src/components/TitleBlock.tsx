/** Drawing-style title block: sample ID, date, tested by, standard. */
export function TitleBlock({ items, dense = false }: { items: { k: string; v: string }[]; dense?: boolean }) {
  return (
    <dl
      className="grid grid-cols-2 gap-px border sm:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]"
      style={{ ['--n' as any]: items.length, borderColor: 'var(--line-strong)', background: 'var(--line-strong)' }}
    >
      {items.map(it => (
        <div key={it.k} className={`bg-surface px-3 ${dense ? 'py-1.5' : 'py-2'}`}>
          <dt className="label">{it.k}</dt>
          <dd className="num mt-0.5 text-[13px] font-medium break-words">{it.v}</dd>
        </div>
      ))}
    </dl>
  )
}
