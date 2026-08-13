import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Habit } from '../types'
import { computeStreak, describeFrequency, freezesUsedInMonth, previousScheduledDay, windowForDay } from '../lib/streaks'
import { addDays, startOfDay, dayKey } from '../lib/dates'
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
  const [logDate, setLogDate] = useState(dayKey(Date.now()))
  const [showLogYesterday, setShowLogYesterday] = useState(false)

  const freezeLog = habit.freezeLog ?? []
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

  const freezesThisMonth = useMemo(() => {
    const now = new Date()
    return freezesUsedInMonth(freezeLog, now.getFullYear(), now.getMonth())
  }, [freezeLog])
  const maxFreezes = settings?.freezesPerMonth ?? 2
  const freezeExhausted = freezesThisMonth >= maxFreezes

  const missedDay = useMemo(() => {
    const yesterday = addDays(todayStart, -1)
    const prev = previousScheduledDay(todayStart, habit.frequency)
    if (prev !== null) return prev
    return yesterday
  }, [todayStart, habit.frequency])

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
    // Show "log yesterday?" if streak was broken and this is a daily habit
    if (streakWasBroken && habit.frequency.kind === 'daily') {
      setShowLogYesterday(true)
    }
  }

  const logYesterday = async () => {
    const yesterday = addDays(startOfDay(Date.now()), -1)
    await addEntry(habit.id, 1, yesterday + (Date.now() - startOfDay(Date.now())))
    setShowLogYesterday(false)
  }

  const submitValue = async () => {
    let parsed: number
    if (habit.quantityKind === 'duration') {
      parsed = parseDuration(value)
    } else {
      parsed = parseFloat(value.replace(',', '.'))
    }
    if (!Number.isFinite(parsed) || parsed <= 0) return
    const targetDay = startOfDay(new Date(logDate + 'T00:00:00').getTime())
    const ts = targetDay + (Date.now() - startOfDay(Date.now()))
    await addEntry(habit.id, parsed, ts)
    setShowValue(false)
    setValue('')
    setLogDate(dayKey(Date.now()))
  }

  const handleFreeze = (e: React.MouseEvent) => {
    e.stopPropagation()
    useFreeze(missedDay, habit.id)
  }

  const win = windowForDay(Date.now(), habit.frequency, habit.createdAt)
  const canFreezeToday = streak > 0 && !status.done && !isFrozenToday && !freezeExhausted && win !== null

  const handleFreezeToday = (e: React.MouseEvent) => {
    e.stopPropagation()
    useFreeze(todayStart, habit.id)
  }

  return (
    <>
      <div
        className="habit-item"
        onClick={() => navigate({ name: 'habit', id: habit.id })}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate({ name: 'habit', id: habit.id })
          }
        }}
      >
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
                {habit.frequency.kind === 'custom' && habit.frequency.timesPerPeriod
                  ? `${status.windowValue}/${habit.frequency.timesPerPeriod} this week`
                  : `${formatValue(status.current, habit.target.unit, habit.quantityKind)} / ${formatValue(habit.target.value, habit.target.unit, habit.quantityKind)}`
                }
              </span>
            )}
            {habit.type === 'binary' && habit.frequency.kind === 'custom' && habit.frequency.timesPerPeriod && (
              <span>{status.windowValue}/{habit.frequency.timesPerPeriod} this week</span>
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
              <span>Streak broken at {bestStreak} — repair with a freeze or log yesterday.</span>
              <button
                className="btn small secondary"
                onClick={handleFreeze}
                disabled={freezeExhausted}
                title={freezeExhausted ? `Freeze limit reached (${maxFreezes}/month)` : undefined}
              >
                ❄️ Use freeze{freezeExhausted ? ' (limit reached)' : ` (${maxFreezes - freezesThisMonth} left)`}
              </button>
            </div>
          )}
          {canFreezeToday && !streakWasBroken && (
            <div className="text-s text-muted" style={{ marginTop: 4 }}>
              <button
                className="btn ghost small"
                onClick={handleFreezeToday}
                style={{ fontSize: '0.75rem', padding: '2px 6px' }}
              >
                ❄️ Freeze today ({maxFreezes - freezesThisMonth} left)
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

      {showLogYesterday && (
        <div className="recovery-msg" style={{ marginLeft: 48, marginTop: -4 }}>
          <span className="text-s">Log yesterday too?</span>
          <button className="btn small secondary" onClick={logYesterday}>
            Yes
          </button>
          <button className="btn ghost small" onClick={() => setShowLogYesterday(false)}>
            No
          </button>
        </div>
      )}

      <Modal open={showValue} title={`Log ${habit.name}`} onClose={() => setShowValue(false)}>
        <div className="sheet-form">
          <div className="field">
            <label>Date</label>
            <input
              type="date"
              value={logDate}
              min={dayKey(addDays(Date.now(), -7))}
              max={dayKey(Date.now())}
              onChange={(e) => setLogDate(e.target.value)}
            />
          </div>
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
