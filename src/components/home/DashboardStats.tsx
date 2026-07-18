import type { ReactNode } from 'react'
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
  label: string
  count: number
  tone: Tone
  icon: ReactNode
  footnote?: string
}

/** All-time tallies from the emailActionLog, styled per BRAND.md's tone convention — every tile pairs color with an icon and a text label, never color alone. */
export function DashboardStats({ counts }: { counts: ActionCounts }) {
  if (counts.total === 0) {
    return (
      <Card className="w-full max-w-2xl">
        <p className="text-body text-text-secondary">
          Nothing sorted yet — the first email you process will show up here.
        </p>
      </Card>
    )
  }

  const tiles: Tile[] = [
    {
      label: 'Archived',
      count: counts.archive,
      tone: 'positive',
      icon: <IconArchive className="h-6 w-6" />,
      footnote: counts.delete > 0 ? `${counts.delete} deleted` : undefined,
    },
    {
      label: 'Replied',
      count: counts.reply,
      tone: 'brand',
      icon: <IconReply className="h-6 w-6" />,
    },
    {
      label: 'Snoozed',
      count: counts.snooze,
      tone: 'attention',
      icon: <IconSnooze className="h-6 w-6" />,
    },
    {
      label: 'Moved',
      count: counts.move,
      tone: 'positive',
      icon: <IconFolder className="h-6 w-6" />,
    },
    {
      label: 'Skipped',
      count: counts.skip,
      tone: 'neutral',
      icon: <IconSkip className="h-6 w-6" />,
    },
  ]

  return (
    <Card className="w-full max-w-2xl">
      <p className="text-body text-text-secondary">
        You&apos;ve sorted{' '}
        <span className="text-text-primary font-semibold">{counts.total}</span>{' '}
        email{counts.total === 1 ? '' : 's'} so far.
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex flex-col items-center gap-2 text-center"
          >
            <Badge tone={tile.tone} icon={tile.icon}>
              {tile.label}
            </Badge>
            <p className="text-h1 text-text-primary font-bold">{tile.count}</p>
            {tile.footnote && (
              <p className="text-meta text-text-muted">{tile.footnote}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
