import { requireUser } from '@/lib/auth/requireUser'
import { resolveOpenAiCredential } from '@/lib/auth/openaiKey'
import { cleanupReply } from '@/lib/voice/replyCleanup'

export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const credential = await resolveOpenAiCredential(auth.userId)
  if (!credential) {
    return Response.json({ error: 'OpenAI API key required' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const rawTranscript = body?.rawTranscript
  if (typeof rawTranscript !== 'string' || rawTranscript.trim().length === 0) {
    return Response.json(
      { error: 'rawTranscript is required' },
      { status: 400 },
    )
  }

  const cleanedText = await cleanupReply(
    rawTranscript.trim(),
    credential.apiKey,
  )
  return Response.json({ cleanedText })
}
