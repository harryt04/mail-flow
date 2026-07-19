import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ObjectId } from 'mongodb'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth/options'
import {
  getActiveSessionProgress,
  type SessionWithProgress,
} from '@/lib/bookmark/session'
import { getActionCounts } from '@/lib/bookmark/stats'
import { Button } from '@/components/ui/Button'
import { DashboardStats } from '@/components/home/DashboardStats'

function buildBookmarkStatus(
  progress: SessionWithProgress | null,
  t: Awaited<ReturnType<typeof getTranslations>>,
): string {
  if (!progress) return t('fresh')

  const { remaining, session } = progress
  const totalEstimate = session.totalEstimate ?? session.messageIds.length
  const snapshotSize = session.messageIds.length

  if (totalEstimate > snapshotSize) {
    return t('workingThrough', { snapshotSize, totalEstimate, remaining })
  }

  return t('remaining', { remaining })
}

export default async function HomePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  const t = await getTranslations('home')
  const tBookmarkStatus = await getTranslations('home.bookmarkStatus')

  const userId = new ObjectId(session.user.id)
  const [progress, counts] = await Promise.all([
    getActiveSessionProgress(userId),
    getActionCounts(userId),
  ])
  const bookmarkStatus = buildBookmarkStatus(progress, tBookmarkStatus)

  return (
    <div className="flex flex-1 flex-col items-center gap-10 px-6 py-12 text-center">
      <div className="flex flex-col items-center gap-6">
        <p className="text-body text-text-secondary">{bookmarkStatus}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/listen">
            <Button size="lg">{t('startListening')}</Button>
          </Link>
          <Link href="/inbox">
            <Button size="lg" variant="secondary">
              {t('browseInbox')}
            </Button>
          </Link>
        </div>
      </div>

      <DashboardStats counts={counts} />
    </div>
  )
}
