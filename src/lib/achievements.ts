import type { Achievement, Goal, Habit, LogEntry } from '../types'
import { computeStreak } from './streaks'

export interface AchievementDef {
  key: string
  name: string
  description: string
  icon: string // emoji marker
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { key: 'first_habit', name: 'First Step', description: 'Create your first habit', icon: '🌱' },
  { key: 'three_habits', name: 'Collector', description: 'Have 3 active habits', icon: '🧺' },
  { key: 'five_habits', name: 'Curator', description: 'Have 5 active habits', icon: '🗂️' },
  { key: 'ten_completions', name: 'Getting Going', description: 'Log 10 completions', icon: '🔟' },
  { key: 'centurion', name: 'Centurion', description: 'Log 100 completions', icon: '💯' },
  { key: 'committed', name: 'Committed', description: 'Reach a 7-day streak', icon: '🔥' },
  { key: 'tenthkept', name: 'Decade', description: 'Reach a 14-day streak', icon: '⚡' },
  { key: 'habitual', name: 'Habitual', description: 'Reach a 30-day streak', icon: '🧘' },
  { key: 'goal_getter', name: 'Goal Getter', description: 'Complete a goal', icon: '🎯' },
  { key: 'goals_three', name: 'Hattrick', description: 'Complete 3 goals', icon: '🏆' },
  { key: 'comeback', name: 'Comeback', description: 'Rebuild a streak to 3 after losing one', icon: '🫂' },
  { key: 'early_bird', name: 'Early Bird', description: 'Complete a habit before 7am', icon: '🌅' },
  { key: 'night_owl', name: 'Night Owl', description: 'Complete a habit after 10pm', icon: '🦉' },
  { key: 'first_goal', name: 'Visionary', description: 'Create your first goal', icon: '🧭' },
]

export interface AchievementContext {
  habits: Habit[]
  goals: Goal[]
  entries: LogEntry[]
  today: number
  freezeLog: number[]
}

export function achievementDef(key: string): AchievementDef | undefined {
  return ACHIEVEMENT_DEFS.find((d) => d.key === key)
}

/** Returns the set of achievement keys whose conditions currently hold. */
export function evaluateAchievements(ctx: AchievementContext): string[] {
  const unlocked: string[] = []
  const { habits, goals, entries, today, freezeLog } = ctx

  const activeHabits = habits.filter((h) => !h.archivedAt)
  const streakVals = activeHabits.map((h) => computeStreak(h, entries.filter((e) => e.habitId === h.id), today, freezeLog))
  const totalCompletions = entries.length

  if (habits.length >= 1) unlocked.push('first_habit')
  if (activeHabits.length >= 3) unlocked.push('three_habits')
  if (activeHabits.length >= 5) unlocked.push('five_habits')
  if (totalCompletions >= 10) unlocked.push('ten_completions')
  if (totalCompletions >= 100) unlocked.push('centurion')
  if (streakVals.some((s) => s.current >= 7)) unlocked.push('committed')
  if (streakVals.some((s) => s.current >= 14)) unlocked.push('tenthkept')
  if (streakVals.some((s) => s.current >= 30)) unlocked.push('habitual')
  if (goals.some((g) => g.completedAt)) unlocked.push('goal_getter')
  if (goals.filter((g) => g.completedAt).length >= 3) unlocked.push('goals_three')
  if (streakVals.some((s) => s.best >= 5 && s.current >= 3 && s.best > s.current)) unlocked.push('comeback')
  if (entries.some((e) => new Date(e.timestamp).getHours() < 7)) unlocked.push('early_bird')
  if (entries.some((e) => new Date(e.timestamp).getHours() >= 22)) unlocked.push('night_owl')
  if (goals.length >= 1) unlocked.push('first_goal')

  return unlocked
}

/** Diff current unlocks against already-persisted ones; returns newly unlocked defs. */
export function newlyUnlocked(
  current: string[],
  existing: Achievement[],
): AchievementDef[] {
  const owned = new Set(existing.map((a) => a.key))
  return current.filter((k) => !owned.has(k)).map((k) => achievementDef(k)!).filter(Boolean)
}