import type { ObjectId } from 'mongodb'
import { usersCollection } from '@/lib/db/collections'
import { decryptToken } from '@/lib/auth/tokenCrypto'

export const FREE_TRIAL_ACTION_LIMIT = 100

export interface OpenAiCredential {
  apiKey: string
  usingTrial: boolean
  actionsRemaining?: number
}

/**
 * Resolves which OpenAI key a request should use: the user's own key if set,
 * otherwise the app's trial key while under FREE_TRIAL_ACTION_LIMIT, otherwise
 * null (caller must treat this as "user needs to supply a key").
 */
export async function resolveOpenAiCredential(
  userId: ObjectId,
): Promise<OpenAiCredential | null> {
  const users = await usersCollection()
  const user = await users.findOne({ _id: userId })
  if (!user) return null

  if (user.openaiKey) {
    return { apiKey: decryptToken(user.openaiKey), usingTrial: false }
  }

  const actionsUsed = user.trialActionsUsed ?? 0
  if (actionsUsed >= FREE_TRIAL_ACTION_LIMIT) return null

  const trialKey = process.env.OPENAI_API_KEY
  if (!trialKey) return null

  return {
    apiKey: trialKey,
    usingTrial: true,
    actionsRemaining: FREE_TRIAL_ACTION_LIMIT - actionsUsed,
  }
}

export async function incrementTrialActionUsage(
  userId: ObjectId,
): Promise<void> {
  const users = await usersCollection()
  await users.updateOne({ _id: userId }, { $inc: { trialActionsUsed: 1 } })
}
