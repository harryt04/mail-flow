import { getTranslations } from 'next-intl/server'
import { Card } from '@/components/ui/Card'
import { IconGoogle, IconMic, IconPlay, IconCheck } from '@/components/ui/icons'

const STEPS = [
  { key: 'signIn', icon: IconGoogle },
  { key: 'startListening', icon: IconPlay },
  { key: 'listen', icon: IconMic },
  { key: 'sayTheWord', icon: IconCheck },
] as const

export async function HowItWorks() {
  const t = await getTranslations('landing.howItWorks')

  return (
    <section className="border-border bg-surface border-t px-6 py-20 sm:py-24 md:py-28">
      <h2 className="text-h1 text-text-primary mx-auto mb-12 max-w-md text-center font-bold">
        {t('heading')}
      </h2>
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
        {STEPS.map(({ icon: Icon, key }, i) => (
          <Card key={key} className="flex flex-col gap-4 p-8 text-left">
            <div className="flex items-center gap-3">
              <span className="bg-brand/10 text-brand flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-label text-text-muted tracking-wide uppercase">
                {t('step', { number: i + 1 })}
              </span>
            </div>
            <h3 className="text-h2 text-text-primary font-semibold">
              {t(`steps.${key}.title`)}
            </h3>
            <p className="text-body text-text-secondary">
              {t(`steps.${key}.body`)}
            </p>
          </Card>
        ))}
      </div>
    </section>
  )
}
