import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { achievementDef } from '../lib/achievements'

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

  const firstDef = achievementDef(lastUnlocked[0].key)
  const text =
    lastUnlocked.length === 1 && firstDef
      ? `${firstDef.icon} ${firstDef.name} unlocked!`
      : `${lastUnlocked.length} achievements unlocked!`

  return (
    <div className="toast" role="status">
      {text}
    </div>
  )
}
