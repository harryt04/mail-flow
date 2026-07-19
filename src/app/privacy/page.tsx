import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('privacy')
  return { title: t('metadataTitle') }
}

export default async function PrivacyPolicyPage() {
  const t = await getTranslations('privacy')

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
            {t('sections.overview.heading')}
          </h2>
          <p>{t('sections.overview.body')}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 text-text-primary font-semibold">
            {t('sections.googleUserData.heading')}
          </h2>
          <p>{t('sections.googleUserData.intro')}</p>
          <ul className="list-disc pl-6">
            <li>{t('sections.googleUserData.bullet1')}</li>
            <li>{t('sections.googleUserData.bullet2')}</li>
          </ul>
          <p>{t('sections.googleUserData.outro')}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 text-text-primary font-semibold">
            {t('sections.otherData.heading')}
          </h2>
          <p>{t('sections.otherData.body')}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 text-text-primary font-semibold">
            {t('sections.storageAndSecurity.heading')}
          </h2>
          <p>{t('sections.storageAndSecurity.body')}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 text-text-primary font-semibold">
            {t('sections.retentionAndDeletion.heading')}
          </h2>
          <p>
            {t.rich('sections.retentionAndDeletion.body', {
              permissionsLink,
              emailLink,
            })}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-h3 text-text-primary font-semibold">
            {t('sections.thirdPartySharing.heading')}
          </h2>
          <p>{t('sections.thirdPartySharing.body')}</p>
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
