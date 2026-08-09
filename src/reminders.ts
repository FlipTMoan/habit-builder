import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import { windowForDay } from './lib/streaks'

export function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return Promise.resolve(false)
  if (Notification.permission === 'granted') return Promise.resolve(true)
  return Notification.requestPermission().then((p) => p === 'granted')
}

function nowHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Fires per-habit reminders while the app is open. If browser notifications are
 * granted a real notice is shown; otherwise an in-app "flash" toast is returned.
 */
export function useReminders(): string | null {
  const habits = useStore((s) => s.habits)
  const [flash, setFlash] = useState<string | null>(null)
  const fired = useRef(new Set<string>())
  const permission = useRef<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported',
  )

  useEffect(() => {
    const check = () => {
      const now = new Date()
      const hhmm = nowHHMM(now)
      permission.current = 'Notification' in window ? Notification.permission : 'unsupported'
      for (const habit of habits) {
        if (!habit.notification?.enabled) continue
        if (habit.archivedAt) continue
        const win = windowForDay(now.getTime(), habit.frequency, habit.createdAt)
        if (!win) continue
        for (const t of habit.notification.times) {
          const key = `${habit.id}:${t}`
          if (t !== hhmm) continue
          if (fired.current.has(key)) continue
          fired.current.add(key)
          const text = habit.notification.message || `Time to ${habit.name.toLowerCase()}`
          const allowed = permission.current === 'granted'
          if (allowed && 'Notification' in window) {
            try {
              new Notification(habit.name, {
                body: text,
                tag: `habit-${habit.id}-${hhmm}`,
              })
            } catch {
              setFlash(`⏰ ${habit.name}`)
            }
          } else {
            setFlash(`⏰ ${habit.name}`)
          }
        }
      }
    }
    const iv = setInterval(check, 30_000)
    check()
    return () => clearInterval(iv)
  }, [habits])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 6000)
    return () => clearTimeout(t)
  }, [flash])

  return flash
}

export async function enableNotifications(): Promise<boolean> {
  return requestNotificationPermission()
}