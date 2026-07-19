import { redirect } from 'next/navigation'
import { ObjectId } from 'mongodb'
import { auth } from '@/lib/auth/options'
import { usersCollection } from '@/lib/db/collections'
import { FREE_TRIAL_ACTION_LIMIT } from '@/lib/auth/openaiKey'
import { AppSidebar } from '@/components/ui/AppSidebar'
import { TrialUsageIndicator } from '@/components/ui/TrialUsageIndicator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  const userId = new ObjectId(session.user.id)
  const users = await usersCollection()
  const user = await users.findOne({ _id: userId })

  if (user) {
    const hasOpenAiKey = Boolean(user.openaiKey)
    const trialActionsUsed = user.trialActionsUsed ?? 0
    const outOfTrial = trialActionsUsed >= FREE_TRIAL_ACTION_LIMIT

    if (!hasOpenAiKey && outOfTrial) {
      redirect('/onboarding')
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-1 flex-col">
        <TrialUsageIndicator />
        <div className="border-border flex items-center border-b px-4 py-3">
          <SidebarTrigger />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
