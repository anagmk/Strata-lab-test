import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { allFlags } from '../lib/summary'
import { PageHeader } from '../components/PageHeader'
import { ChartFrame } from '../components/ChartFrame'
import { EmptyState } from '../components/States'
import { Btn } from '../components/ui'

export default function Insights() {
  const nav = useNavigate()
  const { db } = useStore()
  const cp = db.settings.currentProject
  const flags = useMemo(() => allFlags(db).filter(f => cp === 'all' || db.runs.find(r => r.id === f.runId)?.projectId === cp), [db, cp])
  return (
    <div className="mx-auto max-w-[1360px]">
      <PageHeader eyebrow="AI Insights" title="Checks and flags" />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ChartFrame fig="FEED" title={`${flags.length} open flag${flags.length === 1 ? '' : 's'}`} note="Raised automatically from the readings you save. An engineer confirms every flag.">
          {flags.length === 0 ? <EmptyState title="Nothing flagged" body="Flags appear when a saved reading breaks a rule, for example a cube far below its batch mean." /> : (
            <ul className="-my-3 divide-y divide-line">
              {flags.map((f, i) => (
                <li key={i} className="relative py-4 pl-3">
                  <span aria-hidden className="absolute bottom-4 left-0 top-4 w-[3px]" style={{ background: f.severity === 'fail' ? 'var(--accent)' : 'var(--warn)' }} />
                  <p className="num text-[11px] text-ink-2">{f.sampleId} · {f.runId}</p>
                  <p className="font-medium">{f.reason}</p>
                  <p className="text-small text-ink-2">{f.detail}</p>
                  <Btn className="mt-2" onClick={() => nav(`/runs/${f.runId}`)}>Review</Btn>
                </li>
              ))}
            </ul>
          )}
        </ChartFrame>
        <ChartFrame fig="RULES" title="What is checked" note="Rules, not a trained model. Strength prediction and automatic crack detection are planned.">
          <ul className="divide-y divide-line border-y border-line text-small">
            {[
              ['Cube strength', 'A cube more than 15% below the mean of its set; acceptance rule not met.'],
              ['Sieve analysis', 'Any sieve outside the chosen grading zone.'],
              ['Proctor', 'Curve peak outside the tested moisture range; MDD below a design value you entered.'],
              ['Crack width (photo)', 'A measured width above the limit; a photo too coarse to resolve the limit.'],
            ].map(([k, v]) => <li key={k} className="py-2"><span className="block font-medium">{k}</span><span className="text-ink-2">{v}</span></li>)}
          </ul>
        </ChartFrame>
      </div>
    </div>
  )
}
