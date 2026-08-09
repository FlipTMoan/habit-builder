import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Habit } from '../types'
import { computeStreak, describeFrequency } from '../lib/streaks'
import { startOfDay } from '../lib/dates'
import { navigate } from '../App'
import Modal from './Modal'

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

  const onCheck = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (habit.type === 'quantified') {
      setShowValue(true)
      return
    }
    toggleToday(habit.id)
  }

  const submitValue = async () => {
    const parsed = parseFloat(value.replace(',', '.'))
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
                {status.current}/{habit.target.value} {habit.target.unit}
              </span>
            )}
            <span className={`streak-pill ${streak > 0 ? 'on' : ''}`}>🔥 {streak}</span>
          </div>
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
              Amount (target: {habit.target?.value} {habit.target?.unit})
            </label>
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
          </div>
          <button className="btn btn-block" onClick={submitValue}>
            Log entry
          </button>
        </div>
      </Modal>
    </>
  )
}
