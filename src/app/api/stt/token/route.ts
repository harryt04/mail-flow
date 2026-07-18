import { requireUser } from '@/lib/auth/requireUser'
import { mintSttToken } from '@/lib/voice/stt'

export async function POST() {
  const auth = await requireUser()
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const token = await mintSttToken()
    return Response.json(token)
  } catch (err) {
    console.error('mintSttToken failed:', err)
    const message =
      err instanceof Error ? err.message : 'Could not reach the voice service'
    return Response.json({ error: message }, { status: 502 })
  }
}
