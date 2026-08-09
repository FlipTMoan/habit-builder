interface Props {
  pct: number // 0..100
  size?: number
  stroke?: number
  color?: string
  children?: React.ReactNode
}

export default function ProgressRing({ pct, size = 120, stroke = 10, color = 'var(--accent)', children }: Props) {
  const clamped = Math.max(0, Math.min(100, pct))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (clamped / 100) * c
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${Math.round(clamped)}%`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--border-muted)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
      {children && (
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="var(--text)" fontWeight="700">
          {children}
        </text>
      )}
    </svg>
  )
}