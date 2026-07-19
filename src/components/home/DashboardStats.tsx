import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { Card } from '@/components/ui/Card'
import { Badge, type badgeVariants } from '@/components/ui/Badge'
import {
  IconArchive,
  IconReply,
  IconSnooze,
  IconSkip,
  IconFolder,
} from '@/components/ui/icons'
import type { ActionCounts } from '@/lib/bookmark/stats'
import type { VariantProps } from 'class-variance-authority'

type Tone = NonNullable<VariantProps<typeof badgeVariants>['tone']>

interface Tile {
  key: 'archived' | 'replied' | 'snoozed' | 'moved' | 'skipped'
  count: number
  tone: Tone
  icon: ReactNode
  footnote?: string
}

/** All-time tallies from the emailActionLog, styled per BRAND.md's tone convention — every tile pairs color with an icon and a text label, never color alone. */
export async function DashboardStats({ counts }: { counts: ActionCounts }) {
  const t = await getTranslations('dashboardStats')

  if (counts.total === 0) {
    return (
      <Card className="w-full max-w-2xl">
        <p className="text-body text-text-secondary">{t('empty')}</p>
      </Card>
    )
  }

  const tiles: Tile[] = [
    {
      key: 'archived',
      count: counts.archive,
      tone: 'positive',
      icon: <IconArchive className="h-6 w-6" />,
      footnote:
        counts.delete > 0
          ? t('deletedFootnote', { count: counts.delete })
          : undefined,
    },
    {
      key: 'replied',
      count: counts.reply,
      tone: 'brand',
      icon: <IconReply className="h-6 w-6" />,
    },
    {
      key: 'snoozed',
      count: counts.snooze,
      tone: 'attention',
      icon: <IconSnooze className="h-6 w-6" />,
    },
    {
      key: 'moved',
      count: counts.move,
      tone: 'positive',
      icon: <IconFolder className="h-6 w-6" />,
    },
    {
      key: 'skipped',
      count: counts.skip,
      tone: 'neutral',
      icon: <IconSkip className="h-6 w-6" />,
    },
  ]

  return (
    <Card className="w-full max-w-2xl">
      <p className="text-body text-text-secondary">
        {t.rich('summary', {
          total: counts.total,
          strong: (chunks) => (
            <span className="text-text-primary font-semibold">{chunks}</span>
          ),
        })}
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className="flex flex-col items-center gap-2 text-center"
          >
            <Badge tone={tile.tone} icon={tile.icon}>
              {t(`tiles.${tile.key}`)}
            </Badge>
            <p className="text-h1 text-text-primary font-bold">
              {tile.count.toLocaleString()}
            </p>
            {tile.footnote && (
              <p className="text-meta text-text-muted">{tile.footnote}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
