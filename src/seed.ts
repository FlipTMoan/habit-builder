import type { Category, Habit } from './types'

export const PRESET_CATEGORIES: Category[] = [
  { id: 'cat-health', name: 'Health', color: '#ef4444', icon: '🫀', isPreset: true },
  { id: 'cat-fitness', name: 'Fitness', color: '#f97316', icon: '💪', isPreset: true },
  { id: 'cat-learning', name: 'Learning', color: '#3b82f6', icon: '📚', isPreset: true },
  { id: 'cat-finance', name: 'Finance', color: '#22c55e', icon: '💰', isPreset: true },
  { id: 'cat-mind', name: 'Mindfulness', color: '#a855f7', icon: '🧘', isPreset: true },
  { id: 'cat-productivity', name: 'Productivity', color: '#06b6d4', icon: '⚡', isPreset: true },
  { id: 'cat-relationships', name: 'Relationships', color: '#ec4899', icon: '💞', isPreset: true },
  { id: 'cat-lifestyle', name: 'Lifestyle', color: '#eab308', icon: '🏡', isPreset: true },
]

const now = Date.now()

export const PRESET_HABITS: Omit<Habit, 'id' | 'createdAt' | 'categoryId'>[] = [
  {
    name: 'Drink 2L of water',
    description: 'Stay hydrated through the day.',
    type: 'quantified',
    target: { value: 8, unit: 'cups' },
    frequency: { kind: 'daily' },
    appLinks: [],
    notification: { enabled: false, times: ['08:00'] },
  },
  {
    name: 'Take a walk',
    description: 'A brisk 20-minute walk outside.',
    type: 'binary',
    frequency: { kind: 'daily' },
    appLinks: [{ label: 'Strava', url: 'https://strava.com' }],
    notification: { enabled: false, times: ['12:30'] },
  },
  {
    name: 'Strength workout',
    description: 'Resistance training session.',
    type: 'binary',
    frequency: { kind: 'custom', daysOfWeek: [1, 3, 5] },
    appLinks: [{ label: 'Fitness App', url: 'https://www.strong.app' }],
    notification: { enabled: false, times: ['18:00'] },
  },
  {
    name: 'Read 20 pages',
    description: 'Make progress in a book every day.',
    type: 'quantified',
    target: { value: 20, unit: 'pages' },
    frequency: { kind: 'daily' },
    appLinks: [{ label: 'Kindle', url: 'https://read.amazon.com' }],
    notification: { enabled: false, times: ['21:00'] },
  },
  {
    name: 'Meditate',
    description: 'Sit with a 10-minute guided or silent meditation.',
    type: 'binary',
    frequency: { kind: 'daily' },
    appLinks: [{ label: 'Headspace', url: 'https://headspace.com' }],
    notification: { enabled: false, times: ['07:00'] },
  },
  {
    name: 'Journal',
    description: 'Write three sentences about your day.',
    type: 'binary',
    frequency: { kind: 'daily' },
    appLinks: [],
    notification: { enabled: false, times: ['22:00'] },
  },
  {
    name: 'Sleep by 23:00',
    description: 'Wind down and get to bed on time.',
    type: 'binary',
    frequency: { kind: 'daily' },
    appLinks: [],
    notification: { enabled: false, times: ['22:30'] },
  },
  {
    name: 'No sugar',
    description: 'Skip added sugar and sweets today.',
    type: 'binary',
    frequency: { kind: 'daily' },
    appLinks: [],
    notification: { enabled: false, times: ['08:00'] },
  },
  {
    name: 'Budget check',
    description: 'Review spending against the weekly budget.',
    type: 'binary',
    frequency: { kind: 'weekly' },
    appLinks: [{ label: 'Budget Tracker', url: 'https://www.mint.com' }],
    notification: { enabled: false, times: ['19:00'] },
  },
  {
    name: 'Save a little',
    description: 'Transfer anything extra into savings.',
    type: 'quantified',
    target: { value: 10, unit: 'eur' },
    frequency: { kind: 'weekly' },
    appLinks: [],
    notification: { enabled: false, times: ['18:00'] },
  },
  {
    name: 'Practice a language',
    description: 'Complete a lesson or 15 minutes of practice.',
    type: 'quantified',
    target: { value: 15, unit: 'min' },
    frequency: { kind: 'daily' },
    appLinks: [{ label: 'Duolingo', url: 'https://duolingo.com' }],
    notification: { enabled: false, times: ['12:00'] },
  },
  {
    name: 'Learn a new word',
    description: 'Add one word to your vocabulary list.',
    type: 'binary',
    frequency: { kind: 'daily' },
    appLinks: [],
    notification: { enabled: false, times: ['18:30'] },
  },
  {
    name: 'Call a friend or family',
    description: 'Reach out to someone you care about.',
    type: 'binary',
    frequency: { kind: 'weekly' },
    appLinks: [],
    notification: { enabled: false, times: ['17:00'] },
  },
  {
    name: 'Meal prep',
    description: 'Plan and prep meals for the coming week.',
    type: 'binary',
    frequency: { kind: 'custom', daysOfWeek: [0] },
    appLinks: [],
    notification: { enabled: false, times: ['10:00'] },
  },
  {
    name: 'Study sessions',
    description: 'Focused learning session with no distractions.',
    type: 'quantified',
    target: { value: 30, unit: 'min' },
    frequency: { kind: 'custom', daysOfWeek: [1, 2, 4, 5] },
    appLinks: [{ label: 'Anki', url: 'https://apps.ankiweb.net' }],
    notification: { enabled: false, times: ['19:00'] },
  },
  {
    name: 'Stretch',
    description: 'A short full-body stretch to release tension.',
    type: 'binary',
    frequency: { kind: 'daily' },
    appLinks: [],
    notification: { enabled: false, times: ['08:30'] },
  },
  {
    name: 'Plan tomorrow',
    description: 'Write down the three most important tasks.',
    type: 'binary',
    frequency: { kind: 'daily' },
    appLinks: [],
    notification: { enabled: false, times: ['20:30'] },
  },
]

export function presetCategoryFor(name: string): Category | undefined {
  const map: [string, string][] = [
    ['water', 'cat-health'],
    ['walk', 'cat-fitness'],
    ['workout', 'cat-fitness'],
    ['strength', 'cat-fitness'],
    ['read', 'cat-learning'],
    ['meditat', 'cat-mind'],
    ['journal', 'cat-mind'],
    ['sleep', 'cat-health'],
    ['sugar', 'cat-health'],
    ['budget', 'cat-finance'],
    ['save', 'cat-finance'],
    ['language', 'cat-learning'],
    ['word', 'cat-learning'],
    ['friend', 'cat-relationships'],
    ['call', 'cat-relationships'],
    ['meal', 'cat-lifestyle'],
    ['study', 'cat-learning'],
    ['stretch', 'cat-fitness'],
    ['plan', 'cat-productivity'],
  ]
  for (const [key, catId] of map) {
    if (name.toLowerCase().includes(key)) return PRESET_CATEGORIES.find((c) => c.id === catId)
  }
  return undefined
}

export function makePresetHabit(preset: (typeof PRESET_HABITS)[number], categoryId: string | null): Habit {
  return {
    ...preset,
    id: crypto.randomUUID(),
    categoryId,
    createdAt: now,
    goalIds: [],
  }
}