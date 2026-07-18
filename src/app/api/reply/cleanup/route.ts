import { requireUser } from '@/lib/auth/requireUser'
import { cleanupReply } from '@/lib/voice/replyCleanup'

export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const rawTranscript = body?.rawTranscript
  if (typeof rawTranscript !== 'string' || rawTranscript.trim().length === 0) {
    return Response.json(
      { error: 'rawTranscript is required' },
      { status: 400 },
    )
  }

  const cleanedText = await cleanupReply(rawTranscript.trim())
  return Response.json({ cleanedText })
}
