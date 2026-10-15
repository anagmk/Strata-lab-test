import { useRef, useState } from 'react'
import { Download, Upload, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { PageHeader } from '../components/PageHeader'
import { ChartFrame } from '../components/ChartFrame'
import { Btn, Field, Select, TextInput } from '../components/ui'
import { todayISO } from '../lib/format'

export default function Settings() {
  const { db, act } = useStore()
  const s = db.settings
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const download = () => {
    const blob = new Blob([act.exportJSON()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `strata-lab-${todayISO()}.json`; a.click()
    URL.revokeObjectURL(a.href)
  }
  const upload = async (f?: File) => {
    if (!f) return
    const err = act.importJSON(await f.text())
    setMsg(err ? { ok: false, text: err } : { ok: true, text: `Imported ${f.name}.` })
    if (file.current) file.current.value = ''
  }
  const counts = `${db.projects.length} projects, ${db.batches.length} batches, ${db.samples.length} samples, ${db.runs.length} tests`

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader eyebrow="Settings" title="Settings" />
      <div className="grid gap-3">
        <ChartFrame fig="LAB" title="Laboratory and user" note="Shown on reports and in the activity log.">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Laboratory name"><TextInput value={s.labName} onChange={e => act.setSettings({ labName: e.target.value })} /></Field>
            <Field label="Your name"><TextInput value={s.user} onChange={e => act.setSettings({ user: e.target.value })} /></Field>
            <Field label="Working as" hint="Engineers approve tests."><Select value={s.role} onChange={e => act.setRole(e.target.value as 'technician' | 'engineer')}><option value="technician">Technician</option><option value="engineer">Engineer</option></Select></Field>
          </div>
        </ChartFrame>
        <ChartFrame fig="DATA" title="Your data" note="Stored only in this browser (localStorage). Nothing is sent anywhere.">
          <p className="num mb-3 text-small">{counts}</p>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={download}><Download size={15} />Export as JSON</Btn>
            <Btn onClick={() => file.current?.click()}><Upload size={15} />Import JSON</Btn>
            <input ref={file} type="file" accept="application/json,.json" className="sr-only" aria-label="Import JSON file" onChange={e => upload(e.target.files?.[0])} />
            <Btn v="danger" className="ml-auto" onClick={() => { if (window.confirm('Delete ALL projects, samples, tests and equipment from this browser? Export first if you want a backup.')) { act.clearAll(); setMsg({ ok: true, text: 'All data cleared.' }) } }}><Trash2 size={15} />Clear all data</Btn>
          </div>
          {msg && <p role="status" className="mt-3 text-small" style={{ color: msg.ok ? 'var(--pass)' : 'var(--fail)' }}>{msg.text}</p>}
          <p className="mt-3 text-[12px] text-ink-2">Clearing browser data or using a private window also removes it. Export now and then as a backup.</p>
        </ChartFrame>
      </div>
    </div>
  )
}
