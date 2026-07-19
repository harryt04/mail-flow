import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/requireUser'
import { getGmailClientForUser, fetchMessage } from '@/lib/gmail/client'
import { parseGmailMessage } from '@/lib/gmail/parse'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser()
  if (!auth)
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    )

  const { id } = await params
  const { gmail } = await getGmailClientForUser(auth.userId.toString())
  const message = await fetchMessage(gmail, id)
  const email = parseGmailMessage(message)

  return NextResponse.json({ email })
}
