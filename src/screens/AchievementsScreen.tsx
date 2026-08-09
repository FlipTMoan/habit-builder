import { useStore } from '../store'
import { ACHIEVEMENT_DEFS } from '../lib/achievements'

export default function AchievementsScreen() {
  const achievements = useStore((s) => s.achievements)
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
          return (
            <div key={d.key} className={`achievement ${unlockedAt ? '' : 'locked'}`}>
              <div className="icon">{d.icon}</div>
              <div className="name">{d.name}</div>
              <div className="desc">{d.description}</div>
              {unlockedAt ? (
                <div className="date">
                  {new Date(unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
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