import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { todayISO, daysBetween, fmtDate } from '../lib/format'
import type { Equipment as Eq } from '../lib/db'
import { PageHeader } from '../components/PageHeader'
import { ChartFrame } from '../components/ChartFrame'
import { DataTable, type Column } from '../components/DataTable'
import { Btn, Field, FormCard, TextInput } from '../components/ui'

export default function Equipment() {
  const { db, act } = useStore()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [due, setDue] = useState(todayISO())
  const today = todayISO()
  const cols: Column<Eq>[] = [
    { key: 'id', header: 'Equipment ID', mono: true, nowrap: true, sort: e => e.id, render: e => <span className="font-medium">{e.id}</span> },
    { key: 'name', header: 'Name', sort: e => e.name },
    { key: 'location', header: 'Location', hideBelow: 'md' },
    { key: 'due', header: 'Calibration due', mono: true, nowrap: true, sort: e => e.due, render: e => fmtDate(e.due) },
    { key: 'left', header: 'Days left', mono: true, align: 'right', sort: e => daysBetween(today, e.due), render: e => { const d = daysBetween(today, e.due); return <span style={{ color: d < 0 ? 'var(--fail)' : undefined }}>{d < 0 ? `${-d} overdue` : d}</span> } },
    { key: 'x', header: '', render: e => <button aria-label={`Remove ${e.name}`} className="p-1 text-ink-2 hover:text-fail" onClick={() => { if (window.confirm(`Remove ${e.name}?`)) act.deleteEquipment(e.id) }}><Trash2 size={15} /></button> },
  ]
  return (
    <div className="mx-auto max-w-[1360px]">
      <PageHeader eyebrow="Equipment" title="Equipment & calibration" right={<Btn v="primary" onClick={() => setAdding(a => !a)}><Plus size={15} />Add equipment</Btn>} />
      {adding && (
        <div className="mb-3">
          <FormCard title="Add equipment" submit="Add" disabled={!name.trim()} onSubmit={() => { act.addEquipment({ name, location, due }); setName(''); setLocation(''); setAdding(false) }}>
            <Field label="Name"><TextInput value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Compression testing machine" required /></Field>
            <Field label="Location (optional)"><TextInput value={location} onChange={e => setLocation(e.target.value)} placeholder="Concrete bay" /></Field>
            <Field label="Calibration due"><TextInput type="date" value={due} onChange={e => setDue(e.target.value)} /></Field>
          </FormCard>
        </div>
      )}
      <ChartFrame fig="TABLE" title="Calibration schedule" note="Items due within 45 days show on the Overview.">
        <div className="-m-4">
          <DataTable caption="Equipment" rows={db.equipment} columns={cols} rowKey={e => e.id}
            empty={{ title: 'No equipment yet', body: 'Add the machines and instruments you use, with their next calibration date.' }} />
        </div>
      </ChartFrame>
    </div>
  )
}
