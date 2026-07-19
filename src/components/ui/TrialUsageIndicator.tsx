'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface UsageData {
  hasKey: boolean
  trialActionsRemaining: number
}

export function TrialUsageIndicator() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const t = useTranslations('trialUsage')

  useEffect(() => {
    fetch('/api/settings/openai-key')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setUsage(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !usage || usage.hasKey || usage.trialActionsRemaining > 20) {
    return null
  }

  return (
    <div className="bg-surface-warning border-warning text-warning-text flex items-center gap-3 border-b px-4 py-2 text-sm">
      <div className="flex-1">
        <p>
          {t.rich('remaining', {
            remaining: usage.trialActionsRemaining,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      </div>
    </div>
  )
}
