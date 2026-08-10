import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

export interface TrendPoint {
  label: string
  value: number
  unit?: string
}

function formatTooltipValue(v: number, unit?: string): string {
  if (unit === 'min' || unit === 'sec' || unit === 'hr') {
    const totalSec = unit === 'min' ? v * 60 : unit === 'hr' ? v * 3600 : v
    const m = Math.floor(totalSec / 60)
    const s = Math.round(totalSec % 60)
    if (m === 0) return `${s}s`
    return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`
  }
  return `${Number.isInteger(v) ? v : v.toFixed(1)}${unit ? ` ${unit}` : '×'}`
}

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length < 2) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.82rem', padding: 16 }}>
        Not enough data yet — keep going!
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="var(--border-muted)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--border-muted)' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          domain={[0, 'auto']}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--bg-soft)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            color: 'var(--text)',
            fontSize: 12,
          }}
          labelStyle={{ color: 'var(--text-muted)' }}
          formatter={(value: number) => [
            `${formatTooltipValue(value, data[0]?.unit)}`,
            'Progress',
          ]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--accent)' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}