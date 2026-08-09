import Dexie, { type Table } from 'dexie'
import type { Habit, Category, Goal, LogEntry, Achievement, Settings } from './types'

export class HabitDB extends Dexie {
  habits!: Table<Habit, string>
  categories!: Table<Category, string>
  goals!: Table<Goal, string>
  logEntries!: Table<LogEntry, string>
  achievements!: Table<Achievement, string>
  settings!: Table<Settings, string>

  constructor() {
    super('habit-builder')
    this.version(1).stores({
      habits: 'id, categoryId, name, createdAt, archivedAt',
      categories: 'id, name, isPreset',
      goals: 'id, name, createdAt, completedAt',
      logEntries: 'id, habitId, timestamp, [habitId+timestamp]',
      achievements: 'id, key, unlockedAt',
      settings: 'id',
    })
  }
}

export const db = new HabitDB()

export async function getDeviceId(): Promise<string> {
  const existing = await db.settings.get('global')
  if (existing) return existing.deviceId
  const deviceId = crypto.randomUUID()
  await db.settings.put({ id: 'global', deviceId, createdAt: Date.now() })
  return deviceId
}