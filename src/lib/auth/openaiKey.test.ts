import { ObjectId } from 'mongodb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindOne = vi.fn()
const mockUpdateOne = vi.fn()

vi.mock('@/lib/db/collections', () => ({
  usersCollection: vi.fn(async () => ({
    findOne: mockFindOne,
    updateOne: mockUpdateOne,
  })),
}))

vi.mock('@/lib/auth/tokenCrypto', () => ({
  decryptToken: vi.fn((payload: { ciphertext: string }) =>
    payload.ciphertext.replace('encrypted:', ''),
  ),
}))

import {
  FREE_TRIAL_ACTION_LIMIT,
  incrementTrialActionUsage,
  resolveOpenAiCredential,
} from './openaiKey'

const userId = new ObjectId()

describe('resolveOpenAiCredential', () => {
  const originalTrialKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'trial-key'
  })

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalTrialKey
  })

  it('returns null when the user does not exist', async () => {
    mockFindOne.mockResolvedValue(null)
    expect(await resolveOpenAiCredential(userId)).toBeNull()
  })

  it("returns the user's own decrypted key when set", async () => {
    mockFindOne.mockResolvedValue({
      _id: userId,
      openaiKey: { ciphertext: 'encrypted:user-key' },
    })

    const result = await resolveOpenAiCredential(userId)

    expect(result).toEqual({ apiKey: 'user-key', usingTrial: false })
  })

  it('falls back to the trial key with remaining actions when under the limit', async () => {
    mockFindOne.mockResolvedValue({ _id: userId, trialActionsUsed: 3 })

    const result = await resolveOpenAiCredential(userId)

    expect(result).toEqual({
      apiKey: 'trial-key',
      usingTrial: true,
      actionsRemaining: FREE_TRIAL_ACTION_LIMIT - 3,
    })
  })

  it('returns null once the trial action limit is reached', async () => {
    mockFindOne.mockResolvedValue({
      _id: userId,
      trialActionsUsed: FREE_TRIAL_ACTION_LIMIT,
    })

    expect(await resolveOpenAiCredential(userId)).toBeNull()
  })

  it('returns null when under the trial limit but no trial key is configured', async () => {
    delete process.env.OPENAI_API_KEY
    mockFindOne.mockResolvedValue({ _id: userId, trialActionsUsed: 0 })

    expect(await resolveOpenAiCredential(userId)).toBeNull()
  })

  it('treats a missing trialActionsUsed as zero', async () => {
    mockFindOne.mockResolvedValue({ _id: userId })

    const result = await resolveOpenAiCredential(userId)

    expect(result).toEqual({
      apiKey: 'trial-key',
      usingTrial: true,
      actionsRemaining: FREE_TRIAL_ACTION_LIMIT,
    })
  })
})

describe('incrementTrialActionUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('increments trialActionsUsed for the given user', async () => {
    await incrementTrialActionUsage(userId)

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: userId },
      { $inc: { trialActionsUsed: 1 } },
    )
  })
})
