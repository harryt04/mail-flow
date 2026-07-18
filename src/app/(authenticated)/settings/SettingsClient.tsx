'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { IconAlert, IconCheck } from '@/components/ui/icons'
import { ToggleGroup } from '@/components/settings/ToggleGroup'
import { useTheme, type ThemePreference } from '@/hooks/useTheme'
import {
  PLAYBACK_SPEEDS,
  type InboxScope,
  type InboxOrder,
  type PlaybackSpeed,
  type UserSettings,
} from '@/lib/types'

const SPEED_LABELS: Record<PlaybackSpeed, string> = {
  1: '1x',
  1.25: '1.25x',
  1.5: '1.5x',
  1.75: '1.75x',
  2: '2x',
}

type LoadState = 'loading' | 'ready' | 'error'

async function fetchSettings(): Promise<UserSettings> {
  const res = await fetch('/api/settings')
  if (!res.ok) throw new Error('Could not load settings')
  const { settings } = await res.json()
  return settings
}

async function saveSettings(
  patch: Partial<UserSettings>,
): Promise<UserSettings> {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('Could not save settings')
  const { settings } = await res.json()
  return settings
}

export function SettingsClient() {
  const router = useRouter()
  const { preference: themePreference, setTheme } = useTheme()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [voiceToneDraft, setVoiceToneDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [disconnectStep, setDisconnectStep] = useState<
    'idle' | 'confirm' | 'working'
  >('idle')

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setSettings(s)
        setVoiceToneDraft(s.voiceTone ?? '')
        setLoadState('ready')
      })
      .catch((err) => {
        setError(err.message)
        setLoadState('error')
      })
  }, [])

  function flashSaved() {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  async function updateSetting(patch: Partial<UserSettings>) {
    setSaving(true)
    setError(null)
    try {
      const updated = await saveSettings(patch)
      setSettings(updated)
      flashSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  function handleThemeChange(value: ThemePreference) {
    setTheme(value)
    void updateSetting({ theme: value })
  }

  async function handleVoiceToneSave() {
    await updateSetting({ voiceTone: voiceToneDraft.trim() })
  }

  async function handleDisconnect() {
    setDisconnectStep('working')
    setError(null)
    try {
      const res = await fetch('/api/settings/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('Could not disconnect your account')
      await signOut({ redirectTo: '/' })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not disconnect your account',
      )
      setDisconnectStep('idle')
    }
  }

  if (loadState === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-body text-text-secondary">Loading settings…</p>
      </div>
    )
  }

  if (loadState === 'error' || !settings) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-body text-danger">{error}</p>
        <Button variant="secondary" onClick={() => router.push('/home')}>
          Back home
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-6 py-10">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-h1 text-text-primary font-bold">Settings</h1>
        {savedFlash && (
          <Badge tone="positive" icon={<IconCheck className="h-4 w-4" />}>
            Saved
          </Badge>
        )}
      </div>

      {error && <p className="text-body text-danger w-full">{error}</p>}

      <Card className="flex w-full flex-col gap-6">
        <h2 className="text-h2 text-text-primary font-semibold">Inbox</h2>

        <div className="flex flex-col gap-2">
          <p className="text-label text-text-secondary uppercase">
            What to read
          </p>
          <ToggleGroup<InboxScope>
            value={settings.inboxScope}
            options={[
              { value: 'unread', label: 'Unread' },
              { value: 'all', label: 'All mail' },
            ]}
            onChange={(value) => updateSetting({ inboxScope: value })}
            disabled={saving}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-label text-text-secondary uppercase">Order</p>
          <ToggleGroup<InboxOrder>
            value={settings.inboxOrder}
            options={[
              { value: 'oldest', label: 'Oldest first' },
              { value: 'newest', label: 'Newest first' },
            ]}
            onChange={(value) => updateSetting({ inboxOrder: value })}
            disabled={saving}
          />
        </div>

        <p className="text-meta text-text-muted">
          Changing scope or order starts a fresh session the next time you
          listen.
        </p>
      </Card>

      <Card className="flex w-full flex-col gap-4">
        <h2 className="text-h2 text-text-primary font-semibold">
          Playback speed
        </h2>
        <p className="text-body text-text-secondary">
          How fast emails are read aloud. Applies immediately, on the listening
          screen too.
        </p>
        <ToggleGroup<string>
          value={String(settings.playbackSpeed ?? 1)}
          options={PLAYBACK_SPEEDS.map((speed) => ({
            value: String(speed),
            label: SPEED_LABELS[speed],
          }))}
          onChange={(value) =>
            updateSetting({ playbackSpeed: Number(value) as PlaybackSpeed })
          }
          disabled={saving}
        />
      </Card>

      <Card className="flex w-full flex-col gap-4">
        <h2 className="text-h2 text-text-primary font-semibold">Appearance</h2>
        <ToggleGroup<ThemePreference>
          value={themePreference}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={handleThemeChange}
          disabled={saving}
        />
      </Card>

      <Card className="flex w-full flex-col gap-4">
        <h2 className="text-h2 text-text-primary font-semibold">Voice tone</h2>
        <p className="text-body text-text-secondary">
          Optional hint for how emails are read aloud — for example, &quot;a
          little more upbeat&quot; or &quot;slower pace.&quot;
        </p>
        <textarea
          className="rounded-card border-border bg-surface-sunken text-body text-text-primary min-h-20 w-full border p-4"
          placeholder="No special tone — calm and unhurried (default)"
          value={voiceToneDraft}
          onChange={(e) => setVoiceToneDraft(e.target.value)}
          disabled={saving}
        />
        <div>
          <Button
            variant="secondary"
            onClick={handleVoiceToneSave}
            disabled={saving || voiceToneDraft === (settings.voiceTone ?? '')}
          >
            Save
          </Button>
        </div>
      </Card>

      <Card className="flex w-full flex-col gap-4">
        <h2 className="text-h2 text-text-primary font-semibold">Account</h2>
        {disconnectStep === 'idle' && (
          <Button
            variant="danger"
            icon={<IconAlert className="h-5 w-5" />}
            onClick={() => setDisconnectStep('confirm')}
            className="self-start"
          >
            Disconnect Google account
          </Button>
        )}
        {disconnectStep === 'confirm' && (
          <div className="flex flex-col gap-3">
            <p className="text-body text-danger">
              This revokes MailFlow&apos;s access to your Gmail and signs you
              out. You can reconnect any time by signing in again.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setDisconnectStep('idle')}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDisconnect}>
                Yes, disconnect
              </Button>
            </div>
          </div>
        )}
        {disconnectStep === 'working' && (
          <p className="text-body text-text-secondary">Disconnecting…</p>
        )}
      </Card>
    </div>
  )
}
