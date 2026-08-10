import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Habit, LogEntry } from '../types'
import { computeStreak, describeFrequency, windowForDay, windowCompleted } from '../lib/streaks'
import { startOfDay, startOfWeek } from '../lib/dates'
import Heatmap from '../components/Heatmap'
import TrendChart, { type TrendPoint } from '../components/TrendChart'
import ProgressRing from '../components/ProgressRing'
import { computeGoalProgress } from '../lib/goals'
import { navigate } from '../App'
import Modal from '../components/Modal'

const DAY_MS = 86_400_000

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m === 0) return `${s}s`
  return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`
}

function formatValue(v: number, unit: string, quantityKind?: string): string {
  if (quantityKind === 'duration') return formatDuration(v)
  return `${v} ${unit}`
}

function perDayTotals(entries: LogEntry[]): Map<number, number> {
  const map = new Map<number, number>()
  for (const e of entries) {
    const key = startOfDay(e.timestamp)
    map.set(key, (map.get(key) ?? 0) + (e.value ?? 0))
  }
  return map
}

function buildHeatmapData(habit: Habit, entries: LogEntry[]): Map<number, number> {
  const perDay = perDayTotals(entries)
  const out = new Map<number, number>()
  for (const [day, value] of perDay) {
    if (habit.type === 'binary') {
      out.set(day, 4)
    } else {
      const target = habit.target?.value ?? 1
      const ratio = value / target
      out.set(day, ratio >= 1 ? 4 : ratio >= 0.75 ? 3 : ratio >= 0.5 ? 2 : ratio >= 0.25 ? 1 : 0)
    }
  }
  return out
}

function weeklyCompletionRate(habit: Habit, entries: LogEntry[], today: number): TrendPoint[] {
  const perDay = perDayTotals(entries)
  const totalsMap = new Map<number, { count: number; value: number; hours: number[] }>()
  for (const [k, v] of perDay) totalsMap.set(k, { count: 1, value: v, hours: [] })

  const wins = (day: number) => {
    const win = windowForDay(day, habit.frequency, habit.createdAt)
    if (!win) return null
    const t = totalsMap.get(day)
    return { win, complete: t ? windowCompleted(win, habit, new Map([[day, t]]) as never) : false }
  }

  const points: TrendPoint[] = []
  const monday = startOfWeek(startOfDay(today), 1)
  for (let w = 11; w >= 0; w--) {
    const weekStart = monday - w * 7 * DAY_MS
    let scheduled = 0
    let done = 0
    for (let d = 0; d < 7; d++) {
      const day = weekStart + d * DAY_MS
      if (day > today) continue
      const r = wins(day)
      if (!r) continue
      scheduled += 1
      if (r.complete) done += 1
    }
    if (scheduled === 0) continue
    const label = new Date(weekStart).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    points.push({ label, value: Math.round((done / scheduled) * 100), unit: '%' })
  }
  return points
}

export default function HabitDetailScreen({ habitId }: { habitId: string }) {
  const habit = useStore((s) => s.habits.find((h) => h.id === habitId))
  const entries = useStore((s) => s.entries)
  const goals = useStore((s) => s.goals)
  const categories = useStore((s) => s.categories)
  const habits = useStore((s) => s.habits)
  const archiveHabit = useStore((s) => s.archiveHabit)
  const deleteHabit = useStore((s) => s.deleteHabit)
  const removeEntry = useStore((s) => s.removeEntry)
  const settings = useStore((s) => s.settings)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const habitEntries = useMemo(
    () => entries.filter((e) => e.habitId === habitId),
    [entries, habitId],
  )
  const recentEntries = useMemo(
    () => [...habitEntries].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10),
    [habitEntries],
  )

  const stats = useMemo(
    () => (habit ? computeStreak(habit, habitEntries, Date.now(), settings?.freezeLog ?? []) : null),
    [habit, habitEntries, settings],
  )
  const heatmap = useMemo(
    () => (habit ? buildHeatmapData(habit, habitEntries) : new Map<number, number>()),
    [habit, habitEntries],
  )
  const trend = useMemo(
    () => (habit ? weeklyCompletionRate(habit, habitEntries, Date.now()) : []),
    [habit, habitEntries],
  )

  if (!habit || !stats) {
    return (
      <div className="page">
        <div className="card empty">Habit not found.</div>
      </div>
    )
  }

  const goalProgresses = goals
    .filter((g) => g.linkedHabitIds.includes(habit.id) && !g.completedAt)
    .map((g) => ({ goal: g, progress: computeGoalProgress(g, habits, entries, Date.now()) }))

  const cat = categories.find((c) => c.id === habit.categoryId)

  return (
    <div className="page">
      <div className="topbar">
        <button className="btn ghost small" onClick={() => navigate({ name: 'dashboard' })}>
          ← Back
        </button>
        <div className="row" style={{ marginLeft: 'auto' }}>
          <button className="btn secondary small" onClick={() => navigate({ name: 'habit-edit', id: habit.id })}>
            Edit
          </button>
          <button
            className="btn ghost small"
            onClick={async () => {
              await archiveHabit(habit.id)
              navigate({ name: 'dashboard' })
            }}
          >
            {habit.archivedAt ? 'Unarchive' : 'Archive'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div className="detail-header">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: cat ? cat.color : 'var(--bg-soft)',
              display: 'grid',
              placeItems: 'center',
              fontSize: '1.6rem',
              flexShrink: 0,
            }}
          >
            {cat?.icon ?? '⭐'}
          </div>
          <div className="grow">
            <h1 style={{ margin: 0, fontSize: '1.3rem' }}>{habit.name}</h1>
            {habit.description && (
              <p className="text-muted text-s" style={{ margin: '2px 0 0' }}>
                {habit.description}
              </p>
            )}
            <div className="habit-meta" style={{ marginTop: 8 }}>
              <span className="streak-pill on">🔥 {stats.current} day streak</span>
              <span>{describeFrequency(habit.frequency)}</span>
              {cat && <span>{cat.name}</span>}
            </div>
          </div>
        </div>

        <div className="detail-stats" style={{ marginTop: 18 }}>
          <div className="overview-stat">
            <b>{stats.best}</b>
            <span>best streak</span>
          </div>
          <div className="overview-stat">
            <b>{habitEntries.length}</b>
            <span>{habit.type === 'quantified' ? 'entries' : 'completions'}</span>
          </div>
          <div className="overview-stat">
            <b>{habit.type === 'quantified' && habit.target ? formatValue(habit.target.value, habit.target.unit, habit.quantityKind) : '—'}</b>
            <span>{habit.type === 'quantified' ? 'target' : 'daily'}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>History</h2>
        <Heatmap data={heatmap} />
      </div>

      <div className="card">
        <h2>Completion trend</h2>
        <TrendChart data={trend} />
      </div>

      {habit.appLinks.length > 0 && (
        <div className="card">
          <h2>Open the app</h2>
          <div className="list-plain">
            {habit.appLinks.map((l, i) => (
              <a key={i} className="list-row" href={l.url} target="_blank" rel="noreferrer">
                <span className="title">↗ {l.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {goalProgresses.length > 0 && (
        <div className="card">
          <h2>Linked goals</h2>
          <div className="page" style={{ gap: 10 }}>
            {goalProgresses.map(({ goal, progress }) => (
              <div key={goal.id} className="row">
                <ProgressRing pct={progress.pct} size={48} stroke={6}>
                  {Math.round(progress.pct)}%
                </ProgressRing>
                <div className="grow">
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{goal.name}</div>
                  <div className="text-muted text-s">
                    {Math.round(progress.current)}/{progress.target}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2>Recent entries</h2>
        {recentEntries.length === 0 ? (
          <div className="empty">
            <p style={{ margin: 0 }}>No entries yet.</p>
          </div>
        ) : (
          <div className="list-plain">
            {recentEntries.map((e) => (
              <div key={e.id} className="list-row">
                <span className="title">
                  {new Date(e.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {e.value != null && ` · ${formatValue(e.value, habit.target?.unit ?? '', habit.quantityKind)}`}
                </span>
                <button className="icon-btn" onClick={() => removeEntry(e.id)} aria-label="Delete entry">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
        <h2>Danger zone</h2>
        <div className="row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
          <p className="text-s text-muted" style={{ margin: 0 }}>
            Deleting removes the habit and all {habitEntries.length} of its entries.
          </p>
          <button className="btn danger" onClick={() => setConfirmDelete(true)}>
            Delete habit
          </button>
        </div>
      </div>

      <Modal open={confirmDelete} title="Delete habit?" onClose={() => setConfirmDelete(false)}>
        <div className="sheet-form">
          <p className="text-s text-muted" style={{ margin: 0 }}>
            This permanently deletes “{habit.name}” and {habitEntries.length} logged entries. This cannot be undone.
          </p>
          <button
            className="btn danger btn-block"
            onClick={async () => {
              await deleteHabit(habit.id)
              navigate({ name: 'dashboard' })
            }}
          >
            Delete forever
          </button>
        </div>
      </Modal>
    </div>
  )
}