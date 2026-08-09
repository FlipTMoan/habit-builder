import { describe, expect, it } from 'vitest'
import type { Habit, LogEntry } from '../types'
import { computeStreak, countCompletedWindows, windowForDay } from './streaks'

function d(y: number, m: number, day: number, h = 12): number {
  return new Date(y, m - 1, day, h).getTime()
}

function makeHabit(overrides: Partial<Habit>): Habit {
  return {
    id: 'h',
    name: 'Test habit',
    categoryId: null,
    type: 'binary',
    frequency: { kind: 'daily' },
    appLinks: [],
    notification: { enabled: false, times: [] },
    createdAt: d(2026, 1, 1),
    ...overrides,
  }
}

function entry(day: number, value?: number): LogEntry {
  return { id: crypto.randomUUID(), habitId: 'h', timestamp: day, value }
}

describe('daily binary habits', () => {
  const habit = makeHabit({})

  it('counts consecutive completed days as a streak', () => {
    const today = d(2026, 1, 4)
    const entries = [entry(d(2026, 1, 2)), entry(d(2026, 1, 3)), entry(d(2026, 1, 4))]
    const s = computeStreak(habit, entries, today)
    expect(s.current).toBe(3)
    expect(s.best).toBe(3)
  })

  it('keeps the streak while today is still open and undone', () => {
    const today = d(2026, 1, 3)
    const entries = [entry(d(2026, 1, 1)), entry(d(2026, 1, 2))]
    const s = computeStreak(habit, entries, today)
    expect(s.current).toBe(2)
  })

  it('resets the streak when a scheduled day was missed', () => {
    const today = d(2026, 1, 6)
    const entries = [entry(d(2026, 1, 2)), entry(d(2026, 1, 3)), entry(d(2026, 1, 4))]
    const s = computeStreak(habit, entries, today)
    expect(s.current).toBe(0)
  })

  it('computes best independent of current gaps', () => {
    const today = d(2026, 1, 9)
    const entries = [
      entry(d(2026, 1, 1)),
      entry(d(2026, 1, 2)),
      entry(d(2026, 1, 3)),
      entry(d(2026, 1, 7)),
      entry(d(2026, 1, 8)),
      entry(d(2026, 1, 9)),
    ]
    const s = computeStreak(habit, entries, today)
    expect(s.current).toBe(3)
    expect(s.best).toBe(3)
  })
})

describe('quantified habits', () => {
  const habit = makeHabit({
    type: 'quantified',
    target: { value: 5, unit: 'cups' },
  })

  it('counts a day only when the target is reached', () => {
    const today = d(2026, 1, 4)
    const entries = [
      entry(d(2026, 1, 2), 5),
      entry(d(2026, 1, 3), 3),
      entry(d(2026, 1, 3), 2),
      entry(d(2026, 1, 4), 6),
    ]
    const s = computeStreak(habit, entries, today)
    expect(s.current).toBe(3)
  })

  it('does not credit a partial day as completed', () => {
    const today = d(2026, 1, 3)
    const entries = [entry(d(2026, 1, 2), 5), entry(d(2026, 1, 3), 4)]
    const s = computeStreak(habit, entries, today)
    expect(s.current).toBe(1) // day 3 is open (4 < 5), day 2 completed
  })
})

describe('weekly habits', () => {
  const habit = makeHabit({ frequency: { kind: 'weekly' } })

  it('counts one completion per week as a weekly streak', () => {
    const today = d(2026, 1, 19) // a Monday
    const entries = [entry(d(2026, 1, 5)), entry(d(2026, 1, 12))]
    const s = computeStreak(habit, entries, today)
    expect(s.current).toBe(2)
  })

  it('resets after a missed week', () => {
    const today = d(2026, 1, 26)
    const entries = [entry(d(2026, 1, 5)), entry(d(2026, 1, 12))]
    const s = computeStreak(habit, entries, today)
    expect(s.current).toBe(0)
  })
})

describe('custom day-of-week habits', () => {
  const habit = makeHabit({ frequency: { kind: 'custom', daysOfWeek: [1, 3, 5] } }) // Mon/Wed/Fri

  it('counts only scheduled days and skips gaps between them', () => {
    const createdAtThursday = d(2026, 1, 8) // Thu Jan 8
    const h = makeHabit({ frequency: { kind: 'custom', daysOfWeek: [1, 3, 5] }, createdAt: createdAtThursday })
    const today = d(2026, 1, 25)
    const entries = [
      entry(d(2026, 1, 9)), // Fri
      entry(d(2026, 1, 12)), // Mon
      entry(d(2026, 1, 14)), // Wed
      entry(d(2026, 1, 16)), // Fri
      entry(d(2026, 1, 21)), // Wed
    ]
    const s = computeStreak(h, entries, today)
    expect(s.current).toBe(0) // Fri Jan 23 missed resets streak
    expect(s.best).toBe(4) // Fri 9, Mon 12, Wed 14, Fri 16
  })

  it('does not mark unscheduled days as due', () => {
    expect(windowForDay(d(2026, 1, 10, 8), habit.frequency, habit.createdAt)).toBeNull() // Sat
    expect(windowForDay(d(2026, 1, 9, 8), habit.frequency, habit.createdAt)).not.toBeNull() // Fri
  })
})

describe('interval habits', () => {
  it('schedules every N days from creation', () => {
    const created = d(2026, 1, 1) // Thu
    const habit = makeHabit({ frequency: { kind: 'custom', intervalDays: 3 }, createdAt: created })
    const today = d(2026, 1, 8)
    const entries = [entry(d(2026, 1, 1)), entry(d(2026, 1, 4)), entry(d(2026, 1, 7))]
    const s = computeStreak(habit, entries, today)
    expect(s.current).toBe(3)
  })
})

describe('countCompletedWindows', () => {
  it('counts completed windows up to a cutoff', () => {
    const habit = makeHabit({})
    const cutoff = d(2026, 1, 5)
    const entries = [entry(d(2026, 1, 1)), entry(d(2026, 1, 3)), entry(d(2026, 1, 6))]
    expect(countCompletedWindows(habit, entries, cutoff)).toBe(2)
  })
})