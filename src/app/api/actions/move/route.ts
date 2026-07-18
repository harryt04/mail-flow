import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { requireUser } from '@/lib/auth/requireUser'
import { getGmailClientForUser } from '@/lib/gmail/client'
import { moveMessageToLabel } from '@/lib/gmail/actions'
import { advanceSession, buildCheckpointResponse } from '@/lib/bookmark/session'

/** "Move to <folder>" — applies a user Gmail label and archives the message (drops it from the inbox queue but keeps it findable under that label). */
export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const sessionId = body?.sessionId
  const messageId = body?.messageId
  const labelId = body?.labelId
  const labelName = body?.labelName
  if (
    typeof sessionId !== 'string' ||
    typeof messageId !== 'string' ||
    typeof labelId !== 'string' ||
    typeof labelName !== 'string'
  ) {
    return NextResponse.json(
      { error: 'sessionId, messageId, labelId, and labelName are required' },
      { status: 400 },
    )
  }

  const { gmail } = await getGmailClientForUser(auth.userId.toString())
  await moveMessageToLabel(gmail, messageId, labelId)

  const progress = await advanceSession(
    auth.userId,
    new ObjectId(sessionId),
    messageId,
    'move',
    undefined,
    labelName,
  )
  const payload = await buildCheckpointResponse(gmail, progress)
  return NextResponse.json(payload)
}
