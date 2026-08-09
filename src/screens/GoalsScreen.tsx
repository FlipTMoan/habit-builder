import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Goal, GoalMeasure } from '../types'
import ProgressRing from '../components/ProgressRing'
import { computeGoalProgress } from '../lib/goals'
import Modal from '../components/Modal'

const MEASURE_LABELS: Record<GoalMeasure, string> = {
  completionCount: 'Total habit completions',
  quantitySum: 'Total amount logged',
  streakLength: 'Longest current streak',
}

function emptyDraft() {
  return {
    name: '',
    measure: 'completionCount' as GoalMeasure,
    targetValue: '',
    targetDate: '',
    linkedHabitIds: [] as string[],
  }
}

export default function GoalsScreen() {
  const goals = useStore((s) => s.goals)
  const habits = useStore((s) => s.habits)
  const entries = useStore((s) => s.entries)
  const activeHabits = useStore((s) => s.habits)
  const createGoal = useStore((s) => s.createGoal)
  const updateGoal = useStore((s) => s.updateGoal)
  const deleteGoal = useStore((s) => s.deleteGoal)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [draft, setDraft] = useState(emptyDraft())
  const [error, setError] = useState('')

  const today = Date.now()
  const sorted = useMemo(
    () => [...goals].sort((a, b) => Number(!!a.completedAt) - Number(!!b.completedAt)),
    [goals],
  )

  const openGoal = (g: Goal | null) => {
    setEditing(g)
    setError('')
    if (g) {
      setDraft({
        name: g.name,
        measure: g.measure,
        targetValue: String(g.targetValue),
        targetDate: g.targetDate ? new Date(g.targetDate).toISOString().slice(0, 10) : '',
        linkedHabitIds: [...g.linkedHabitIds],
      })
    } else {
      setDraft(emptyDraft())
    }
    setOpen(true)
  }

  const save = async () => {
    if (!draft.name.trim()) {
      setError('Give the goal a name.')
      return
    }
    const targetValue = parseFloat(draft.targetValue.replace(',', '.'))
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      setError('Set a target value greater than zero.')
      return
    }
    const payload = {
      name: draft.name.trim(),
      measure: draft.measure,
      targetValue,
      targetDate: draft.targetDate ? new Date(`${draft.targetDate}T23:59:59`).getTime() : undefined,
      linkedHabitIds: draft.linkedHabitIds,
    }
    if (editing) {
      await updateGoal(editing.id, payload)
    } else {
      await createGoal(payload)
    }
    setOpen(false)
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>Goals</h1>
        <button className="btn" onClick={() => openGoal(null)}>
          + New goal
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="card empty">
          <div className="big">🎯</div>
          <b>Set a goal</b>
          <p style={{ margin: 0 }}>
            Link one or more habits to a target — run a half-marathon, read 12 books, save €1,000.
          </p>
          <button className="btn" onClick={() => openGoal(null)}>
            Create a goal
          </button>
        </div>
      ) : (
        sorted.map((g) => {
          const p = computeGoalProgress(g, activeHabits, entries, today)
          return (
            <div key={g.id} className="card goal-card">
              <div className="goal-title">
                <span>{g.name} {g.completedAt && '✓'}</span>
                <div className="row">
                  <button className="btn ghost small" onClick={() => openGoal(g)}>
                    Edit
                  </button>
                  <button className="btn ghost small" onClick={() => deleteGoal(g.id)}>
                    Delete
                  </button>
                </div>
              </div>
              <div className="row">
                <ProgressRing
                  pct={p.pct}
                  color={g.completedAt ? 'var(--green)' : 'var(--accent)'}
                  size={72}
                  stroke={8}
                >
                  {Math.round(p.pct)}%
                </ProgressRing>
                <div className="grow">
                  <div className="text-s text-muted">{MEASURE_LABELS[g.measure]}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', margin: '2px 0' }}>
                    {formatNumber(p.current)} / {formatNumber(p.target)}
                  </div>
                  <div className="text-s text-faint">
                    {p.kind === 'quantity' ? 'amount logged' : p.kind === 'streak' ? 'day streak' : 'completions'}
                    {g.targetDate && ` · due ${new Date(g.targetDate).toLocaleDateString()}`}
                  </div>
                  {p.completed && !g.completedAt && (
                    <div className="text-s text-green">Target reached — congrats! 🎉</div>
                  )}
                </div>
              </div>
              {g.linkedHabitIds.length === 0 && (
                <div className="text-s text-faint">No habits linked yet.</div>
              )}
            </div>
          )
        })
      )}

      <Modal open={open} title={editing ? 'Edit goal' : 'New goal'} onClose={() => setOpen(false)}>
        <div className="sheet-form">
          <div className="field">
            <label>Name *</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Read 12 books this year"
            />
          </div>
          <div className="field">
            <label>Measure</label>
            <select
              value={draft.measure}
              onChange={(e) => setDraft({ ...draft, measure: e.target.value as GoalMeasure })}
            >
              <option value="completionCount">{MEASURE_LABELS.completionCount}</option>
              <option value="quantitySum">{MEASURE_LABELS.quantitySum}</option>
              <option value="streakLength">{MEASURE_LABELS.streakLength}</option>
            </select>
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Target value *</label>
              <input
                type="number"
                inputMode="decimal"
                value={draft.targetValue}
                onChange={(e) => setDraft({ ...draft, targetValue: e.target.value })}
                placeholder="12"
              />
            </div>
            <div className="field">
              <label>Deadline (optional)</label>
              <input
                type="date"
                value={draft.targetDate}
                onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label>Link habits</label>
            {habits.length === 0 ? (
              <p className="text-s text-faint" style={{ margin: 0 }}>
                Create a habit first, then link it here.
              </p>
            ) : (
              <div className="list-plain" style={{ maxHeight: 180, overflowY: 'auto' }}>
                {habits.map((h) => (
                  <label key={h.id} className="list-row checkbox-line" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      style={{ width: 'auto' }}
                      checked={draft.linkedHabitIds.includes(h.id)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          linkedHabitIds: e.target.checked
                            ? [...draft.linkedHabitIds, h.id]
                            : draft.linkedHabitIds.filter((x) => x !== h.id),
                        })
                      }
                    />
                    <span className="title">{h.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {error && <div className="text-s" style={{ color: 'var(--red)' }}>{error}</div>}
          <button className="btn btn-block" onClick={save}>
            {editing ? 'Save goal' : 'Create goal'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1)
}