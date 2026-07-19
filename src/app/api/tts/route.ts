import { requireUser } from '@/lib/auth/requireUser'
import { resolveOpenAiCredential } from '@/lib/auth/openaiKey'
import { getTtsProvider } from '@/lib/voice/tts'

export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const credential = await resolveOpenAiCredential(auth.userId)
  if (!credential) {
    return Response.json({ error: 'OpenAI API key required' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const text = body?.text
  const voiceTone =
    typeof body?.voiceTone === 'string' ? body.voiceTone : undefined
  if (typeof text !== 'string' || text.trim().length === 0) {
    return Response.json({ error: 'text is required' }, { status: 400 })
  }

  const audioStream = await getTtsProvider().synthesize(text, {
    voiceTone,
    apiKey: credential.apiKey,
  })

  return new Response(audioStream, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  })
}
