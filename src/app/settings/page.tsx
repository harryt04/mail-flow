import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/options'
import { AppHeader } from '@/components/ui/AppHeader'
import { SettingsClient } from '@/app/settings/SettingsClient'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />
      <SettingsClient />
    </div>
  )
}
