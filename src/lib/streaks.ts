import type { Frequency, Habit, LogEntry } from '../types'
import { startOfDay, startOfWeek, startOfMonth, addDays, daysSinceEpoch } from './dates'

/** Number of freezes used in a given month (month is 0-indexed). */
export function freezesUsedInMonth(freezeLog: number[], year: number, month: number): number {
  return freezeLog.filter((ts) => {
    const d = new Date(ts)
    return d.getFullYear() === year && d.getMonth() === month
  }).length
}

/** Check if a given day-start has a freeze applied. */
export function isDayFrozen(freezeLog: number[], dayStart: number): boolean {
  return freezeLog.includes(dayStart)
}

export interface Window {
  start: number
  end: number // exclusive
}

export function daysInMonth(ts: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

/** Returns the schedule window containing `ts`, or null if `ts` is not a scheduled day. */
export function windowForDay(ts: number, frequency: Frequency, createdAt: number): Window | null {
  const dayStart = startOfDay(ts)
  switch (frequency.kind) {
    case 'daily':
      return { start: dayStart, end: addDays(dayStart, 1) }
    case 'weekly': {
      const s = startOfWeek(dayStart)
      return { start: s, end: addDays(s, 7) }
    }
    case 'monthly': {
      const s = startOfMonth(dayStart)
      return { start: s, end: addDays(s, daysInMonth(dayStart)) }
    }
    case 'custom': {
      if (frequency.timesPerPeriod && frequency.timesPerPeriod > 0) {
        // N times per week: use the weekly window
        const s = startOfWeek(dayStart)
        return { start: s, end: addDays(s, 7) }
      }
      if (frequency.daysOfWeek && frequency.daysOfWeek.length > 0) {
        if (!frequency.daysOfWeek.includes(new Date(dayStart).getDay())) return null
        return { start: dayStart, end: addDays(dayStart, 1) }
      }
      if (frequency.intervalDays && frequency.intervalDays > 0) {
        if (daysSinceEpoch(dayStart) % frequency.intervalDays !== daysSinceEpoch(startOfDay(createdAt)) % frequency.intervalDays) return null
        return { start: dayStart, end: addDays(dayStart, 1) }
      }
      return { start: dayStart, end: addDays(dayStart, 1) }
    }
  }
}

export function isScheduledDay(ts: number, frequency: Frequency, createdAt: number): boolean {
  // weekly & monthly habits are considered "due once per X" - they show as due
  // every day until completed within the current window.
  const w = windowForDay(ts, frequency, createdAt)
  return w !== null
}

function dayBefore(startTs: number): number {
  return addDays(startTs, -1)
}

export function previousScheduledDay(startTs: number, frequency: Frequency): number | null {
  const dayStart = startOfDay(startTs)
  if (frequency.kind === 'custom' && frequency.daysOfWeek && frequency.daysOfWeek.length > 0) {
    for (let i = 1; i <= 7; i++) {
      const candidate = addDays(dayStart, -i)
      if (frequency.daysOfWeek.includes(new Date(candidate).getDay())) return candidate
    }
    return null
  }
  if (frequency.kind === 'custom' && frequency.intervalDays && frequency.intervalDays > 0) {
    return addDays(dayStart, -frequency.intervalDays)
  }
  return dayBefore(dayStart)
}

function nextScheduledDay(startTs: number, frequency: Frequency): number | null {
  const dayStart = startOfDay(startTs)
  if (frequency.kind === 'custom' && frequency.daysOfWeek && frequency.daysOfWeek.length > 0) {
    for (let i = 1; i <= 7; i++) {
      const candidate = addDays(dayStart, i)
      if (frequency.daysOfWeek.includes(new Date(candidate).getDay())) return candidate
    }
    return null
  }
  if (frequency.kind === 'custom' && frequency.intervalDays && frequency.intervalDays > 0) {
    return addDays(dayStart, frequency.intervalDays)
  }
  if (frequency.kind === 'monthly') {
    const d = new Date(startOfDay(startTs))
    d.setMonth(d.getMonth() + 1)
    return startOfMonth(d.getTime())
  }
  if (frequency.kind === 'weekly') return addDays(dayStart, 7)
  return addDays(dayStart, 1)
}

interface DayTotals {
  count: number
  value: number
  hours: number[]
}

export function buildDayTotals(entries: LogEntry[]): Map<number, DayTotals> {
  const map = new Map<number, DayTotals>()
  for (const e of entries) {
    const key = startOfDay(e.timestamp)
    const cur = map.get(key) ?? { count: 0, value: 0, hours: [] as number[] }
    cur.count += 1
    cur.value += e.value ?? 0
    cur.hours.push(new Date(e.timestamp).getHours())
    map.set(key, cur)
  }
  return map
}

function totalInWindow(win: Window, totals: Map<number, DayTotals>): { count: number; value: number } {
  let count = 0
  let value = 0
  let ts = win.start
  while (ts < win.end) {
    const t = totals.get(ts)
    if (t) {
      count += t.count
      value += t.value
    }
    ts = addDays(ts, 1)
  }
  return { count, value }
}

export function windowCompleted(
  win: Window,
  habit: Habit,
  totals: Map<number, DayTotals>,
): boolean {
  const freq = habit.frequency
  if (freq.kind === 'custom' && freq.timesPerPeriod && freq.timesPerPeriod > 0) {
    if (habit.type === 'quantified' && habit.target) {
      // Count distinct days where target was met
      let distinctDays = 0
      let ts = win.start
      while (ts < win.end) {
        const t = totals.get(ts)
        if (t && t.value >= (habit.target?.value ?? 1)) distinctDays += 1
        ts = addDays(ts, 1)
      }
      return distinctDays >= freq.timesPerPeriod
    }
    // Binary: count completions across the week
    const { count } = totalInWindow(win, totals)
    return count >= freq.timesPerPeriod
  }
  const { count, value } = totalInWindow(win, totals)
  if (habit.type === 'quantified' && habit.target) {
    return value >= habit.target.value
  }
  return count > 0
}

export interface StreakResult {
  current: number
  best: number
  totalCompletions: number
  totalValue: number
}

export function computeStreak(habit: Habit, entries: LogEntry[], today: number, freezeLog: number[] = []): StreakResult {
  const totals = buildDayTotals(entries)
  const createdAt = habit.createdAt

  const completed = (win: Window) => windowCompleted(win, habit, totals)

  // --- Best: walk forward from first scheduled window through today ---
  let best = 0
  let consecutive = 0
  let fwd = windowForDay(createdAt, habit.frequency, createdAt)
  // If createdAt itself isn't a scheduled day, find the next scheduled day after it
  if (!fwd) {
    const firstScheduled = nextScheduledDay(createdAt, habit.frequency)
    if (firstScheduled != null) {
      fwd = windowForDay(firstScheduled, habit.frequency, createdAt)
    }
  }
  const todayWin = windowForDay(today, habit.frequency, createdAt)
  const todayStart = todayWin ? todayWin.start : today

  const seenFwd = new Set<number>()
  while (fwd) {
    const key = fwd.start
    if (seenFwd.has(key)) break
    seenFwd.add(key)
    if (completed(fwd)) {
      consecutive += 1
      best = Math.max(best, consecutive)
    } else if (isDayFrozen(freezeLog, key)) {
      consecutive += 1
      best = Math.max(best, consecutive)
    } else {
      consecutive = 0
    }
    if (key >= todayStart) break
    const nextStart = nextScheduledDay(key, habit.frequency)
    if (nextStart == null) break
    const next = windowForDay(nextStart, habit.frequency, createdAt)
    if (!next) break
    fwd = next
  }

  // --- Current: walk backward from today's window ---
  let current = 0
  let curWin = todayWin
  if (!curWin) {
    // today isn't scheduled (e.g. Mon/Wed/Fri habit on a Sunday): start from the
    // most recent scheduled day.
    for (let i = 1; i <= 60; i++) {
      const candidate = windowForDay(addDays(today, -i), habit.frequency, createdAt)
      if (candidate) {
        curWin = candidate
        break
      }
    }
  }
  const seenBack = new Set<number>()
  while (curWin && curWin.end > createdAt) {
    const key = curWin.start
    if (seenBack.has(key)) break
    seenBack.add(key)
    if (completed(curWin)) {
      current += 1
    } else if (isDayFrozen(freezeLog, key)) {
      // Frozen day counts toward the streak
      current += 1
    } else if (curWin.end <= today) {
      // A scheduled window that already passed without being completed resets the streak.
      break
    }
    const prevStart = previousScheduledDay(key, habit.frequency)
    if (prevStart == null || prevStart < startOfDay(createdAt)) break
    const prev = windowForDay(prevStart, habit.frequency, createdAt)
    if (!prev) break
    curWin = prev
  }

  let totalCompletions = 0
  let totalValue = 0
  for (const t of totals.values()) {
    totalCompletions += t.count
    totalValue += t.value
  }

  return { current, best, totalCompletions, totalValue }
}

/**
 * Number of scheduled windows between createdAt and `today` (inclusive) that have
 * already passed or are currently open. Used for completion-rate calculations.
 */
export function scheduledWindowCount(habit: Habit, today: number): number {
  const window = windowForDay(today, habit.frequency, habit.createdAt)
  const todayStart = window ? window.start : today
  let count = 0
  let fwd = windowForDay(habit.createdAt, habit.frequency, habit.createdAt)
  const seen = new Set<number>()
  while (fwd) {
    const key = fwd.start
    if (seen.has(key)) break
    seen.add(key)
    count += 1
    if (key >= todayStart) break
    const nextStart = nextScheduledDay(key, habit.frequency)
    if (nextStart == null) break
    const next = windowForDay(nextStart, habit.frequency, habit.createdAt)
    if (!next) break
    fwd = next
  }
  return count
}

export function countCompletedWindows(habit: Habit, entries: LogEntry[], cutoff: number): number {
  const totals = buildDayTotals(entries)
  const endWin = windowForDay(cutoff, habit.frequency, habit.createdAt)
  const endKey = endWin ? endWin.start : cutoff
  let count = 0
  let fwd = windowForDay(habit.createdAt, habit.frequency, habit.createdAt)
  const seen = new Set<number>()
  while (fwd) {
    const key = fwd.start
    if (seen.has(key)) break
    seen.add(key)
    if (windowCompleted(fwd, habit, totals)) count += 1
    if (key >= endKey) break
    const nextStart = nextScheduledDay(key, habit.frequency)
    if (nextStart == null) break
    const next = windowForDay(nextStart, habit.frequency, habit.createdAt)
    if (!next) break
    fwd = next
  }
  return count
}

export function describeFrequency(frequency: Frequency): string {
  switch (frequency.kind) {
    case 'daily':
      return 'Daily'
    case 'weekly':
      return 'Weekly'
    case 'monthly':
      return 'Monthly'
    case 'custom': {
      if (frequency.timesPerPeriod && frequency.timesPerPeriod > 0) {
        return `${frequency.timesPerPeriod}× per week`
      }
      if (frequency.daysOfWeek && frequency.daysOfWeek.length > 0) {
        const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        return frequency.daysOfWeek.map((d) => names[d]).join(', ')
      }
      if (frequency.intervalDays && frequency.intervalDays > 0) {
        return `Every ${frequency.intervalDays} days`
      }
      return 'Custom'
    }
  }
}