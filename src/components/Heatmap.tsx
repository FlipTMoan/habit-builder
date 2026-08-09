import { startOfDay, startOfWeek } from '../lib/dates'

interface Props {
  /** dayStart ms -> completion level 0..4 */
  data: Map<number, number>
  /** number of weeks to render (oldest at top-left) */
  weeks?: number
}

const WEEKDAYS = ['Mon', 'Wed', 'Fri']

export default function Heatmap({ data, weeks = 21 }: Props) {
  const todayStart = startOfDay(Date.now())
  const mondayOfThisWeek = startOfWeek(todayStart, 1)
  const start = mondayOfThisWeek - (weeks - 1) * 7 * 86_400_000

  const columns: number[][] = []
  const dayMs = 86_400_000
  for (let w = 0; w < weeks; w++) {
    const col = []
    for (let d = 0; d < 7; d++) {
      const ms = start + w * 7 * dayMs + d * dayMs
      col.push(data.get(ms) ?? 0)
    }
    columns.push(col)
  }

  return (
    <div className="heatmap" aria-label="Habit history heatmap">
      <div className="heatmap-labels">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="heatmap-row" style={{ gap: 3 }}>
        {columns.map((col, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {col.map((lvl, j) => (
              <div key={j} className={`heatmap-cell${lvl > 0 ? ` lvl${lvl}` : ''}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}