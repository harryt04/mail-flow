import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('tos')
  return { title: t('metadataTitle') }
}

export default async function TermsOfServicePage() {
  const t = await getTranslations('tos')

  const permissionsLink = (chunks: React.ReactNode) => (
    <a
      href="https://myaccount.google.com/permissions"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-text-primary underline"
    >
      {chunks}
    </a>
  )
  const emailLink = (chunks: React.ReactNode) => (
    <a
      href="mailto:harrison.thomas04@gmail.com"
      className="hover:text-text-primary underline"
    >
      {chunks}
    </a>
  )

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <Link
        href="/"
        className="text-body text-text-secondary hover:text-text-primary"
      >
        {t('backToBrand')}
      </Link>
      <h1 className="text-h1 text-text-primary font-bold">{t('title')}</h1>
      <p className="text-body-sm text-text-secondary">{t('lastUpdated')}</p>

      <div className="text-body text-text-secondary flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <h2 className="text-h3 text-text-primary font-semibold">
            {t('sections.acceptance.heading')}
          </h2>
          <p>{t('sections.acceptance.body')}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 text-text-primary font-semibold">
            {t('sections.description.heading')}
          </h2>
          <p>{t('sections.description.body')}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 text-text-primary font-semibold">
            {t('sections.yourAccount.heading')}
          </h2>
          <p>{t.rich('sections.yourAccount.body', { permissionsLink })}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 text-text-primary font-semibold">
            {t('sections.acceptableUse.heading')}
          </h2>
          <p>{t('sections.acceptableUse.body')}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 text-text-primary font-semibold">
            {t('sections.disclaimer.heading')}
          </h2>
          <p>{t('sections.disclaimer.body')}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 text-text-primary font-semibold">
            {t('sections.limitationOfLiability.heading')}
          </h2>
          <p>{t('sections.limitationOfLiability.body')}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 text-text-primary font-semibold">
            {t('sections.changes.heading')}
          </h2>
          <p>{t('sections.changes.body')}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 text-text-primary font-semibold">
            {t('sections.contact.heading')}
          </h2>
          <p>{t.rich('sections.contact.body', { emailLink })}</p>
        </section>
      </div>
    </main>
  )
}
