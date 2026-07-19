'use client'

import { useEffect, useState } from 'react'

interface UsageData {
  hasKey: boolean
  trialActionsRemaining: number
}

export function TrialUsageIndicator() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

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
          <strong>{usage.trialActionsRemaining}/100</strong> free actions left.
          MailFlow isn&apos;t being paid for this — you&apos;re covering your
          own OpenAI usage.
        </p>
      </div>
    </div>
  )
}
