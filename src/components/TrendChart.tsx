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
            `${value}${data[0]?.unit ? ` ${data[0].unit}` : '×'}`,
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