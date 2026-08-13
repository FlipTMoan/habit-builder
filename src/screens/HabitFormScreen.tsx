import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Frequency, Habit, QuantityKind } from '../types'
import { navigate } from '../App'

interface Draft {
  name: string
  description: string
  type: Habit['type']
  quantityKind: QuantityKind
  targetValue: string
  targetUnit: string
  categoryId: string | null
  freqKind: Frequency['kind']
  daysOfWeek: number[]
  intervalDays: string
  timesPerPeriod: string
  customMode: 'days' | 'interval' | 'timesPerWeek'
  appLinks: { label: string; url: string }[]
  notificationEnabled: boolean
  notificationTimes: string[]
  goalIds: string[]
}

function parseDuration(input: string): number {
  const s = input.trim()
  if (s.includes(':')) {
    const parts = s.split(':')
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10) || 0
      const secs = parseInt(parts[1], 10) || 0
      return mins * 60 + secs
    }
    if (parts.length === 3) {
      const hrs = parseInt(parts[0], 10) || 0
      const mins = parseInt(parts[1], 10) || 0
      const secs = parseInt(parts[2], 10) || 0
      return hrs * 3600 + mins * 60 + secs
    }
  }
  return parseFloat(s.replace(',', '.')) || 0
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fromHabit(habit?: Habit): Draft {
  const freq = habit?.frequency
  let customMode: Draft['customMode'] = 'days'
  if (freq?.kind === 'custom') {
    if (freq.timesPerPeriod && freq.timesPerPeriod > 0) customMode = 'timesPerWeek'
    else if (freq.intervalDays && freq.intervalDays > 0) customMode = 'interval'
    else customMode = 'days'
  }
  return {
    name: habit?.name ?? '',
    description: habit?.description ?? '',
    type: habit?.type ?? 'binary',
    quantityKind: habit?.quantityKind ?? 'count',
    targetValue: habit?.target?.value != null ? String(habit.target.value) : '',
    targetUnit: habit?.target?.unit ?? '',
    categoryId: habit?.categoryId ?? null,
    freqKind: habit?.frequency.kind ?? 'daily',
    daysOfWeek: habit?.frequency.daysOfWeek ?? [1, 3, 5],
    intervalDays: habit?.frequency.intervalDays?.toString() ?? '3',
    timesPerPeriod: habit?.frequency.timesPerPeriod?.toString() ?? '3',
    customMode,
    appLinks: habit?.appLinks ?? [],
    notificationEnabled: habit?.notification.enabled ?? false,
    notificationTimes: habit?.notification.times ?? ['20:00'],
    goalIds: habit?.goalIds ?? [],
  }
}

export default function HabitFormScreen({ habitId }: { habitId?: string }) {
  const habits = useStore((s) => s.habits)
  const categories = useStore((s) => s.categories)
  const goals = useStore((s) => s.goals)
  const createHabit = useStore((s) => s.createHabit)
  const updateHabit = useStore((s) => s.updateHabit)
  const createCategory = useStore((s) => s.createCategory)

  const editing = habitId ? habits.find((h) => h.id === habitId) : undefined
  const [draft, setDraft] = useState<Draft>(() => fromHabit(editing))
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const activeGoals = useMemo(() => goals.filter((g) => !g.completedAt), [goals])

  const toggleDay = (d: number) => {
    const has = draft.daysOfWeek.includes(d)
    set('daysOfWeek', has ? draft.daysOfWeek.filter((x) => x !== d) : [...draft.daysOfWeek, d].sort())
  }

  const addLink = () => {
    if (!linkLabel.trim() || !linkUrl.trim()) return
    const normalized = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
    set('appLinks', [...draft.appLinks, { label: linkLabel.trim(), url: normalized }])
    setLinkLabel('')
    setLinkUrl('')
  }

  const addCategory = async () => {
    const name = newCatName.trim()
    if (!name) return
    const colors = ['#ef4444', '#f97316', '#3b82f6', '#22c55e', '#a855f7', '#06b6d4', '#ec4899', '#eab308']
    const color = colors[Math.floor(Math.random() * colors.length)]
    await createCategory({ name, color, icon: '🏷️' })
    const created = useStore.getState().categories.find((c) => c.name === name)
    set('categoryId', created?.id ?? null)
    setNewCatName('')
    setShowNewCat(false)
  }

  const save = async () => {
    if (!draft.name.trim()) {
      setError('Give the habit a name.')
      return
    }
    const targetValue = draft.quantityKind === 'duration'
      ? parseDuration(draft.targetValue)
      : parseFloat(draft.targetValue.replace(',', '.')) || 1
    const target =
      draft.type === 'quantified'
        ? { value: targetValue, unit: draft.targetUnit.trim() || (draft.quantityKind === 'duration' ? 'min' : 'x') }
        : undefined

    const frequency: Frequency = {
      kind: draft.freqKind,
    }
    if (draft.freqKind === 'custom') {
      if (draft.customMode === 'timesPerWeek') {
        const n = parseInt(draft.timesPerPeriod, 10)
        if (n > 0) {
          frequency.timesPerPeriod = n
        } else {
          frequency.kind = 'daily'
        }
      } else if (draft.customMode === 'interval') {
        const interval = parseInt(draft.intervalDays, 10)
        if (interval > 0) {
          frequency.intervalDays = interval
        } else {
          frequency.kind = 'daily'
        }
      } else {
        if (draft.daysOfWeek.length > 0) {
          frequency.daysOfWeek = draft.daysOfWeek
        } else {
          frequency.kind = 'daily'
        }
      }
    }

    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      type: draft.type,
      quantityKind: draft.type === 'quantified' ? draft.quantityKind : undefined,
      target,
      categoryId: draft.categoryId,
      frequency,
      appLinks: draft.appLinks,
      goalIds: draft.goalIds,
      notification: {
        enabled: draft.notificationEnabled,
        times: draft.notificationEnabled ? draft.notificationTimes : [],
        message: editing?.notification.message,
      },
    }

    if (editing) {
      await updateHabit(editing.id, payload)
      navigate({ name: 'habit', id: editing.id })
    } else {
      const created = await createHabit(payload)
      navigate({ name: 'habit', id: created.id })
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <button className="btn ghost small" onClick={() => navigate(editing ? { name: 'habit', id: editing.id } : { name: 'dashboard' })}>
          ← Back
        </button>
        <h1>{editing ? 'Edit habit' : 'New habit'}</h1>
      </div>

      <div className="card">
        <h2>Basics</h2>
        <div className="sheet-form">
          <div className="field">
            <label>Name *</label>
            <input
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Read 20 pages"
            />
          </div>
          <div className="field">
            <label>Description (optional)</label>
            <textarea
              rows={2}
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Why this habit matters to you…"
            />
          </div>
          <div className="field">
            <label>Type</label>
            <div className="seg">
              <button className={draft.type === 'binary' ? 'active' : ''} onClick={() => set('type', 'binary')}>
                Done / not done
              </button>
              <button className={draft.type === 'quantified' ? 'active' : ''} onClick={() => set('type', 'quantified')}>
                Measurable
              </button>
            </div>
          </div>
          {draft.type === 'quantified' && (
            <>
              <div className="field">
                <label>What are you tracking?</label>
                <div className="seg">
                  <button className={draft.quantityKind === 'count' ? 'active' : ''} onClick={() => set('quantityKind', 'count')}>
                    Count / amount
                  </button>
                  <button className={draft.quantityKind === 'duration' ? 'active' : ''} onClick={() => set('quantityKind', 'duration')}>
                    Time / duration
                  </button>
                </div>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>{draft.quantityKind === 'duration' ? 'Target time' : 'Target'}</label>
                  {draft.quantityKind === 'duration' ? (
                    <input
                      value={draft.targetValue}
                      onChange={(e) => set('targetValue', e.target.value)}
                      placeholder="30:00"
                    />
                  ) : (
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={draft.targetValue}
                      onChange={(e) => set('targetValue', e.target.value)}
                      placeholder="20"
                    />
                  )}
                </div>
                <div className="field">
                  <label>Unit</label>
                  <input
                    value={draft.targetUnit}
                    onChange={(e) => set('targetUnit', e.target.value)}
                    placeholder={draft.quantityKind === 'duration' ? 'min' : 'pages'}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Category</h2>
        <div className="field">
          <select value={draft.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value || null)}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
        {showNewCat ? (
          <div className="row" style={{ marginTop: 8 }}>
            <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category name" />
            <button className="btn secondary small" onClick={addCategory}>
              Add
            </button>
            <button className="btn ghost small" onClick={() => setShowNewCat(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn ghost small" style={{ marginTop: 8 }} onClick={() => setShowNewCat(true)}>
            + New category
          </button>
        )}
      </div>

      <div className="card">
        <h2>Frequency</h2>
        <div className="seg">
          <button className={draft.freqKind === 'daily' ? 'active' : ''} onClick={() => set('freqKind', 'daily')}>
            Daily
          </button>
          <button className={draft.freqKind === 'weekly' ? 'active' : ''} onClick={() => set('freqKind', 'weekly')}>
            Weekly
          </button>
          <button className={draft.freqKind === 'monthly' ? 'active' : ''} onClick={() => set('freqKind', 'monthly')}>
            Monthly
          </button>
          <button className={draft.freqKind === 'custom' ? 'active' : ''} onClick={() => set('freqKind', 'custom')}>
            Custom
          </button>
        </div>

        {draft.freqKind === 'custom' && (
          <div className="sheet-form" style={{ marginTop: 12 }}>
            <div className="seg">
              <button className={draft.customMode === 'days' ? 'active' : ''} onClick={() => set('customMode', 'days')}>
                Specific days
              </button>
              <button className={draft.customMode === 'timesPerWeek' ? 'active' : ''} onClick={() => set('customMode', 'timesPerWeek')}>
                N times / week
              </button>
              <button className={draft.customMode === 'interval' ? 'active' : ''} onClick={() => set('customMode', 'interval')}>
                Every N days
              </button>
            </div>

            {draft.customMode === 'days' && (
              <div className="field" style={{ marginTop: 12 }}>
                <label>Pick days of the week</label>
                <div className="days">
                  {DAY_NAMES.map((dn, i) => (
                    <button
                      key={dn}
                      className={draft.daysOfWeek.includes(i) ? 'active' : ''}
                      onClick={() => toggleDay(i)}
                    >
                      {dn}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {draft.customMode === 'timesPerWeek' && (
              <div className="field" style={{ marginTop: 12 }}>
                <label>How many times per week?</label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={draft.timesPerPeriod}
                  onChange={(e) => set('timesPerPeriod', e.target.value)}
                  placeholder="3"
                />
              </div>
            )}

            {draft.customMode === 'interval' && (
              <div className="field" style={{ marginTop: 12 }}>
                <label>Every N days</label>
                <input
                  type="number"
                  min={1}
                  value={draft.intervalDays}
                  onChange={(e) => set('intervalDays', e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {activeGoals.length > 0 && (
        <div className="card">
          <h2>Link to goals</h2>
          <div className="list-plain">
            {activeGoals.map((g) => (
              <label key={g.id} className="list-row checkbox-line" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={draft.goalIds.includes(g.id)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...draft.goalIds, g.id]
                      : draft.goalIds.filter((x) => x !== g.id)
                    set('goalIds', next)
                  }}
                />
                <span className="title">{g.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2>App links</h2>
        <div className="sheet-form">
          <div className="form-grid">
            <div className="field">
              <label>Label</label>
              <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Duolingo" />
            </div>
            <div className="field">
              <label>URL</label>
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="duolingo.com" />
            </div>
          </div>
          <button className="btn secondary small" onClick={addLink}>
            Add link
          </button>
          {draft.appLinks.length > 0 && (
            <div className="list-plain">
              {draft.appLinks.map((l, i) => (
                <div key={i} className="list-row">
                  <span className="title">↗ {l.label}</span>
                  <button className="icon-btn" onClick={() => set('appLinks', draft.appLinks.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Reminder</h2>
        <div className="sheet-form">
          <label className="checkbox-line">
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={draft.notificationEnabled}
              onChange={(e) => set('notificationEnabled', e.target.checked)}
            />
            Remind me with a notification
          </label>
          {draft.notificationEnabled && (
            <div className="field">
              <label>Times</label>
              <div className="row wrap">
                {draft.notificationTimes.map((t, i) => (
                  <input
                    key={i}
                    type="time"
                    style={{ width: 120 }}
                    value={t}
                    onChange={(e) =>
                      set('notificationTimes', draft.notificationTimes.map((x, j) => (j === i ? e.target.value : x)))
                    }
                  />
                ))}
                <button
                  className="btn ghost small"
                  onClick={() => set('notificationTimes', [...draft.notificationTimes, '18:00'])}
                >
                  + time
                </button>
              </div>
              <p className="text-s text-faint" style={{ margin: 0 }}>
                In-app reminders fire only while the app is open.
              </p>
            </div>
          )}
        </div>
      </div>

      {error && <div className="text-s" style={{ color: 'var(--red)' }}>{error}</div>}

      <button className="btn btn-block" style={{ padding: 14 }} onClick={save}>
        {editing ? 'Save changes' : 'Create habit'}
      </button>
    </div>
  )
}