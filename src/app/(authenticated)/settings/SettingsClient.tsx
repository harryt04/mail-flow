'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { IconAlert, IconCheck } from '@/components/ui/icons'
import { ToggleGroup } from '@/components/settings/ToggleGroup'
import { CategoryChecklist } from '@/components/settings/CategoryChecklist'
import { useTheme, type ThemePreference } from '@/hooks/useTheme'
import { translateApiError } from '@/lib/errors/translateApiError'
import {
  PLAYBACK_SPEEDS,
  type InboxScope,
  type InboxOrder,
  type InboxCategory,
  type PlaybackSpeed,
  type UserSettings,
} from '@/lib/types'
import type { GmailLabel } from '@/lib/gmail/labels'

const SPEED_LABELS: Record<PlaybackSpeed, string> = {
  1: '1x',
  1.25: '1.25x',
  1.5: '1.5x',
  1.75: '1.75x',
  2: '2x',
}

type LoadState = 'loading' | 'ready' | 'error'
type OpenAIKeyState = {
  hasKey: boolean
  trialActionsUsed: number
  trialActionsRemaining: number
} | null

type ApiErrorsTranslator = ReturnType<typeof useTranslations<'apiErrors'>>

async function fetchSettings(
  tApiErrors: ApiErrorsTranslator,
  errorMessage: string,
): Promise<UserSettings> {
  const res = await fetch('/api/settings')
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(translateApiError(tApiErrors, payload, errorMessage))
  }
  const { settings } = await res.json()
  return settings
}

async function saveSettings(
  patch: Partial<UserSettings>,
  tApiErrors: ApiErrorsTranslator,
  errorMessage: string,
): Promise<UserSettings> {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(translateApiError(tApiErrors, payload, errorMessage))
  }
  const { settings } = await res.json()
  return settings
}

async function fetchOpenAIKeyState(
  tApiErrors: ApiErrorsTranslator,
  errorMessage: string,
): Promise<OpenAIKeyState> {
  const res = await fetch('/api/settings/openai-key')
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(translateApiError(tApiErrors, payload, errorMessage))
  }
  return res.json()
}

async function saveOpenAIKey(
  apiKey: string,
  tApiErrors: ApiErrorsTranslator,
  errorMessage: string,
): Promise<OpenAIKeyState> {
  const res = await fetch('/api/settings/openai-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(translateApiError(tApiErrors, errorData, errorMessage))
  }
  return res.json()
}

async function deleteOpenAIKey(
  tApiErrors: ApiErrorsTranslator,
  errorMessage: string,
): Promise<void> {
  const res = await fetch('/api/settings/openai-key', {
    method: 'DELETE',
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(translateApiError(tApiErrors, payload, errorMessage))
  }
}

export function SettingsClient() {
  const router = useRouter()
  const { preference: themePreference, setTheme } = useTheme()
  const t = useTranslations('settings')
  const tApiErrors = useTranslations('apiErrors')

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [voiceToneDraft, setVoiceToneDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [disconnectStep, setDisconnectStep] = useState<
    'idle' | 'confirm' | 'working'
  >('idle')
  const [availableLabels, setAvailableLabels] = useState<GmailLabel[]>([])
  const [openAIKeyState, setOpenAIKeyState] = useState<OpenAIKeyState>(null)
  const [openAIKeyDraft, setOpenAIKeyDraft] = useState('')
  const [savingOpenAIKey, setSavingOpenAIKey] = useState(false)
  const [openAIKeyError, setOpenAIKeyError] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings(tApiErrors, t('errors.loadSettings'))
      .then((s) => {
        setSettings(s)
        setVoiceToneDraft(s.voiceTone ?? '')
        setLoadState('ready')
      })
      .catch((err) => {
        setError(err.message)
        setLoadState('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetch('/api/labels')
      .then((res) => (res.ok ? res.json() : { labels: [] }))
      .then((data: { labels?: GmailLabel[] }) =>
        setAvailableLabels(data.labels ?? []),
      )
      .catch(() => setAvailableLabels([]))
  }, [])

  useEffect(() => {
    fetchOpenAIKeyState(tApiErrors, t('errors.loadApiKeyState'))
      .then((state) => setOpenAIKeyState(state))
      .catch((err) => setOpenAIKeyError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function flashSaved() {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  async function updateSetting(patch: Partial<UserSettings>) {
    setSaving(true)
    setError(null)
    try {
      const updated = await saveSettings(
        patch,
        tApiErrors,
        t('errors.saveSettings'),
      )
      setSettings(updated)
      flashSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveSettings'))
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
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(
          translateApiError(tApiErrors, payload, t('errors.disconnect')),
        )
      }
      await signOut({ redirectTo: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.disconnect'))
      setDisconnectStep('idle')
    }
  }

  async function handleSaveOpenAIKey() {
    setSavingOpenAIKey(true)
    setOpenAIKeyError(null)
    try {
      const state = await saveOpenAIKey(
        openAIKeyDraft.trim(),
        tApiErrors,
        t('errors.saveApiKey'),
      )
      setOpenAIKeyState(state)
      setOpenAIKeyDraft('')
      flashSaved()
    } catch (err) {
      setOpenAIKeyError(
        err instanceof Error ? err.message : t('errors.saveApiKey'),
      )
    } finally {
      setSavingOpenAIKey(false)
    }
  }

  async function handleRemoveOpenAIKey() {
    setSavingOpenAIKey(true)
    setOpenAIKeyError(null)
    try {
      await deleteOpenAIKey(tApiErrors, t('errors.removeApiKey'))
      setOpenAIKeyState({
        hasKey: false,
        trialActionsUsed: 0,
        trialActionsRemaining: 100,
      })
      flashSaved()
    } catch (err) {
      setOpenAIKeyError(
        err instanceof Error ? err.message : t('errors.removeApiKey'),
      )
    } finally {
      setSavingOpenAIKey(false)
    }
  }

  if (loadState === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-body text-text-secondary">{t('loading')}</p>
      </div>
    )
  }

  if (loadState === 'error' || !settings) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-body text-danger">{error}</p>
        <Button variant="secondary" onClick={() => router.push('/home')}>
          {t('backHome')}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-4 py-10 sm:px-6">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-h1 text-text-primary font-bold">{t('title')}</h1>
        {savedFlash && (
          <Badge tone="positive" icon={<IconCheck className="h-4 w-4" />}>
            {t('saved')}
          </Badge>
        )}
      </div>

      {error && <p className="text-body text-danger w-full">{error}</p>}

      {openAIKeyState && (
        <Card className="flex w-full flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-h2 text-text-primary font-semibold">
              {t('openAiKey.heading')}
            </h2>
            {openAIKeyState.hasKey && (
              <Badge tone="positive">{t('openAiKey.connected')}</Badge>
            )}
            {!openAIKeyState.hasKey && (
              <Badge>
                {t('openAiKey.freeTrial', {
                  remaining: openAIKeyState.trialActionsRemaining,
                })}
              </Badge>
            )}
          </div>

          <p className="text-body text-text-secondary">
            {t('openAiKey.description')}
          </p>

          {!openAIKeyState.hasKey && (
            <>
              <div className="flex flex-col gap-3">
                <input
                  type="password"
                  className="rounded-card border-border bg-surface-sunken text-body text-text-primary w-full border p-3"
                  placeholder={t('openAiKey.placeholder')}
                  value={openAIKeyDraft}
                  onChange={(e) => setOpenAIKeyDraft(e.target.value)}
                  disabled={savingOpenAIKey}
                />
                <div>
                  <Button
                    variant="secondary"
                    onClick={handleSaveOpenAIKey}
                    disabled={savingOpenAIKey || !openAIKeyDraft.trim()}
                  >
                    {t('openAiKey.save')}
                  </Button>
                </div>
              </div>
              {openAIKeyError && (
                <p className="text-body text-danger">{openAIKeyError}</p>
              )}
            </>
          )}

          {openAIKeyState.hasKey && (
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleRemoveOpenAIKey}
                disabled={savingOpenAIKey}
              >
                {t('openAiKey.removeKey')}
              </Button>
            </div>
          )}
        </Card>
      )}

      <Card className="flex w-full flex-col gap-6">
        <h2 className="text-h2 text-text-primary font-semibold">
          {t('inbox.heading')}
        </h2>

        <div className="flex flex-col gap-2">
          <p className="text-label text-text-secondary uppercase">
            {t('inbox.whatToRead')}
          </p>
          <ToggleGroup<InboxScope>
            value={settings.inboxScope}
            options={[
              { value: 'unread', label: t('inbox.unread') },
              { value: 'all', label: t('inbox.allMail') },
            ]}
            onChange={(value) => updateSetting({ inboxScope: value })}
            disabled={saving}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-label text-text-secondary uppercase">
            {t('inbox.order')}
          </p>
          <ToggleGroup<InboxOrder>
            value={settings.inboxOrder}
            options={[
              { value: 'oldest', label: t('inbox.oldestFirst') },
              { value: 'newest', label: t('inbox.newestFirst') },
            ]}
            onChange={(value) => updateSetting({ inboxOrder: value })}
            disabled={saving}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-label text-text-secondary uppercase">
            {t('inbox.category')}
          </p>
          <ToggleGroup<InboxCategory>
            value={settings.inboxCategory ?? 'primary'}
            options={[
              { value: 'primary', label: t('inbox.primary') },
              { value: 'promotions', label: t('inbox.promotions') },
              { value: 'social', label: t('inbox.social') },
              { value: 'updates', label: t('inbox.updates') },
              { value: 'forums', label: t('inbox.forums') },
              { value: 'all', label: t('inbox.all') },
            ]}
            onChange={(value) => updateSetting({ inboxCategory: value })}
            disabled={saving}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-label text-text-secondary uppercase">
            {t('inbox.focusOnLabel')}
          </p>
          <select
            className="rounded-card border-border bg-surface-sunken text-body text-text-primary w-full border p-3"
            value={settings.inboxLabelId ?? ''}
            onChange={(e) =>
              updateSetting({
                inboxLabelId: (e.target.value || null) as string | undefined,
              })
            }
            disabled={saving}
          >
            <option value="">{t('inbox.noneUseCategory')}</option>
            {availableLabels.map((label) => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))}
          </select>
        </div>

        <p className="text-meta text-text-muted">
          {t('inbox.freshSessionNote')}
        </p>
      </Card>

      <Card className="flex w-full flex-col gap-4">
        <h2 className="text-h2 text-text-primary font-semibold">
          {t('autoSkip.heading')}
        </h2>
        <p className="text-body text-text-secondary">
          {t('autoSkip.description')}
        </p>
        <CategoryChecklist<InboxCategory>
          values={settings.autoSkipCategories ?? []}
          options={[
            { value: 'promotions', label: t('inbox.promotions') },
            { value: 'social', label: t('inbox.social') },
            { value: 'updates', label: t('inbox.updates') },
            { value: 'forums', label: t('inbox.forums') },
          ]}
          onChange={(values) => updateSetting({ autoSkipCategories: values })}
          disabled={saving}
        />
      </Card>

      <Card className="flex w-full flex-col gap-4">
        <h2 className="text-h2 text-text-primary font-semibold">
          {t('playbackSpeed.heading')}
        </h2>
        <p className="text-body text-text-secondary">
          {t('playbackSpeed.description')}
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
        <h2 className="text-h2 text-text-primary font-semibold">
          {t('appearance.heading')}
        </h2>
        <ToggleGroup<ThemePreference>
          value={themePreference}
          options={[
            { value: 'system', label: t('appearance.system') },
            { value: 'light', label: t('appearance.light') },
            { value: 'dark', label: t('appearance.dark') },
          ]}
          onChange={handleThemeChange}
          disabled={saving}
        />
      </Card>

      <Card className="flex w-full flex-col gap-4">
        <h2 className="text-h2 text-text-primary font-semibold">
          {t('voiceTone.heading')}
        </h2>
        <p className="text-body text-text-secondary">
          {t('voiceTone.description')}
        </p>
        <textarea
          className="rounded-card border-border bg-surface-sunken text-body text-text-primary min-h-20 w-full border p-4"
          placeholder={t('voiceTone.placeholder')}
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
            {t('openAiKey.save')}
          </Button>
        </div>
      </Card>

      <Card className="flex w-full flex-col gap-4">
        <h2 className="text-h2 text-text-primary font-semibold">
          {t('account.heading')}
        </h2>
        {disconnectStep === 'idle' && (
          <Button
            variant="danger"
            icon={<IconAlert className="h-5 w-5" />}
            onClick={() => setDisconnectStep('confirm')}
            className="self-start"
          >
            {t('account.disconnect')}
          </Button>
        )}
        {disconnectStep === 'confirm' && (
          <div className="flex flex-col gap-3">
            <p className="text-body text-danger">{t('account.confirmBody')}</p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setDisconnectStep('idle')}
              >
                {t('account.cancel')}
              </Button>
              <Button variant="danger" onClick={handleDisconnect}>
                {t('account.confirmDisconnect')}
              </Button>
            </div>
          </div>
        )}
        {disconnectStep === 'working' && (
          <p className="text-body text-text-secondary">
            {t('account.disconnecting')}
          </p>
        )}
      </Card>
    </div>
  )
}
