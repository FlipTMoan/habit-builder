import { useMemo } from 'react'
import { useStore } from '../store'
import { computeStreak } from '../lib/streaks'
import HabitRow from '../components/HabitRow'
import ProgressRing from '../components/ProgressRing'
import { computeGoalProgress } from '../lib/goals'
import { navigate } from '../App'
import { startOfDay } from '../lib/dates'

export default function DashboardScreen() {
  const habits = useStore((s) => s.habits)
  const goals = useStore((s) => s.goals)
  const entries = useStore((s) => s.entries)
  const categories = useStore((s) => s.categories)

  const active = useMemo(() => habits.filter((h) => !h.archivedAt), [habits])
  const today = Date.now()

  const bestStreak = useMemo(() => {
    let best = 0
    for (const h of active) {
      const s = computeStreak(h, entries.filter((e) => e.habitId === h.id), today)
      best = Math.max(best, s.current)
    }
    return best
  }, [active, entries])

  const doneToday = useMemo(
    () => entries.filter((e) => e.timestamp >= startOfDay(today)).length,
    [entries],
  )

  const openGoals = goals.filter((g) => !g.completedAt)
  const goalProgress = useMemo(
    () => openGoals.map((g) => computeGoalProgress(g, active, entries, today)),
    [openGoals, active, entries],
  )

  const byCategory = useMemo(() => {
    const map = new Map<string | null, typeof active>()
    for (const h of active) {
      const list = map.get(h.categoryId) ?? []
      list.push(h)
      map.set(h.categoryId, list)
    }
    return map
  }, [active])

  return (
    <div className="page">
      <div className="topbar">
        <h1>Habits</h1>
        <button className="btn" onClick={() => navigate({ name: 'habit-new' })}>
          + New habit
        </button>
      </div>

      <div className="overview-strip">
        <div className="overview-stat">
          <b>{active.length}</b>
          <span>{active.length === 1 ? 'active habit' : 'active habits'}</span>
        </div>
        <div className="overview-stat">
          <b>🔥 {bestStreak}</b>
          <span>best streak</span>
        </div>
        <div className="overview-stat">
          <b>{doneToday}</b>
          <span>done today</span>
        </div>
      </div>

      {openGoals.length > 0 && (
        <div className="card">
          <h2>Goal progress</h2>
          <div className="page" style={{ gap: 10 }}>
            {openGoals.slice(0, 3).map((g, i) => {
              const p = goalProgress[i]
              return (
                <div key={g.id} className="row" onClick={() => navigate({ name: 'goals' })} style={{ cursor: 'pointer' }}>
                  <ProgressRing pct={p.pct} size={56} stroke={7} color={p.completed ? 'var(--green)' : 'var(--accent)'}>
                    {Math.round(p.pct)}%
                  </ProgressRing>
                  <div className="grow">
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{g.name}</div>
                    <div className="text-muted text-s">
                      {Math.floor(p.pct)}% · {Math.round(p.current)}/{p.target}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {active.length === 0 ? (
        <div className="card empty">
          <div className="big">🧘</div>
          <b>No habits yet</b>
          <p style={{ margin: 0 }}>Create your first habit and start a streak today.</p>
          <button className="btn" onClick={() => navigate({ name: 'habit-new' })}>
            Create a habit
          </button>
        </div>
      ) : (
        [...byCategory.entries()].map(([catId, habitList]) => {
          const cat = categories.find((c) => c.id === catId)
          return (
            <div key={catId ?? 'uncategorised'} className="card">
              <h2>
                {cat && <span className="cat-dot" style={{ background: cat.color }} />}
                {cat?.name ?? 'Uncategorised'}
              </h2>
              <div className="habit-list">
                {habitList.map((h) => (
                  <HabitRow key={h.id} habit={h} />
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}