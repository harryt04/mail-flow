import { requireUser } from '@/lib/auth/requireUser'
import { mintSttToken } from '@/lib/voice/stt'

export async function POST() {
  const auth = await requireUser()
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const token = await mintSttToken()
  return Response.json(token)
}
