import { startOfDay, startOfWeek } from '../lib/dates'

interface Props {
  /** dayStart ms -> completion level 0..4 */
  data: Map<number, number>
  /** number of weeks to render (oldest at top-left) */
  weeks?: number
}

const WEEKDAYS = ['Mon', 'Wed', 'Fri']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Heatmap({ data, weeks = 21 }: Props) {
  const todayStart = startOfDay(Date.now())
  const mondayOfThisWeek = startOfWeek(todayStart, 1)
  const start = mondayOfThisWeek - (weeks - 1) * 7 * 86_400_000

  const columns: { cells: number[]; weekStart: number }[] = []
  const dayMs = 86_400_000
  for (let w = 0; w < weeks; w++) {
    const col = []
    const weekStart = start + w * 7 * dayMs
    for (let d = 0; d < 7; d++) {
      const ms = weekStart + d * dayMs
      col.push(data.get(ms) ?? 0)
    }
    columns.push({ cells: col, weekStart })
  }

  // Compute month labels: show month name when the week starts in a new month
  const monthLabels: { label: string; colIndex: number }[] = []
  let lastMonth = -1
  columns.forEach((col, i) => {
    const d = new Date(col.weekStart)
    const m = d.getMonth()
    if (m !== lastMonth) {
      monthLabels.push({ label: MONTHS[m], colIndex: i })
      lastMonth = m
    }
  })

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="heatmap" aria-label="Habit history heatmap">
      <div className="heatmap-months">
        {monthLabels.map((ml, i) => (
          <span key={i} style={{ marginLeft: i === 0 ? 28 : 0 }}>
            {ml.label}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <div className="heatmap-labels">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="heatmap-row" style={{ gap: 3 }}>
          {columns.map((col, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {col.cells.map((lvl, j) => {
                const dayMs2 = col.weekStart + j * dayMs
                return (
                  <div
                    key={j}
                    className={`heatmap-cell${lvl > 0 ? ` lvl${lvl}` : ''}`}
                    title={lvl > 0 ? `${formatDate(dayMs2)} — ${lvl} habit${lvl > 1 ? 's' : ''}` : formatDate(dayMs2)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
