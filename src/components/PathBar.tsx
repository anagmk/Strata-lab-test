import { Link } from 'react-router-dom'
import { ChevronRight, Check } from 'lucide-react'
import { useStore } from '../lib/store'

/** The working path, with live counts. Shows where the user is and what to do next. */
export function PathBar() {
  const { db } = useStore()
  const cp = db.settings.currentProject
  const runs = db.runs.filter(r => cp === 'all' || r.projectId === cp)
  const steps = [
    { n: 1, label: 'Project', to: '/projects', count: db.projects.length },
    { n: 2, label: 'Batch', to: '/projects', count: db.batches.filter(b => cp === 'all' || b.projectId === cp).length },
    { n: 3, label: 'Sample', to: '/samples', count: db.samples.filter(s => cp === 'all' || s.projectId === cp).length },
    { n: 4, label: 'Test', to: '/tests', count: runs.length },
    { n: 5, label: 'Review', to: '/tests', count: runs.filter(r => r.status === 'review' || r.status === 'approved').length },
    { n: 6, label: 'Report', to: '/reports', count: runs.filter(r => r.status === 'approved').length },
  ]
  const next = steps.findIndex(s => s.count === 0)
  const hints = [
    'Create your first project to begin.',
    'Add a batch (a concrete pour, a sand source, a borehole) to the project.',
    'Register a sample from that batch.',
    'Start a test on a sample and enter the readings.',
    'Submit the test; an engineer approves it.',
    'Open the approved test and print the report.',
  ]
  return (
    <section aria-label="Working path" className="border border-line bg-surface">
      <ol className="grid grid-cols-3 sm:grid-cols-6">
        {steps.map((s, i) => {
          const done = s.count > 0
          const isNext = i === next
          return (
            <li key={s.n} className={`border-line ${i > 0 ? 'sm:border-l' : ''} ${i >= 3 ? 'border-t sm:border-t-0' : ''} ${i % 3 > 0 ? 'border-l sm:border-l' : ''}`}>
              <Link to={s.to} className="relative flex items-center gap-2.5 px-3 py-3 hover:bg-surface-2">
                {isNext && <span aria-hidden className="absolute left-0 top-0 h-[3px] w-full bg-accent" />}
                <span className={`num flex h-6 w-6 shrink-0 items-center justify-center border text-[12px] ${done ? 'border-ink bg-ink text-bg' : 'border-line text-ink-2'}`}>
                  {done ? <Check size={13} aria-label="has entries" /> : s.n}
                </span>
                <span className="min-w-0">
                  <span className="block text-small font-medium">{s.label}</span>
                  <span className="num block text-[12px] text-ink-2">{s.count}</span>
                </span>
                {i < 5 && <ChevronRight size={14} aria-hidden className="ml-auto hidden text-ink-2 lg:block" />}
              </Link>
            </li>
          )
        })}
      </ol>
      <p className="border-t border-line px-3 py-2 text-small">
        <span className="label mr-2">{next === -1 ? 'Path complete' : 'Next step'}</span>
        {next === -1 ? 'Every step has at least one entry. Add more samples or tests any time.' : hints[next]}
      </p>
    </section>
  )
}
