import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/requireUser'
import { getGmailClientForUser } from '@/lib/gmail/client'
import { listUserLabels, createLabel } from '@/lib/gmail/labels'

/** The user's Gmail labels, for the "Move to" folder picker. */
export async function GET() {
  const auth = await requireUser()
  if (!auth)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gmail } = await getGmailClientForUser(auth.userId.toString())
  const labels = await listUserLabels(gmail)
  return NextResponse.json({ labels })
}

/** Creates a new Gmail label (the "New Folder" chip in the move-to picker). */
export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const { gmail } = await getGmailClientForUser(auth.userId.toString())
  try {
    const label = await createLabel(gmail, name)
    return NextResponse.json({ label })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not create label' },
      { status: 400 },
    )
  }
}
