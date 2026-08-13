import { startOfDay, startOfWeek, addDays } from '../lib/dates'

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
  const start = addDays(mondayOfThisWeek, (weeks - 1) * -7)

  const columns: { cells: number[]; weekStart: number }[] = []
  for (let w = 0; w < weeks; w++) {
    const col = []
    const weekStart = addDays(start, w * 7)
    for (let d = 0; d < 7; d++) {
      const ms = addDays(weekStart, d)
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
                const dayMs = addDays(col.weekStart, j)
                return (
                  <div
                    key={j}
                    className={`heatmap-cell${lvl > 0 ? ` lvl${lvl}` : ''}`}
                    title={lvl > 0 ? `${formatDate(dayMs)} — ${lvl} habit${lvl > 1 ? 's' : ''}` : formatDate(dayMs)}
                    aria-label={`${formatDate(dayMs)}: ${lvl > 0 ? `${lvl} completion${lvl > 1 ? 's' : ''}` : 'no completions'}`}
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
