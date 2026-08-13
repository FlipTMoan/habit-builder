import { useMemo } from 'react'
import { useStore } from '../store'
import { PRESET_HABITS } from '../seed'
import HabitRow from '../components/HabitRow'
import { navigate } from '../App'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function TodayScreen() {
  const habits = useStore((s) => s.habits)
  const statusFor = useStore((s) => s.statusFor)
  const importPreset = useStore((s) => s.importPreset)

  const active = useMemo(() => habits.filter((h) => !h.archivedAt), [habits])
  const dueHabits = useMemo(() => active.filter((h) => statusFor(h.id).due && !statusFor(h.id).done), [active, statusFor])
  const completedHabits = useMemo(() => active.filter((h) => statusFor(h.id).done), [active, statusFor])
  const totalDue = dueHabits.length
  const completedCount = completedHabits.length
  const pct = totalDue > 0 ? Math.round((completedCount / (completedCount + totalDue)) * 100) : 0

  const weekday = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const motivationalMsg = useMemo(() => {
    if (active.length === 0) return null
    if (totalDue === 0 && completedCount === 0) return 'No habits due today — enjoy your day!'
    if (totalDue === 0) return 'All done! Great work today 🎉'
    if (completedCount > 0) return `${totalDue} left — you got this!`
    return `${totalDue} habits waiting for you — let's go!`
  }, [active.length, totalDue, completedCount])

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <div className="text-muted text-s">{weekday}</div>
          <h1 style={{ margin: 0 }}>{getGreeting()} 👋</h1>
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
          {(completedCount > 0 || totalDue > 0) && (
            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="text-s text-muted">
                  {completedCount}/{completedCount + totalDue} completed
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{pct}%</span>
              </div>
              <div className="progress-bar">
                <div style={{ width: `${pct}%`, background: pct === 100 ? 'var(--green)' : 'var(--accent)' }} />
              </div>
              {motivationalMsg && (
                <div className="text-s text-muted" style={{ marginTop: 8 }}>
                  {motivationalMsg}
                </div>
              )}
            </div>
          )}

          {dueHabits.length > 0 && (
            <div className="card">
              <h2>Due now</h2>
              <div className="habit-list">
                {dueHabits.map((h) => (
                  <HabitRow key={h.id} habit={h} />
                ))}
              </div>
            </div>
          )}

          {completedHabits.length > 0 && (
            <div className="card">
              <h2>Completed</h2>
              <div className="habit-list">
                {completedHabits.map((h) => (
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
