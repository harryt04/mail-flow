import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/options'
import { OnboardingClient } from './OnboardingClient'

export const metadata = {
  title: 'Complete Setup — MailFlow',
}

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  return <OnboardingClient />
}
