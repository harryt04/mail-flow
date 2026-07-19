import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth/options'
import { OnboardingClient } from './OnboardingClient'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('onboarding')
  return { title: t('metadataTitle') }
}

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  return <OnboardingClient />
}
