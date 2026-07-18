import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { requireUser } from '@/lib/auth/requireUser'
import { getGmailClientForUser } from '@/lib/gmail/client'
import { archiveMessage } from '@/lib/gmail/actions'
import { advanceSession, buildCheckpointResponse } from '@/lib/bookmark/session'

/** "Archive" or "Delete" — both remove the message from INBOX (PRD §5.5: no permanent delete for MVP). */
export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const sessionId = body?.sessionId
  const messageId = body?.messageId
  const isDelete = body?.delete === true
  if (typeof sessionId !== 'string' || typeof messageId !== 'string') {
    return NextResponse.json(
      { error: 'sessionId and messageId are required' },
      { status: 400 },
    )
  }

  const { gmail } = await getGmailClientForUser(auth.userId.toString())
  await archiveMessage(gmail, messageId)

  const progress = await advanceSession(
    auth.userId,
    new ObjectId(sessionId),
    messageId,
    isDelete ? 'delete' : 'archive',
  )
  const payload = await buildCheckpointResponse(gmail, progress)
  return NextResponse.json(payload)
}
