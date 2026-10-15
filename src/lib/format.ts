export const f1 = (n: number | null | undefined) => (n != null && Number.isFinite(n) ? n.toFixed(1) : '—')
export const f2 = (n: number | null | undefined) => (n != null && Number.isFinite(n) ? n.toFixed(2) : '—')
export const f3 = (n: number | null | undefined) => (n != null && Number.isFinite(n) ? n.toFixed(3) : '—')

const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** "15 Oct 2026" from an ISO date or datetime */
export function fmtDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : `${String(d.getDate()).padStart(2, '0')} ${M[d.getMonth()]} ${d.getFullYear()}`
}
export function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : `${fmtDate(iso)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const daysBetween = (aISO: string, bISO: string) => Math.round((new Date(bISO).getTime() - new Date(aISO).getTime()) / 86400000)
