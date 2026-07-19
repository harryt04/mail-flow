import { requireUser } from '@/lib/auth/requireUser'
import { resolveOpenAiCredential } from '@/lib/auth/openaiKey'
import { transcribe } from '@/lib/voice/stt'

export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth)
    return Response.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    )

  const credential = await resolveOpenAiCredential(auth.userId)
  if (!credential) {
    return Response.json(
      { error: 'OpenAI API key required', code: 'OPENAI_KEY_REQUIRED' },
      { status: 400 },
    )
  }

  const formData = await request.formData().catch(() => null)
  const audio = formData?.get('audio')
  if (!(audio instanceof Blob)) {
    return Response.json(
      { error: 'audio is required', code: 'AUDIO_REQUIRED' },
      { status: 400 },
    )
  }

  try {
    const transcript = await transcribe(audio, credential.apiKey)
    return Response.json({ transcript })
  } catch (err) {
    console.error('transcribe failed:', err)
    const message =
      err instanceof Error ? err.message : "Couldn't reach the voice service"
    return Response.json(
      { error: message, code: 'VOICE_SERVICE_ERROR' },
      { status: 502 },
    )
  }
}
