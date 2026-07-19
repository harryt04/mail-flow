import { getTranslations } from 'next-intl/server'
import { GoogleSignInForm } from '@/components/landing/GoogleSignInForm'

export async function ClosingCta() {
  const t = await getTranslations('landing.closingCta')

  return (
    <section className="border-border bg-surface border-t px-6 pt-20 pb-24 sm:pt-24 sm:pb-32 md:pt-28">
      <div className="rounded-card border-border bg-bg mx-auto flex max-w-md flex-col items-center gap-8 border px-8 py-16 text-center shadow-[var(--shadow-soft)]">
        <h2
          className="text-display text-text-primary font-bold"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('heading')}
        </h2>
        <p className="text-body text-text-secondary">{t('body')}</p>
        <GoogleSignInForm />
      </div>
    </section>
  )
}
