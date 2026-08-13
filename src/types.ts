export type HabitType = 'binary' | 'quantified'
export type QuantityKind = 'count' | 'duration'

export type FrequencyKind = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface Frequency {
  kind: FrequencyKind
  /** For weekly presets + custom days-based schedules: days of week (0=Sun..6=Sat) */
  daysOfWeek?: number[]
  /** For "X times per period" custom frequency */
  timesPerPeriod?: number
  /** For "every N days" interval frequency */
  intervalDays?: number
}

export interface AppLink {
  label: string
  url: string
}

export interface NotificationSettings {
  enabled: boolean
  times: string[] // "HH:MM" 24h
  message?: string
}

export interface Habit {
  id: string
  name: string
  description?: string
  categoryId: string | null
  type: HabitType
  quantityKind?: QuantityKind
  target?: { value: number; unit: string }
  frequency: Frequency
  appLinks: AppLink[]
  goalIds?: string[]
  notification: NotificationSettings
  /** per-habit streak freeze days (start-of-day ms timestamps) */
  freezeLog: number[]
  createdAt: number
  archivedAt?: number
}

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  isPreset: boolean
}

export type GoalMeasure = 'completionCount' | 'quantitySum' | 'streakLength'

export interface Goal {
  id: string
  name: string
  description?: string
  targetDate?: number
  measure: GoalMeasure
  targetValue: number
  linkedHabitIds: string[]
  createdAt: number
  completedAt?: number
}

export interface LogEntry {
  id: string
  habitId: string
  timestamp: number
  value?: number
  note?: string
}

export interface Achievement {
  id: string
  key: string
  unlockedAt: number
}

export interface Settings {
  id: string
  deviceId: string
  createdAt: number
  /** timestamps of days the user has used a streak freeze on (start-of-day ms) */
  freezeLog: number[]
  /** max freezes allowed per month */
  freezesPerMonth: number
}