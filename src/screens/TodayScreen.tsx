import { useMemo } from 'react'
import { useStore } from '../store'
import { PRESET_HABITS } from '../seed'
import HabitRow from '../components/HabitRow'
import { navigate } from '../App'
import { startOfDay } from '../lib/dates'

export default function TodayScreen() {
  const habits = useStore((s) => s.habits)
  const entries = useStore((s) => s.entries)
  const statusFor = useStore((s) => s.statusFor)
  const importPreset = useStore((s) => s.importPreset)

  const active = useMemo(() => habits.filter((h) => !h.archivedAt), [habits])
  const due = active.filter((h) => statusFor(h.id).due)
  const todayStart = startOfDay(Date.now())

  const doneCount = entries.filter((e) => e.timestamp >= todayStart).length
  const weekday = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <div className="text-muted text-s">{weekday}</div>
          <h1 style={{ margin: 0 }}>Today</h1>
        </div>
        <button className="btn" onClick={() => navigate({ name: 'habit-new' })}>
          + New habit
        </button>
      </div>

      {active.length === 0 ? (
        <div className="card empty">
          <div className="big">🌱</div>
          <b>Start building habits</b>
          <p style={{ margin: 0 }}>Pick a preset or create your own — it takes under a minute.</p>
          <div className="chips" style={{ justifyContent: 'center', marginTop: 4 }}>
            {PRESET_HABITS.slice(0, 6).map((p) => (
              <button key={p.name} className="chip" onClick={() => importPreset(p.name)}>
                + {p.name}
              </button>
            ))}
          </div>
          <button
            className="btn"
            style={{ marginTop: 8 }}
            onClick={() => navigate({ name: 'habit-new' })}
          >
            Create custom habit
          </button>
        </div>
      ) : (
        <>
          <div className="overview-strip">
            <div className="overview-stat">
              <b>{due.length}</b>
              <span>due today</span>
            </div>
            <div className="overview-stat">
              <b>{doneCount}</b>
              <span>logged today</span>
            </div>
            <div className="overview-stat">
              <b>{active.filter((h) => statusFor(h.id).done).length}</b>
              <span>completed</span>
            </div>
          </div>

          {due.length > 0 && (
            <div className="card">
              <h2>Due now</h2>
              <div className="habit-list">
                {due.map((h) => (
                  <HabitRow key={h.id} habit={h} />
                ))}
              </div>
            </div>
          )}

          {(doneCount > 0 || due.length === 0) && (
            <div className="card">
              <h2>Your habits</h2>
              <div className="habit-list">
                {active.map((h) => (
                  <HabitRow key={h.id} habit={h} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}