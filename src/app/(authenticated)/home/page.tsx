import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ObjectId } from 'mongodb'
import { auth } from '@/lib/auth/options'
import {
  getActiveSessionProgress,
  type SessionWithProgress,
} from '@/lib/bookmark/session'
import { getActionCounts } from '@/lib/bookmark/stats'
import { Button } from '@/components/ui/Button'
import { DashboardStats } from '@/components/home/DashboardStats'

function buildBookmarkStatus(progress: SessionWithProgress | null): string {
  if (!progress) return 'Fresh inbox — ready to start.'

  const { remaining, session } = progress
  const totalEstimate = session.totalEstimate ?? session.messageIds.length
  const snapshotSize = session.messageIds.length

  if (totalEstimate > snapshotSize) {
    return `Working through the oldest ${snapshotSize.toLocaleString()} of ~${totalEstimate.toLocaleString()} unread emails — ${remaining.toLocaleString()} left in this batch.`
  }

  return `You have ${remaining.toLocaleString()} email${remaining === 1 ? '' : 's'} left in this session.`
}

export default async function HomePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  const userId = new ObjectId(session.user.id)
  const [progress, counts] = await Promise.all([
    getActiveSessionProgress(userId),
    getActionCounts(userId),
  ])
  const bookmarkStatus = buildBookmarkStatus(progress)

  return (
    <div className="flex flex-1 flex-col items-center gap-10 px-6 py-12 text-center">
      <div className="flex flex-col items-center gap-6">
        <p className="text-body text-text-secondary">{bookmarkStatus}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/listen">
            <Button size="lg">Start Listening</Button>
          </Link>
          <Link href="/inbox">
            <Button size="lg" variant="secondary">
              Browse inbox
            </Button>
          </Link>
        </div>
      </div>

      <DashboardStats counts={counts} />
    </div>
  )
}
