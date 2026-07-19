import OpenAI from 'openai'
import { requireUser } from '@/lib/auth/requireUser'
import { usersCollection } from '@/lib/db/collections'
import { encryptToken } from '@/lib/auth/tokenCrypto'
import { FREE_TRIAL_ACTION_LIMIT } from '@/lib/auth/openaiKey'

export async function GET() {
  const auth = await requireUser()
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await usersCollection()
  const user = await users.findOne({ _id: auth.userId })
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  const trialActionsUsed = user.trialActionsUsed ?? 0
  return Response.json({
    hasKey: Boolean(user.openaiKey),
    trialActionsUsed,
    trialActionsRemaining: Math.max(
      0,
      FREE_TRIAL_ACTION_LIMIT - trialActionsUsed,
    ),
  })
}

export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const apiKey = body?.apiKey
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return Response.json({ error: 'apiKey is required' }, { status: 400 })
  }

  try {
    await new OpenAI({ apiKey: apiKey.trim() }).models.list()
  } catch {
    return Response.json({ error: 'Invalid OpenAI API key' }, { status: 400 })
  }

  const users = await usersCollection()
  await users.updateOne(
    { _id: auth.userId },
    {
      $set: {
        openaiKey: encryptToken(apiKey.trim()),
        updatedAt: new Date(),
      },
    },
  )

  return Response.json({ hasKey: true })
}

export async function DELETE() {
  const auth = await requireUser()
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await usersCollection()
  await users.updateOne(
    { _id: auth.userId },
    { $unset: { openaiKey: '' }, $set: { updatedAt: new Date() } },
  )

  return Response.json({ hasKey: false })
}
