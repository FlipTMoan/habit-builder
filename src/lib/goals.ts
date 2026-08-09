import type { Goal, Habit, LogEntry } from '../types'
import { computeStreak, countCompletedWindows } from './streaks'

export interface GoalProgress {
  current: number
  target: number
  pct: number
  completed: boolean
  kind: 'count' | 'quantity' | 'streak'
}

export function computeGoalProgress(
  goal: Goal,
  habits: Habit[],
  entries: LogEntry[],
  today: number,
): GoalProgress {
  const cutoff = goal.targetDate ? Math.min(today, goal.targetDate) : today
  const linked = habits.filter((h) => goal.linkedHabitIds.includes(h.id))

  let current = 0

  switch (goal.measure) {
    case 'completionCount': {
      for (const habit of linked) {
        const habitEntries = entries.filter((e) => e.habitId === habit.id)
        current += countCompletedWindows(habit, habitEntries, cutoff)
      }
      break
    }
    case 'quantitySum': {
      for (const habit of linked) {
        for (const e of entries) {
          if (e.habitId !== habit.id) continue
          if (e.timestamp > cutoff) continue
          current += e.value ?? 0
        }
      }
      break
    }
    case 'streakLength': {
      for (const habit of linked) {
        const s = computeStreak(habit, entries.filter((e) => e.habitId === habit.id), cutoff)
        current = Math.max(current, s.current)
      }
      break
    }
  }

  const pct = goal.targetValue > 0 ? Math.min(100, (current / goal.targetValue) * 100) : 0
  return {
    current,
    target: goal.targetValue,
    pct,
    completed: current >= goal.targetValue,
    kind: goal.measure === 'quantitySum' ? 'quantity' : goal.measure === 'streakLength' ? 'streak' : 'count',
  }
}