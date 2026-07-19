'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconAlert } from '@/components/ui/icons'
import { translateApiError } from '@/lib/errors/translateApiError'

export function OnboardingClient() {
  const router = useRouter()
  const t = useTranslations('onboarding')
  const tApiErrors = useTranslations('apiErrors')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/settings/openai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          translateApiError(tApiErrors, data, t('errors.saveApiKey')),
        )
      }

      router.push('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveApiKey'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <Link
        href="/"
        className="text-body text-text-secondary hover:text-text-primary"
      >
        {t('backToBrand')}
      </Link>

      <div className="flex flex-col gap-4">
        <h1 className="text-h1 text-text-primary font-bold">{t('heading')}</h1>
        <p className="text-body text-text-secondary">{t('body')}</p>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex items-start gap-2">
          <IconAlert className="text-text-secondary h-5 w-5 flex-shrink-0" />
          <p className="text-body-sm text-text-secondary">{t('notPaidNote')}</p>
        </div>
      </Card>

      <Card className="flex flex-col gap-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="apiKey"
              className="text-label text-text-secondary uppercase"
            >
              {t('apiKeyLabel')}
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={saving}
              placeholder={t('apiKeyPlaceholder')}
              className="rounded-card border-border bg-surface-sunken text-body text-text-primary w-full border p-3"
            />
            <p className="text-meta text-text-muted">
              {t('apiKeyEncryptedNote')}
            </p>
          </div>

          {error && <p className="text-body text-danger">{error}</p>}

          <Button
            type="submit"
            disabled={saving || apiKey.trim().length === 0}
            className="self-start"
          >
            {saving ? t('saving') : t('save')}
          </Button>
        </form>
      </Card>

      <div className="text-meta text-text-muted flex flex-col gap-2">
        <p>
          {t.rich('findKey', {
            link: (chunks) => (
              <a
                href="https://platform.openai.com/account/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text-secondary underline"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
        <p>
          {t.rich('billingDocs', {
            link: (chunks) => (
              <a
                href="https://platform.openai.com/account/billing/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text-secondary underline"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>
    </main>
  )
}
