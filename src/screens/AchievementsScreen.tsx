import { useMemo } from 'react'
import { useStore } from '../store'
import { ACHIEVEMENT_DEFS } from '../lib/achievements'
import { computeStreak } from '../lib/streaks'

function useAchievementProgress(): Map<string, { current: number; target: number }> {
  const habits = useStore((s) => s.habits)
  const goals = useStore((s) => s.goals)
  const entries = useStore((s) => s.entries)
  const settings = useStore((s) => s.settings)

  return useMemo(() => {
    const map = new Map<string, { current: number; target: number }>()
    const freezeLog = settings?.freezeLog ?? []
    const activeHabits = habits.filter((h) => !h.archivedAt)
    const totalCompletions = entries.length
    const streaks = activeHabits.map((h) =>
      computeStreak(h, entries.filter((e) => e.habitId === h.id), Date.now(), freezeLog),
    )
    const bestStreak = streaks.reduce((max, s) => Math.max(max, s.current), 0)
    const completedGoals = goals.filter((g) => g.completedAt).length

    map.set('first_habit', { current: Math.min(habits.length, 1), target: 1 })
    map.set('three_habits', { current: Math.min(activeHabits.length, 3), target: 3 })
    map.set('five_habits', { current: Math.min(activeHabits.length, 5), target: 5 })
    map.set('ten_completions', { current: Math.min(totalCompletions, 10), target: 10 })
    map.set('centurion', { current: Math.min(totalCompletions, 100), target: 100 })
    map.set('committed', { current: Math.min(bestStreak, 7), target: 7 })
    map.set('tenthkept', { current: Math.min(bestStreak, 14), target: 14 })
    map.set('habitual', { current: Math.min(bestStreak, 30), target: 30 })
    map.set('goal_getter', { current: Math.min(completedGoals, 1), target: 1 })
    map.set('goals_three', { current: Math.min(completedGoals, 3), target: 3 })
    map.set('comeback', { current: 0, target: 1 })
    map.set('early_bird', { current: entries.some((e) => new Date(e.timestamp).getHours() < 7) ? 1 : 0, target: 1 })
    map.set('night_owl', { current: entries.some((e) => new Date(e.timestamp).getHours() >= 22) ? 1 : 0, target: 1 })
    map.set('first_goal', { current: Math.min(goals.length, 1), target: 1 })

    return map
  }, [habits, goals, entries, settings])
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = Math.round((current / target) * 100)
  return (
    <div style={{ width: '100%', marginTop: 4 }}>
      <div className="progress-bar">
        <div style={{ width: `${pct}%` }} />
      </div>
      <div className="text-s text-faint" style={{ marginTop: 2 }}>
        {current}/{target}
      </div>
    </div>
  )
}

export default function AchievementsScreen() {
  const achievements = useStore((s) => s.achievements)
  const progress = useAchievementProgress()
  const owned = new Map(achievements.map((a) => [a.key, a.unlockedAt]))

  return (
    <div className="page">
      <div className="topbar">
        <h1>Achievements</h1>
        <div className="text-s text-muted">
          {owned.size}/{ACHIEVEMENT_DEFS.length} unlocked
        </div>
      </div>

      <div className="achievement-gallery">
        {ACHIEVEMENT_DEFS.map((d) => {
          const unlockedAt = owned.get(d.key)
          const prog = progress.get(d.key)
          return (
            <div key={d.key} className={`achievement ${unlockedAt ? '' : 'locked'}`}>
              <div className="icon">{d.icon}</div>
              <div className="name">{d.name}</div>
              <div className="desc">{d.description}</div>
              {unlockedAt ? (
                <div className="date">
                  {new Date(unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              ) : prog && prog.current < prog.target ? (
                <ProgressBar current={prog.current} target={prog.target} />
              ) : (
                <div className="date">🔒 locked</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
