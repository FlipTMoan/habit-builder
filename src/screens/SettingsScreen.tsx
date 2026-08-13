import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { enableNotifications } from '../reminders'
import { getDeviceId } from '../db'
import { navigate } from '../App'

export default function SettingsScreen() {
  const exportJSON = useStore((s) => s.exportJSON)
  const importJSON = useStore((s) => s.importJSON)
  const categories = useStore((s) => s.categories)
  const fileRef = useRef<HTMLInputElement>(null)
  const [deviceId, setDeviceId] = useState('')
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')

  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  }

  useEffect(() => {
    getDeviceId().then(setDeviceId)
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const doExport = async () => {
    const json = await exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `habit-builder-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const doImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        await importJSON(String(reader.result), importMode)
      } catch {
        alert('Import failed — is this a valid Habit Builder backup file?')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>Settings</h1>
      </div>

      <div className="card">
        <h2>Install & offline</h2>
        <p className="text-s text-muted" style={{ margin: 0 }}>
          Habit Builder works fully offline. Install it to your home screen for quick access.
        </p>
        {installEvent ? (
          <button
            className="btn"
            style={{ marginTop: 10 }}
            onClick={async () => {
              await installEvent.prompt()
              setInstallEvent(null)
            }}
          >
            Install app
          </button>
        ) : (
          <p className="text-s text-faint" style={{ marginTop: 10, marginBottom: 0 }}>
            You can install from your browser menu (Add to Home Screen / Install).
          </p>
        )}
      </div>

      <div className="card">
        <h2>Reminders</h2>
        <p className="text-s text-muted" style={{ margin: 0 }}>
          In-app reminders fire while the app is open. Allow browser notifications to get them even when it's in the
          background.
        </p>
        <button
          className="btn secondary"
          style={{ marginTop: 10 }}
          onClick={() => enableNotifications()}
        >
          Allow notifications
        </button>
      </div>

      <div className="card">
        <h2>Backup</h2>
        <p className="text-s text-muted" style={{ margin: 0 }}>
          All data lives on this device. Export a JSON backup and import it on another device to move your data there.
        </p>
        <div className="row" style={{ marginTop: 12, alignItems: 'center' }}>
          <button className="btn secondary" onClick={doExport}>
            Export backup (JSON)
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
              style={{ fontSize: '0.8rem', padding: '4px 6px' }}
            >
              <option value="merge">Merge</option>
              <option value="replace">Replace</option>
            </select>
            <button className="btn secondary" onClick={() => fileRef.current?.click()}>
              Import backup
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) doImport(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      <div className="card">
        <h2>Data</h2>
        <div className="list-plain">
          <div className="list-row">
            <span className="title">Categories</span>
            <span className="text-s text-muted">{categories.length}</span>
          </div>
          <div className="list-row">
            <span className="title">Device ID</span>
            <span className="text-s text-faint">{deviceId.slice(0, 8)}…</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>About</h2>
        <p className="text-s text-muted" style={{ margin: 0 }}>
          Habit Builder is a local-first habit tracker. Your habit data never leaves this device — there is no server,
          no tracking, no account.
        </p>
        <button
          className="btn ghost small"
          style={{ marginTop: 10 }}
          onClick={() => navigate({ name: 'dashboard' })}
        >
          Back to habits
        </button>
      </div>
    </div>
  )
}