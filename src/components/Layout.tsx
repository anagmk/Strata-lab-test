import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FlaskConical, ClipboardList, FileText, ScanSearch, FolderOpen, Gauge, Settings,
  PanelLeftClose, PanelLeftOpen, Search, Bell, Sun, Moon, CalendarRange, ChevronDown,
} from 'lucide-react'
import { APP_NAME } from '../lib/config'
import { useStore } from '../lib/store'
import { allFlags } from '../lib/summary'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderOpen },
  { to: '/samples', label: 'Samples', icon: FlaskConical },
  { to: '/tests', label: 'Tests', icon: ClipboardList },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/ai', label: 'AI Insights', icon: ScanSearch },
  { to: '/equipment', label: 'Equipment & Calibration', icon: Gauge },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function Logo({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <rect width="26" height="26" fill="var(--ink)" />
        <path d="M5 9h16M5 13h16" stroke="var(--surface)" strokeWidth="1.5" />
        <path d="M5 17h8" stroke="var(--accent)" strokeWidth="3" />
      </svg>
      {!small && <span className="font-display text-xl font-700 uppercase tracking-wide leading-none">{APP_NAME}</span>}
    </div>
  )
}

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return (localStorage.getItem('theme') as 'light' | 'dark') || 'light' } catch { return 'light' }
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('theme', theme) } catch { /* storage unavailable */ }
  }, [theme])
  return [theme, () => setTheme(t => (t === 'light' ? 'dark' : 'light'))] as const
}

function Topbar({ theme, toggle }: { theme: string; toggle: () => void }) {
  const nav = useNavigate()
  const { db, act } = useStore()
  const [q, setQ] = useState('')
  const [bell, setBell] = useState(false)
  const [user, setUser] = useState(false)
  const flags = useMemo(() => allFlags(db), [db])
  const s = db.settings
  const initials = s.user.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U'
  const field = 'border border-line bg-surface px-2.5 py-1.5 text-small hover:border-ink-2'
  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface px-4">
      <div className="md:hidden"><Logo small /></div>
      <form role="search" className="relative min-w-0 flex-1 md:max-w-md" onSubmit={e => { e.preventDefault(); nav(`/samples?q=${encodeURIComponent(q)}`) }}>
        <Search size={15} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-2" />
        <input value={q} onChange={e => setQ(e.target.value)} aria-label="Search by sample ID, test or project" placeholder="Search sample ID, test, project"
          className="num w-full border border-line bg-bg py-1.5 pl-8 pr-2 text-[13px] placeholder:text-ink-2 focus:border-ink" />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <label className="hidden items-center gap-1.5 lg:flex">
          <span className="label">Project</span>
          <span className="relative">
            <select aria-label="Project" className={`${field} max-w-[200px] appearance-none pr-7`} value={s.currentProject} onChange={e => act.setSettings({ currentProject: e.target.value })}>
              <option value="all">All projects</option>
              {db.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-2" />
          </span>
        </label>
        <label className="hidden items-center gap-1.5 xl:flex">
          <CalendarRange size={15} aria-hidden className="text-ink-2" />
          <select aria-label="Date range" className={field} value={s.range} onChange={e => act.setSettings({ range: e.target.value as typeof s.range })}>
            <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option>
          </select>
        </label>

        <button onClick={toggle} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} className="border border-line p-1.5 hover:bg-surface-2">
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <div className="relative">
          <button onClick={() => { setBell(b => !b); setUser(false) }} aria-label={`Notifications, ${flags.length} open flags`} aria-expanded={bell} className="relative border border-line p-1.5 hover:bg-surface-2">
            <Bell size={16} />
            {flags.length > 0 && <span className="num absolute -right-1 -top-1 bg-accent px-1 text-[10px] leading-4 text-accent-ink">{flags.length}</span>}
          </button>
          {bell && (
            <div className="absolute right-0 top-full z-30 mt-1 w-80 border bg-surface" style={{ borderColor: 'var(--line-strong)' }}>
              <p className="label border-b border-line px-3 py-2">Open flags</p>
              {flags.length === 0 && <p className="px-3 py-3 text-small text-ink-2">Nothing flagged. Flags appear when saved readings break a rule.</p>}
              {flags.slice(0, 5).map((f, i) => (
                <button key={i} onClick={() => { setBell(false); nav(`/runs/${f.runId}`) }} className="block w-full border-b border-line px-3 py-2 text-left last:border-0 hover:bg-surface-2">
                  <span className="num text-[11px] text-ink-2">{f.sampleId} · {f.runId}</span>
                  <span className="block text-small">{f.reason}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => { setUser(u => !u); setBell(false) }} aria-label="User menu" aria-expanded={user} className="flex items-center gap-2 border border-line py-1 pl-1 pr-2 hover:bg-surface-2">
            <span className="num flex h-6 w-6 items-center justify-center bg-ink text-[11px] text-bg">{initials}</span>
            <span className="hidden text-small sm:inline">{s.user}</span>
          </button>
          {user && (
            <div className="absolute right-0 top-full z-30 mt-1 w-60 border bg-surface" style={{ borderColor: 'var(--line-strong)' }}>
              <p className="border-b border-line px-3 py-2"><span className="block text-small font-medium">{s.user}</span><span className="text-[12px] text-ink-2">Working as</span></p>
              <div className="p-2" role="radiogroup" aria-label="Role">
                {(['technician', 'engineer'] as const).map(r => (
                  <button key={r} role="radio" aria-checked={s.role === r} onClick={() => { act.setRole(r); setUser(false) }}
                    className={`mb-1 flex w-full items-center justify-between border px-2.5 py-1.5 text-small last:mb-0 ${s.role === r ? 'border-ink bg-ink text-bg' : 'border-line hover:bg-surface-2'}`}>
                    <span className="capitalize">{r}</span>
                    <span className="text-[11px] opacity-75">{r === 'technician' ? 'enters readings' : 'approves tests'}</span>
                  </button>
                ))}
              </div>
              <p className="border-t border-line px-3 py-2 text-[12px] text-ink-2">No sign-in in this prototype. Switch role to try both sides of the review step.</p>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [theme, toggle] = useTheme()
  const mobile = [NAV[0], NAV[1], NAV[2], NAV[3], NAV[4]]

  return (
    <div className="min-h-screen">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface md:flex" style={{ width: collapsed ? 56 : 240 }} aria-label="Primary">
        <div className={`flex h-14 items-center border-b border-line ${collapsed ? 'justify-center' : 'px-4'}`}><Logo small={collapsed} /></div>
        <nav className="flex-1 py-2">
          <ul>
            {NAV.map(n => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end} title={collapsed ? n.label : undefined}
                  className={({ isActive }) => `relative flex items-center gap-3 py-2.5 text-small ${collapsed ? 'justify-center' : 'px-4'} ${isActive ? 'bg-surface-2 font-medium' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`}>
                  {({ isActive }) => (
                    <>
                      {isActive && <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] bg-accent" />}
                      <n.icon size={17} aria-hidden />
                      {!collapsed ? <span>{n.label}</span> : <span className="sr-only">{n.label}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <button onClick={() => setCollapsed(c => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex items-center gap-3 border-t border-line py-3 text-small text-ink-2 hover:bg-surface-2 hover:text-ink ${collapsed ? 'justify-center' : 'px-4'}`}>
          {collapsed ? <PanelLeftOpen size={17} /> : <><PanelLeftClose size={17} /><span>Collapse</span></>}
        </button>
      </aside>

      <div className="transition-[padding] duration-150 md:pl-[var(--sb)]" style={{ ['--sb' as any]: collapsed ? '56px' : '240px' }}>
        <Topbar theme={theme} toggle={toggle} />
        <main className="paper paper-major min-h-[calc(100vh-56px)] px-4 pb-24 pt-6 md:px-6 md:pb-10 print-root">
          <Outlet />
        </main>
      </div>

      <nav aria-label="Primary mobile" className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface md:hidden">
        {mobile.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `relative flex flex-col items-center gap-0.5 py-2 text-[10px] ${isActive ? 'font-medium text-ink' : 'text-ink-2'}`}>
            {({ isActive }) => (<>{isActive && <span aria-hidden className="absolute left-0 top-0 h-[3px] w-full bg-accent" />}<n.icon size={18} aria-hidden /><span>{n.label.split(' ')[0]}</span></>)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
