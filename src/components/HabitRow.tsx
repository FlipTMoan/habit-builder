import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Habit } from '../types'
import { computeStreak, describeFrequency } from '../lib/streaks'
import { startOfDay } from '../lib/dates'
import { navigate } from '../App'
import Modal from './Modal'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m === 0) return `${s}s`
  return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`
}

function parseDuration(input: string): number {
  const s = input.trim()
  if (s.includes(':')) {
    const parts = s.split(':')
    if (parts.length === 2) {
      return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0)
    }
    if (parts.length === 3) {
      return (parseInt(parts[0], 10) || 0) * 3600 + (parseInt(parts[1], 10) || 0) * 60 + (parseInt(parts[2], 10) || 0)
    }
  }
  return parseFloat(s.replace(',', '.')) || 0
}

function formatValue(v: number, unit: string, quantityKind?: string): string {
  if (quantityKind === 'duration') return formatDuration(v)
  return `${v} ${unit}`
}

export default function HabitRow({ habit }: { habit: Habit }) {
  const statusFor = useStore((s) => s.statusFor)
  const toggleToday = useStore((s) => s.toggleToday)
  const addEntry = useStore((s) => s.addEntry)
  const categories = useStore((s) => s.categories)
  const entries = useStore((s) => s.entries)
  const settings = useStore((s) => s.settings)
  const useFreeze = useStore((s) => s.useFreeze)
  const status = statusFor(habit.id)
  const [showValue, setShowValue] = useState(false)
  const [value, setValue] = useState('')

  const freezeLog = settings?.freezeLog ?? []
  const streakResult = useMemo(
    () => computeStreak(habit, entries.filter((e) => e.habitId === habit.id), Date.now(), freezeLog),
    [habit, entries, freezeLog],
  )
  const streak = streakResult.current
  const bestStreak = streakResult.best
  const cat = categories.find((c) => c.id === habit.categoryId)

  const todayStart = startOfDay(Date.now())
  const isFrozenToday = freezeLog.includes(todayStart)
  const streakWasBroken = bestStreak >= 3 && streak === 0

  const progressPct = useMemo(() => {
    if (habit.type !== 'quantified' || !habit.target) return 0
    return Math.min(100, Math.round((status.current / habit.target.value) * 100))
  }, [habit, status.current])

  const onCheck = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (habit.type === 'quantified') {
      setShowValue(true)
      return
    }
    toggleToday(habit.id)
  }

  const submitValue = async () => {
    let parsed: number
    if (habit.quantityKind === 'duration') {
      parsed = parseDuration(value)
    } else {
      parsed = parseFloat(value.replace(',', '.'))
    }
    if (!Number.isFinite(parsed) || parsed <= 0) return
    await addEntry(habit.id, parsed)
    setShowValue(false)
    setValue('')
  }

  const handleFreeze = (e: React.MouseEvent) => {
    e.stopPropagation()
    useFreeze(todayStart)
  }

  return (
    <>
      <div className="habit-item" onClick={() => navigate({ name: 'habit', id: habit.id })}>
        <button
          className={`habit-check ${status.done ? 'done' : ''}`}
          onClick={onCheck}
          aria-label={status.done ? 'Mark as not done' : 'Mark as done'}
        >
          ✓
        </button>
        <div className="habit-body">
          <div className="habit-name">
            {cat && (
              <span
                className="cat-dot"
                style={{ background: cat.color, display: 'inline-block', marginRight: 8 }}
              />
            )}
            {habit.name}
          </div>
          <div className="habit-meta">
            <span>{describeFrequency(habit.frequency)}</span>
            {habit.type === 'quantified' && habit.target && (
              <span>
                {formatValue(status.current, habit.target.unit, habit.quantityKind)}
                {' / '}
                {formatValue(habit.target.value, habit.target.unit, habit.quantityKind)}
              </span>
            )}
            <span className={`streak-pill ${streak > 0 ? 'on' : ''}`}>🔥 {streak}</span>
          </div>
          {habit.type === 'quantified' && habit.target && (
            <div className="progress-bar" style={{ marginTop: 6 }}>
              <div style={{
                width: `${progressPct}%`,
                background: progressPct >= 100 ? 'var(--green)' : 'var(--accent)',
              }} />
            </div>
          )}
          {streakWasBroken && !status.done && !isFrozenToday && (
            <div className="recovery-msg">
              <span>💪 Streak paused — get back on track today!</span>
              <button className="btn small secondary" onClick={handleFreeze}>
                ❄️ Use freeze
              </button>
            </div>
          )}
        </div>
        {habit.type === 'quantified' && !status.done && (
          <button
            className="btn small secondary"
            onClick={(e) => {
              e.stopPropagation()
              setShowValue(true)
            }}
          >
            +
          </button>
        )}
      </div>

      <Modal open={showValue} title={`Log ${habit.name}`} onClose={() => setShowValue(false)}>
        <div className="sheet-form">
          <div className="field">
            <label>
              {habit.quantityKind === 'duration' ? 'Time' : 'Amount'}
              {' '}(target: {habit.target ? formatValue(habit.target.value, habit.target.unit, habit.quantityKind) : '—'})
            </label>
            {habit.quantityKind === 'duration' ? (
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitValue()}
                placeholder="MM:SS"
              />
            ) : (
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitValue()}
                placeholder={habit.target?.unit}
              />
            )}
          </div>
          <button className="btn btn-block" onClick={submitValue}>
            Log entry
          </button>
        </div>
      </Modal>
    </>
  )
}
