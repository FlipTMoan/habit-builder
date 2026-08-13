import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { achievementDef } from '../lib/achievements'

export default function Toast() {
  const lastUnlocked = useStore((s) => s.lastUnlocked)
  const toastMessage = useStore((s) => s.toastMessage)
  const [visible, setVisible] = useState(false)
  const [text, setText] = useState('')

  useEffect(() => {
    if (toastMessage) {
      setText(toastMessage)
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 4000)
      return () => clearTimeout(t)
    }
    if (lastUnlocked.length > 0) {
      const firstDef = achievementDef(lastUnlocked[0].key)
      setText(
        lastUnlocked.length === 1 && firstDef
          ? `${firstDef.icon} ${firstDef.name} unlocked!`
          : `${lastUnlocked.length} achievements unlocked!`,
      )
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 4000)
      return () => clearTimeout(t)
    }
  }, [lastUnlocked, toastMessage])

  if (!visible || !text) return null

  return (
    <div className="toast" role="status">
      {text}
    </div>
  )
}
