import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/Badge'
import {
  IconSkip,
  IconArchive,
  IconReply,
  IconMic,
} from '@/components/ui/icons'

const COMMANDS = [
  { key: 'skip', tone: 'neutral' as const, icon: IconSkip },
  { key: 'archive', tone: 'positive' as const, icon: IconArchive },
  { key: 'reply', tone: 'brand' as const, icon: IconReply },
] as const

/** Previews the exact icon+color vocabulary used by the in-app manual controls (BRAND.md §6). */
export async function CommandShowcase() {
  const t = await getTranslations('landing.commandShowcase')

  return (
    <section className="px-6 py-20 sm:py-24 md:py-28">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-8 text-center">
        <h2 className="text-h1 text-text-primary font-bold">{t('heading')}</h2>
        <p className="text-body text-text-secondary">{t('body')}</p>
        <div className="rounded-card border-border bg-surface flex w-full flex-col items-center gap-8 border p-8 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col items-center gap-3">
            <span className="bg-attention/10 text-attention relative flex h-16 w-16 items-center justify-center rounded-full">
              <span
                className="border-attention absolute inset-0 rounded-full border-2 motion-safe:animate-[pulse-ring_1.6s_ease-out_infinite]"
                aria-hidden="true"
              />
              <IconMic className="h-7 w-7" />
            </span>
            <span className="text-label text-text-muted tracking-wide uppercase">
              {t('listening')}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {COMMANDS.map(({ key, tone, icon: Icon }) => (
              <Badge key={key} tone={tone} icon={<Icon className="h-4 w-4" />}>
                {t(`commands.${key}`)}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
