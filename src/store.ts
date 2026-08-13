import { create } from 'zustand'
import { db } from './db'
import type {
  Achievement,
  Category,
  Goal,
  Habit,
  LogEntry,
  NotificationSettings,
  Settings,
} from './types'
import { PRESET_CATEGORIES, PRESET_HABITS, makePresetHabit, presetCategoryFor } from './seed'
import { startOfDay } from './lib/dates'
import { buildDayTotals, computeStreak, countCompletedWindows, freezesUsedInMonth, windowCompleted, windowForDay } from './lib/streaks'
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
  /** value accumulated in the current window (for weekly/monthly quantified habits) */
  windowValue: number
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
  settings: Settings | null
  toastMessage: string | null
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

  addEntry: (habitId: string, value?: number, timestamp?: number) => Promise<void>
  removeEntry: (entryId: string) => Promise<void>
  toggleToday: (habitId: string) => Promise<void>
  useFreeze: (dayStart: number, habitId: string) => Promise<void>
  statusFor: (habitId: string, today?: number) => TodayStatus

  exportJSON: () => Promise<string>
  importJSON: (blob: string, mode?: 'replace' | 'merge') => Promise<void>
  showToast: (msg: string) => void
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
          const s = computeStreak(h, entries.filter((e) => e.habitId === h.id), Date.now(), h.freezeLog ?? [])
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
    settings: null,
    toastMessage: null,

    hydrate: async () => {
      try {
        const categories = await db.categories.toArray()
        if (categories.length === 0) {
          await db.categories.bulkPut(PRESET_CATEGORIES.map((c, i) => ({ ...c, id: `pcat-${i}` })))
        }
        const [habits, goals, entries, achievements, cats, settings] = await Promise.all([
          db.habits.toArray(),
          db.goals.toArray(),
          db.logEntries.toArray(),
          db.achievements.toArray(),
          db.categories.toArray(),
          db.settings.get('global'),
        ])
        set({ categories: cats, habits, goals, entries, achievements, settings: settings ?? null, initialized: true })
        await evaluateGoalCompletions()
        await refreshAchievements()
      } catch (e) {
        console.error('Failed to hydrate:', e)
        set({ initialized: true })
      }
    },

    createHabit: async (input) => {
      const habit: Habit = {
        ...input,
        id: uid(),
        createdAt: Date.now(),
        freezeLog: [],
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

    addEntry: async (habitId, value, timestamp) => {
      const entry: LogEntry = { id: uid(), habitId, timestamp: timestamp ?? Date.now(), value }
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
      const win = windowForDay(Date.now(), habit.frequency, habit.createdAt)
      const habitEntries = get().entries.filter((e) => e.habitId === habitId)
      // For daily habits, toggle today's entry. For weekly/monthly, toggle the
      // most recent entry within the current window.
      let candidates: typeof habitEntries
      if (habit.frequency.kind === 'daily') {
        const todayStart = startOfDay(Date.now())
        candidates = habitEntries.filter((e) => e.timestamp >= todayStart)
      } else if (win) {
        candidates = habitEntries.filter((e) => e.timestamp >= win.start && e.timestamp < win.end)
      } else {
        candidates = []
      }
      if (candidates.length > 0) {
        const sorted = candidates.sort((a, b) => a.timestamp - b.timestamp)
        const last = sorted[sorted.length - 1]
        await db.logEntries.delete(last.id)
      } else {
        await db.logEntries.add({ id: uid(), habitId, timestamp: Date.now() })
      }
      set({ entries: await db.logEntries.toArray() })
      await evaluateGoalCompletions()
      await refreshAchievements()
    },

    useFreeze: async (dayStart, habitId) => {
      const habit = get().habits.find((h) => h.id === habitId)
      if (!habit) return
      const freezeLog = habit.freezeLog ?? []
      if (freezeLog.includes(dayStart)) return
      const now = new Date()
      const used = freezesUsedInMonth(freezeLog, now.getFullYear(), now.getMonth())
      const max = get().settings?.freezesPerMonth ?? 2
      if (used >= max) {
        get().showToast(`❄️ Freeze limit reached (${max}/month)`)
        return
      }
      const updatedHabit = { ...habit, freezeLog: [...freezeLog, dayStart] }
      await db.habits.put(updatedHabit)
      set({ habits: await db.habits.toArray() })
    },

    statusFor: (habitId, today = Date.now()) => {
      const habit = get().habits.find((h) => h.id === habitId)
      if (!habit) return { due: false, done: false, current: 0, windowValue: 0 }
      const win = windowForDay(today, habit.frequency, habit.createdAt)
      const due = win !== null
      const habitEntries = get().entries.filter((e) => e.habitId === habitId)
      const todayStart = startOfDay(today)
      let current = 0
      for (const e of habitEntries) {
        if (e.timestamp >= todayStart) current += e.value ?? 1
      }
      let windowValue = 0
      if (win) {
        for (const e of habitEntries) {
          if (e.timestamp >= win.start && e.timestamp < win.end) windowValue += e.value ?? 1
        }
      }
      const done = win
        ? windowCompleted(win, habit, buildDayTotals(habitEntries))
        : habit.type === 'quantified' && habit.target
          ? current >= habit.target.value
          : current > 0
      return {
        due,
        done,
        current,
        windowValue,
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

    importJSON: async (blob, mode = 'merge') => {
      let data: Record<string, unknown>
      try {
        data = JSON.parse(blob)
      } catch {
        get().showToast('Invalid JSON file')
        return
      }
      if (data.app !== 'habit-builder') {
        get().showToast('Unrecognised file format')
        return
      }
      if (typeof data.version !== 'number' || data.version > 1) {
        get().showToast(`Unsupported file version: ${data.version}`)
        return
      }
      const d = data as {
        habits?: Habit[]
        categories?: Category[]
        goals?: Goal[]
        entries?: LogEntry[]
        achievements?: Achievement[]
      }
      await db.transaction('rw', [db.habits, db.categories, db.goals, db.logEntries, db.achievements], async () => {
        if (mode === 'replace') {
          await db.habits.clear()
          await db.categories.clear()
          await db.goals.clear()
          await db.logEntries.clear()
          await db.achievements.clear()
        }
        if (d.habits) await db.habits.bulkPut(d.habits)
        if (d.categories) await db.categories.bulkPut(d.categories)
        if (d.goals) await db.goals.bulkPut(d.goals)
        if (d.entries) await db.logEntries.bulkPut(d.entries)
        if (d.achievements) {
          await db.achievements.bulkPut(
            d.achievements.map((a) => ({ ...a, id: a.id || uid() })),
          )
        }
      })
      set({
        habits: await db.habits.toArray(),
        categories: await db.categories.toArray(),
        goals: await db.goals.toArray(),
        entries: await db.logEntries.toArray(),
        achievements: await db.achievements.toArray(),
      })
      await refreshAchievements()
      get().showToast('Data imported successfully')
    },

    showToast: (msg) => {
      set({ toastMessage: msg })
      setTimeout(() => set({ toastMessage: null }), 4000)
    },
  }
})