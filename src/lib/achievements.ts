import type { Achievement, Goal, Habit, LogEntry } from '../types'
import { computeStreak, countCompletedWindows } from './streaks'

export interface AchievementDef {
  key: string
  name: string
  description: string
  icon: string // emoji marker
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { key: 'first_habit', name: 'First Step', description: 'Create your first habit', icon: '🌱' },
  { key: 'three_habits', name: 'Collector', description: 'Have 3 habits with ≥7 completions each', icon: '🧺' },
  { key: 'five_habits', name: 'Curator', description: 'Have 5 habits with ≥7 completions each', icon: '🗂️' },
  { key: 'ten_completions', name: 'Getting Going', description: 'Complete 10 scheduled windows', icon: '🔟' },
  { key: 'centurion', name: 'Centurion', description: 'Complete 100 scheduled windows', icon: '💯' },
  { key: 'committed', name: 'Committed', description: 'Reach a 7-day streak', icon: '🔥' },
  { key: 'tenthkept', name: 'Two Weeks Strong', description: 'Reach a 14-day streak', icon: '⚡' },
  { key: 'habitual', name: 'Habitual', description: 'Reach a 30-day streak', icon: '🧘' },
  { key: 'streak_50', name: 'Iron Will', description: 'Reach a 50-day streak', icon: '⚙️' },
  { key: 'streak_100', name: 'Centurion Streak', description: 'Reach a 100-day streak', icon: '💎' },
  { key: 'streak_365', name: 'Legendary', description: 'Reach a 365-day streak', icon: '👑' },
  { key: 'goal_getter', name: 'Goal Getter', description: 'Complete a goal', icon: '🎯' },
  { key: 'goals_three', name: 'Hattrick', description: 'Complete 3 goals', icon: '🏆' },
  { key: 'comeback', name: 'Comeback', description: 'Rebuild a streak to 3 after losing one', icon: '🫂' },
  { key: 'early_bird', name: 'Early Bird', description: 'Log a habit before 7am', icon: '🌅' },
  { key: 'night_owl', name: 'Night Owl', description: 'Log a habit after 10pm', icon: '🦉' },
  { key: 'first_goal', name: 'Visionary', description: 'Create your first goal', icon: '🧭' },
  { key: 'streak_21', name: 'Unstoppable', description: 'Reach a 21-day streak', icon: '🚀' },
  { key: 'consistent_week', name: 'Perfect Week', description: 'Complete every scheduled window for 7 days in a row', icon: '📅' },
  { key: 'consistent_month', name: 'Perfect Month', description: 'Complete every scheduled window for 30 days in a row', icon: '🗓️' },
]

export interface AchievementContext {
  habits: Habit[]
  goals: Goal[]
  entries: LogEntry[]
  today: number
}

export function achievementDef(key: string): AchievementDef | undefined {
  return ACHIEVEMENT_DEFS.find((d) => d.key === key)
}

/** Returns the set of achievement keys whose conditions currently hold. */
export function evaluateAchievements(ctx: AchievementContext): string[] {
  const unlocked: string[] = []
  const { habits, goals, entries, today } = ctx

  const activeHabits = habits.filter((h) => !h.archivedAt)
  const streakVals = activeHabits.map((h) => {
    const hEntries = entries.filter((e) => e.habitId === h.id)
    return { habit: h, streak: computeStreak(h, hEntries, today, h.freezeLog ?? []), windows: countCompletedWindows(h, hEntries, today) }
  })

  // Collector: 3 habits with ≥7 completions each
  const qualifyingHabits = streakVals.filter((sv) => sv.windows >= 7)
  if (habits.length >= 1) unlocked.push('first_habit')
  if (qualifyingHabits.length >= 3) unlocked.push('three_habits')
  if (qualifyingHabits.length >= 5) unlocked.push('five_habits')

  // Centurion: count completed windows across all habits, not raw entries
  const totalWindows = streakVals.reduce((s, sv) => s + sv.windows, 0)
  if (totalWindows >= 10) unlocked.push('ten_completions')
  if (totalWindows >= 100) unlocked.push('centurion')

  // Streaks
  if (streakVals.some((sv) => sv.streak.current >= 7)) unlocked.push('committed')
  if (streakVals.some((sv) => sv.streak.current >= 14)) unlocked.push('tenthkept')
  if (streakVals.some((sv) => sv.streak.current >= 21)) unlocked.push('streak_21')
  if (streakVals.some((sv) => sv.streak.current >= 30)) unlocked.push('habitual')
  if (streakVals.some((sv) => sv.streak.current >= 50)) unlocked.push('streak_50')
  if (streakVals.some((sv) => sv.streak.current >= 100)) unlocked.push('streak_100')
  if (streakVals.some((sv) => sv.streak.current >= 365)) unlocked.push('streak_365')

  // Goals
  if (goals.some((g) => g.completedAt)) unlocked.push('goal_getter')
  if (goals.filter((g) => g.completedAt).length >= 3) unlocked.push('goals_three')
  if (goals.length >= 1) unlocked.push('first_goal')

  // Comeback: best ≥5, current ≥3, best > current
  if (streakVals.some((sv) => sv.streak.best >= 5 && sv.streak.current >= 3 && sv.streak.best > sv.streak.current)) unlocked.push('comeback')

  // Early Bird / Night Owl: based on entry timestamps (now accurate with backdating)
  if (entries.some((e) => new Date(e.timestamp).getHours() < 7)) unlocked.push('early_bird')
  if (entries.some((e) => new Date(e.timestamp).getHours() >= 22)) unlocked.push('night_owl')

  // Consistent: all due habits completed for 7/30 consecutive days
  if (activeHabits.length > 0) {
    const allHabitsStreak = Math.min(...streakVals.map((sv) => sv.streak.current))
    if (allHabitsStreak >= 7) unlocked.push('consistent_week')
    if (allHabitsStreak >= 30) unlocked.push('consistent_month')
  }

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