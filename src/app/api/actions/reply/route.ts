import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { requireUser } from '@/lib/auth/requireUser'
import { getGmailClientForUser, fetchMessage } from '@/lib/gmail/client'
import { parseGmailMessage } from '@/lib/gmail/parse'
import { sendReply } from '@/lib/gmail/actions'
import { advanceSession, buildCheckpointResponse } from '@/lib/bookmark/session'

/** Sends the already-cleaned reply text (see /api/reply/cleanup) as a threaded Gmail reply. */
export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const sessionId = body?.sessionId
  const messageId = body?.messageId
  const replyText = body?.replyText
  if (
    typeof sessionId !== 'string' ||
    typeof messageId !== 'string' ||
    typeof replyText !== 'string' ||
    replyText.trim().length === 0
  ) {
    return NextResponse.json(
      { error: 'sessionId, messageId, and replyText are required' },
      { status: 400 },
    )
  }

  const { gmail, user } = await getGmailClientForUser(auth.userId.toString())
  const message = await fetchMessage(gmail, messageId)
  const parsed = parseGmailMessage(message)

  await sendReply({
    gmail,
    threadId: parsed.threadId,
    originalMessageId: messageId,
    toEmail: parsed.senderEmail,
    fromEmail: user.email,
    subject: parsed.subject,
    bodyText: replyText,
  })

  const progress = await advanceSession(
    auth.userId,
    new ObjectId(sessionId),
    messageId,
    'reply',
    replyText,
  )
  const payload = await buildCheckpointResponse(gmail, progress)
  return NextResponse.json(payload)
}
