import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { requireUser } from '@/lib/auth/requireUser'
import { getGmailClientForUser } from '@/lib/gmail/client'
import { jumpToMessage, buildCheckpointResponse } from '@/lib/bookmark/session'

/** Jumps the bookmark to a specific message from the /inbox browser, then hands back a ready-to-play checkpoint. */
export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const sessionId = body?.sessionId
  const messageId = body?.messageId
  if (typeof sessionId !== 'string' || typeof messageId !== 'string') {
    return NextResponse.json(
      { error: 'sessionId and messageId are required' },
      { status: 400 },
    )
  }

  const { gmail } = await getGmailClientForUser(auth.userId.toString())

  let progress
  try {
    progress = await jumpToMessage(
      auth.userId,
      new ObjectId(sessionId),
      messageId,
    )
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Could not jump to that message',
      },
      { status: 400 },
    )
  }

  const payload = await buildCheckpointResponse(gmail, progress)
  return NextResponse.json(payload)
}
