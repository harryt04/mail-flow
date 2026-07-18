import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/options'
import { AppHeader } from '@/components/ui/AppHeader'
import { InboxClient } from '@/app/inbox/InboxClient'

export default async function InboxPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />
      <InboxClient />
    </div>
  )
}
