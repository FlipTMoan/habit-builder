export const DAY_MS = 86_400_000

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function daysSinceEpoch(ts: number): number {
  return Math.floor(startOfDay(ts) / DAY_MS)
}

export function startOfWeek(ts: number, weekStartsOn = 1): number {
  // Monday = 1, Sunday = 0
  const d = new Date(startOfDay(ts))
  let day = d.getDay() // 0=Sun..6=Sat
  const diff = (day - weekStartsOn + 7) % 7
  d.setDate(d.getDate() - diff)
  return d.getTime()
}

export function startOfMonth(ts: number): number {
  const d = new Date(startOfDay(ts))
  d.setDate(1)
  return d.getTime()
}

export function addDays(ts: number, days: number): number {
  const d = new Date(startOfDay(ts))
  d.setDate(d.getDate() + days)
  return d.getTime()
}

/** All day-starts in the calendar period that contains ts (excluding ts itself). */
export function periodDays(ts: number, kind: 'daily' | 'weekly' | 'monthly'): number[] {
  const ms = startOfDay(ts)
  if (kind === 'daily') return []
  if (kind === 'weekly') {
    const s = startOfWeek(ms)
    return Array.from({ length: 7 }, (_, i) => addDays(s, i))
  }
  // monthly
  const s = startOfMonth(ms)
  const daysInMonth = new Date(new Date(s).getFullYear(), new Date(s).getMonth() + 1, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => addDays(s, i))
}

export function dayKey(ts: number): string {
  const d = new Date(startOfDay(ts))
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const dd = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dd}`
}

export function titleCase(s: string): string {
  return s
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}