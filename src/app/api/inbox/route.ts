import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/requireUser'
import { getGmailClientForUser } from '@/lib/gmail/client'
import { fetchMessageSummaries, searchMessages } from '@/lib/gmail/list'
import { getActiveSessionProgress } from '@/lib/bookmark/session'

const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 50

/** Paginated view of the active session's snapshot, for the /inbox browser — never fetches metadata for more than one page of messages at a time. */
export async function GET(request: Request) {
  const auth = await requireUser()
  if (!auth)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const search = url.searchParams.get('search')?.trim()

  const progress = await getActiveSessionProgress(auth.userId)
  if (!progress) {
    return NextResponse.json({ active: false })
  }

  if (search) {
    const pageToken = url.searchParams.get('pageToken') ?? undefined
    const { gmail } = await getGmailClientForUser(auth.userId.toString())
    const category = progress.session.category ?? 'primary'
    const { items, nextPageToken } = await searchMessages(
      gmail,
      search,
      category,
      pageToken,
    )
    return NextResponse.json({
      active: true,
      sessionId: progress.session._id.toString(),
      items,
      nextPageToken,
      cursorIndex: progress.session.cursorIndex,
    })
  }

  const page = Math.max(0, Number(url.searchParams.get('page') ?? '0') || 0)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      Number(url.searchParams.get('pageSize') ?? DEFAULT_PAGE_SIZE) ||
        DEFAULT_PAGE_SIZE,
    ),
  )

  const { messageIds, cursorIndex, totalEstimate } = {
    messageIds: progress.session.messageIds,
    cursorIndex: progress.session.cursorIndex,
    totalEstimate:
      progress.session.totalEstimate ?? progress.session.messageIds.length,
  }

  const start = page * pageSize
  const pageIds = messageIds.slice(start, start + pageSize)

  const { gmail } = await getGmailClientForUser(auth.userId.toString())
  const items = await fetchMessageSummaries(gmail, pageIds)

  return NextResponse.json({
    active: true,
    sessionId: progress.session._id.toString(),
    items,
    page,
    pageSize,
    total: messageIds.length,
    totalEstimate,
    cursorIndex,
  })
}
