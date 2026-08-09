import { useEffect, useState } from 'react'
import { useStore } from './store'
import { useReminders } from './reminders'
import NavBar from './components/NavBar'
import Toast from './components/Toast'
import TodayScreen from './screens/TodayScreen'
import DashboardScreen from './screens/DashboardScreen'
import HabitDetailScreen from './screens/HabitDetailScreen'
import HabitFormScreen from './screens/HabitFormScreen'
import GoalsScreen from './screens/GoalsScreen'
import AchievementsScreen from './screens/AchievementsScreen'
import CategoriesScreen from './screens/CategoriesScreen'
import SettingsScreen from './screens/SettingsScreen'

export type Route =
  | { name: 'today' }
  | { name: 'dashboard' }
  | { name: 'habit'; id: string }
  | { name: 'habit-new' }
  | { name: 'habit-edit'; id: string }
  | { name: 'goals' }
  | { name: 'achievements' }
  | { name: 'categories' }
  | { name: 'settings' }

function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  switch (parts[0]) {
    case '':
    case undefined:
      return { name: 'today' }
    case 'dashboard':
      return { name: 'dashboard' }
    case 'habit':
      if (parts[1] === 'new') return { name: 'habit-new' }
      if (parts[1] === 'edit' && parts[2]) return { name: 'habit-edit', id: parts[2] }
      if (parts[1]) return { name: 'habit', id: parts[1] }
      return { name: 'dashboard' }
    case 'goals':
      return { name: 'goals' }
    case 'achievements':
      return { name: 'achievements' }
    case 'categories':
      return { name: 'categories' }
    case 'settings':
      return { name: 'settings' }
    default:
      return { name: 'dashboard' }
  }
}

export function navigate(route: Route): void {
  let path = '/'
  switch (route.name) {
    case 'today':
      path = '/'
      break
    case 'dashboard':
      path = '/dashboard'
      break
    case 'habit':
      path = `/habit/${route.id}`
      break
    case 'habit-new':
      path = '/habit/new'
      break
    case 'habit-edit':
      path = `/habit/edit/${route.id}`
      break
    case 'goals':
      path = '/goals'
      break
    case 'achievements':
      path = '/achievements'
      break
    case 'categories':
      path = '/categories'
      break
    case 'settings':
      path = '/settings'
      break
  }
  window.location.hash = path
}

export default function App() {
  const hydrate = useStore((s) => s.hydrate)
  const initialized = useStore((s) => s.initialized)
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  const reminderFlash = useReminders()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({ immediate: true })
    }).catch(() => {})
  }, [])

  if (!initialized) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: 'var(--text-faint)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.4rem' }}>🌱</div>
          <div style={{ marginTop: 8 }}>Loading…</div>
        </div>
      </div>
    )
  }

  let screen: React.ReactNode
  switch (route.name) {
    case 'today':
      screen = <TodayScreen />
      break
    case 'dashboard':
      screen = <DashboardScreen />
      break
    case 'habit':
      screen = <HabitDetailScreen habitId={route.id} />
      break
    case 'habit-new':
      screen = <HabitFormScreen />
      break
    case 'habit-edit':
      screen = <HabitFormScreen habitId={route.id} />
      break
    case 'goals':
      screen = <GoalsScreen />
      break
    case 'achievements':
      screen = <AchievementsScreen />
      break
    case 'categories':
      screen = <CategoriesScreen />
      break
    case 'settings':
      screen = <SettingsScreen />
      break
  }

  return (
    <>
      <NavBar route={route} />
      <main className="app">{screen}</main>
      <Toast />
      {reminderFlash && (
        <div className="toast" role="status">
          {reminderFlash}
        </div>
      )}
    </>
  )
}