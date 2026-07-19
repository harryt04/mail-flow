import { getTranslations } from 'next-intl/server'

export async function LandingNav() {
  const t = await getTranslations('landing')

  return (
    <header className="flex items-center justify-center px-6 py-6 sm:justify-start sm:px-8">
      <span className="text-h2 text-text-primary font-bold">{t('brand')}</span>
    </header>
  )
}
