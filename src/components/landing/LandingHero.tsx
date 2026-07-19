import { getTranslations } from 'next-intl/server'
import { Waveform } from '@/components/listening/Waveform'
import { GoogleSignInForm } from '@/components/landing/GoogleSignInForm'

export async function LandingHero() {
  const t = await getTranslations('landing.hero')

  return (
    <section className="flex flex-col items-center gap-8 px-6 pt-12 pb-20 text-center sm:pt-16 sm:pb-28 md:pb-32">
      <h1
        className="text-display text-text-primary md:text-hero max-w-2xl font-bold"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {t('heading')}
      </h1>
      <p className="text-body-lg text-text-secondary mx-auto max-w-sm">
        {t('body')}
      </p>
      <GoogleSignInForm />
      <Waveform className="mt-6 opacity-80" />
    </section>
  )
}
