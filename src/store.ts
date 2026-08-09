import { create } from 'zustand'
import { db } from './db'
import type {
  Achievement,
  Category,
  Goal,
  Habit,
  LogEntry,
  NotificationSettings,
} from './types'
import { PRESET_CATEGORIES, PRESET_HABITS, makePresetHabit, presetCategoryFor } from './seed'
import { startOfDay } from './lib/dates'
import { computeStreak, countCompletedWindows, windowForDay } from './lib/streaks'
import { evaluateAchievements, newlyUnlocked } from './lib/achievements'

interface HabitInput {
  name: string
  description?: string
  categoryId: string | null
  type: Habit['type']
  target?: Habit['target']
  frequency: Habit['frequency']
  appLinks: Habit['appLinks']
  goalIds?: string[]
  notification: NotificationSettings
}

export interface TodayStatus {
  due: boolean
  done: boolean
  current: number
  target?: number
  unit?: string
}

interface AppState {
  initialized: boolean
  habits: Habit[]
  categories: Category[]
  goals: Goal[]
  entries: LogEntry[]
  achievements: Achievement[]
  lastUnlocked: Achievement[]
  hydrate: () => Promise<void>

  createHabit: (input: HabitInput) => Promise<Habit>
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<void>
  archiveHabit: (id: string) => Promise<void>
  deleteHabit: (id: string) => Promise<void>
  importPreset: (name: string) => Promise<void>

  createCategory: (input: Omit<Category, 'id' | 'isPreset'>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>

  createGoal: (input: Omit<Goal, 'id' | 'createdAt' | 'completedAt'>) => Promise<void>
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>

  addEntry: (habitId: string, value?: number) => Promise<void>
  removeEntry: (entryId: string) => Promise<void>
  toggleToday: (habitId: string) => Promise<void>
  statusFor: (habitId: string, today?: number) => TodayStatus

  exportJSON: () => Promise<string>
  importJSON: (blob: string) => Promise<void>
}

function uid(): string {
  return crypto.randomUUID()
}

export const useStore = create<AppState>((set, get) => {
  const refreshGoals = async () => {
    set({ goals: await db.goals.toArray() })
  }

  const refreshAchievements = async () => {
    const { habits, goals, entries, achievements } = get()
    const current = evaluateAchievements({ habits, goals, entries, today: Date.now() })
    const newOnes = newlyUnlocked(current, achievements)
    if (newOnes.length === 0) return
    const records: Achievement[] = newOnes.map((d) => ({
      id: uid(),
      key: d.key,
      unlockedAt: Date.now(),
    }))
    await db.achievements.bulkAdd(records)
    set({ achievements: [...achievements, ...records], lastUnlocked: records })
  }

  const evaluateGoalCompletions = async () => {
    const { goals, habits, entries } = get()
    let changed = false
    for (const goal of goals) {
      if (goal.completedAt) continue
      let done = false
      if (goal.measure === 'quantitySum') {
        const total = entries
          .filter((e) => goal.linkedHabitIds.includes(e.habitId))
          .reduce((s, e) => s + (e.value ?? 0), 0)
        done = total >= goal.targetValue
      } else if (goal.measure === 'streakLength') {
        for (const h of habits) {
          if (!goal.linkedHabitIds.includes(h.id)) continue
          const s = computeStreak(h, entries.filter((e) => e.habitId === h.id), Date.now())
          if (s.current >= goal.targetValue) {
            done = true
            break
          }
        }
      } else {
        let total = 0
        for (const h of habits) {
          if (!goal.linkedHabitIds.includes(h.id)) continue
          total += countCompletedWindows(h, entries.filter((e) => e.habitId === h.id), Date.now())
          if (total >= goal.targetValue) {
            done = true
            break
          }
        }
      }
      if (done) {
        await db.goals.put({ ...goal, completedAt: Date.now() })
        changed = true
      }
    }
    if (changed) await refreshGoals()
  }

  return {
    initialized: false,
    habits: [],
    categories: [],
    goals: [],
    entries: [],
    achievements: [],
    lastUnlocked: [],

    hydrate: async () => {
      const categories = await db.categories.toArray()
      if (categories.length === 0) {
        await db.categories.bulkAdd(PRESET_CATEGORIES.map((c, i) => ({ ...c, id: `pcat-${i}` })))
      }
      const [habits, goals, entries, achievements, cats] = await Promise.all([
        db.habits.toArray(),
        db.goals.toArray(),
        db.logEntries.toArray(),
        db.achievements.toArray(),
        db.categories.toArray(),
      ])
      set({ categories: cats, habits, goals, entries, achievements, initialized: true })
      await evaluateGoalCompletions()
      await refreshAchievements()
    },

    createHabit: async (input) => {
      const habit: Habit = {
        ...input,
        id: uid(),
        createdAt: Date.now(),
      }
      await db.habits.add(habit)
      set({ habits: await db.habits.toArray() })
      await refreshAchievements()
      return habit
    },

    updateHabit: async (id, patch) => {
      const cur = get().habits.find((h) => h.id === id)
      if (!cur) return
      const next = { ...cur, ...patch, id }
      await db.habits.put(next)
      set({ habits: await db.habits.toArray() })
    },

    archiveHabit: async (id) => {
      const cur = get().habits.find((h) => h.id === id)
      if (!cur) return
      const next = { ...cur, archivedAt: cur.archivedAt ? undefined : Date.now() }
      await db.habits.put(next)
      set({ habits: await db.habits.toArray() })
    },

    deleteHabit: async (id) => {
      await db.habits.delete(id)
      await db.logEntries.where('habitId').equals(id).delete()
      set({
        habits: await db.habits.toArray(),
        entries: await db.logEntries.toArray(),
      })
    },

    importPreset: async (name) => {
      const preset = PRESET_HABITS.find((p) => p.name === name)
      if (!preset) return
      const cat = presetCategoryFor(name)
      const cats = await db.categories.toArray()
      if (cat && !cats.some((c) => c.id === cat.id)) {
        await db.categories.add({ ...cat, isPreset: true })
      }
      await db.habits.add(makePresetHabit(preset, cat?.id ?? null))
      set({
        habits: await db.habits.toArray(),
        categories: await db.categories.toArray(),
      })
      await refreshAchievements()
    },

    createCategory: async (input) => {
      const cat: Category = { ...input, id: uid(), isPreset: false }
      await db.categories.add(cat)
      set({ categories: await db.categories.toArray() })
    },

    deleteCategory: async (id) => {
      const { habits } = get()
      for (const h of habits) {
        if (h.categoryId !== id) continue
        await db.habits.put({ ...h, categoryId: null })
      }
      await db.categories.delete(id)
      set({
        categories: await db.categories.toArray(),
        habits: await db.habits.toArray(),
      })
    },

    createGoal: async (input) => {
      const goal: Goal = { ...input, id: uid(), createdAt: Date.now() }
      await db.goals.add(goal)
      set({ goals: await db.goals.toArray() })
      await refreshAchievements()
    },

    updateGoal: async (id, patch) => {
      const cur = get().goals.find((g) => g.id === id)
      if (!cur) return
      const next = { ...cur, ...patch, id }
      await db.goals.put(next)
      set({ goals: await db.goals.toArray() })
    },

    deleteGoal: async (id) => {
      await db.goals.delete(id)
      set({ goals: await db.goals.toArray() })
    },

    addEntry: async (habitId, value) => {
      const entry: LogEntry = { id: uid(), habitId, timestamp: Date.now(), value }
      await db.logEntries.add(entry)
      set({ entries: await db.logEntries.toArray() })
      await evaluateGoalCompletions()
      await refreshAchievements()
    },

    removeEntry: async (entryId) => {
      await db.logEntries.delete(entryId)
      set({ entries: await db.logEntries.toArray() })
      await refreshAchievements()
    },

    toggleToday: async (habitId) => {
      const habit = get().habits.find((h) => h.id === habitId)
      if (!habit) return
      const todayStart = startOfDay(Date.now())
      const todays = get()
        .entries.filter((e) => e.habitId === habitId && e.timestamp >= todayStart)
        .sort((a, b) => a.timestamp - b.timestamp)
      if (todays.length > 0) {
        const last = todays[todays.length - 1]
        await db.logEntries.delete(last.id)
      } else {
        await db.logEntries.add({ id: uid(), habitId, timestamp: Date.now() })
      }
      set({ entries: await db.logEntries.toArray() })
      await evaluateGoalCompletions()
      await refreshAchievements()
    },

    statusFor: (habitId, today = Date.now()) => {
      const habit = get().habits.find((h) => h.id === habitId)
      if (!habit) return { due: false, done: false, current: 0 }
      const win = windowForDay(today, habit.frequency, habit.createdAt)
      const due = win !== null
      let current = 0
      for (const e of get().entries) {
        if (e.habitId === habitId && e.timestamp >= startOfDay(today)) {
          current += e.value ?? 1
        }
      }
      const done =
        habit.type === 'quantified' && habit.target
          ? current >= habit.target.value
          : current > 0
      return {
        due,
        done,
        current,
        target: habit.type === 'quantified' ? habit.target?.value : undefined,
        unit: habit.type === 'quantified' ? habit.target?.unit : undefined,
      }
    },

    exportJSON: async () => {
      const [habits, categories, goals, entries, achievements] = await Promise.all([
        db.habits.toArray(),
        db.categories.toArray(),
        db.goals.toArray(),
        db.logEntries.toArray(),
        db.achievements.toArray(),
      ])
      return JSON.stringify(
        {
          app: 'habit-builder',
          version: 1,
          exportedAt: Date.now(),
          habits,
          categories,
          goals,
          entries,
          achievements,
        },
        null,
        2,
      )
    },

    importJSON: async (blob) => {
      const data = JSON.parse(blob) as {
        habits?: Habit[]
        categories?: Category[]
        goals?: Goal[]
        entries?: LogEntry[]
        achievements?: Achievement[]
      }
      if (data.habits) await db.habits.bulkPut(data.habits)
      if (data.categories) await db.categories.bulkPut(data.categories)
      if (data.goals) await db.goals.bulkPut(data.goals)
      if (data.entries) await db.logEntries.bulkPut(data.entries)
      if (data.achievements) {
        await db.achievements.bulkPut(
          data.achievements.map((a) => ({ ...a, id: a.id || uid() })),
        )
      }
      set({
        habits: await db.habits.toArray(),
        categories: await db.categories.toArray(),
        goals: await db.goals.toArray(),
        entries: await db.logEntries.toArray(),
        achievements: await db.achievements.toArray(),
      })
      await refreshAchievements()
    },
  }
})