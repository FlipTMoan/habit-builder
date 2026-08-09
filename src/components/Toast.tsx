import { useEffect, useState } from 'react'
import { useStore } from '../store'

export default function Toast() {
  const lastUnlocked = useStore((s) => s.lastUnlocked)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (lastUnlocked.length === 0) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(t)
  }, [lastUnlocked])

  if (!visible || lastUnlocked.length === 0) return null

  return (
    <div className="toast" role="status">
      🎉 {lastUnlocked.length > 1 ? `${lastUnlocked.length} achievements` : 'Achievement'} unlocked!
    </div>
  )
}