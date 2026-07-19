import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ObjectId } from 'mongodb'

const {
  mockRequireUser,
  mockFindOne,
  mockUpdateOne,
  mockEncryptToken,
  mockModelsList,
} = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockFindOne: vi.fn(),
  mockUpdateOne: vi.fn(),
  mockEncryptToken: vi.fn(),
  mockModelsList: vi.fn(),
}))

vi.mock('@/lib/auth/requireUser', () => ({
  requireUser: mockRequireUser,
}))

vi.mock('@/lib/db/collections', () => ({
  usersCollection: vi.fn(async () => ({
    findOne: mockFindOne,
    updateOne: mockUpdateOne,
  })),
}))

vi.mock('@/lib/auth/tokenCrypto', () => ({
  encryptToken: mockEncryptToken,
}))

vi.mock('@/lib/auth/openaiKey', () => ({
  FREE_TRIAL_ACTION_LIMIT: 25,
}))

vi.mock('openai', () => ({
  default: vi.fn(function () {
    return {
      models: {
        list: mockModelsList,
      },
    }
  }),
}))

import { GET, POST, DELETE } from './route'

const userId = new ObjectId()

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/settings/openai-key', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('GET /api/settings/openai-key', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockRequireUser.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
    })
  })

  it('returns 404 when the user doc is not found', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })
    mockFindOne.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: 'User not found',
      code: 'USER_NOT_FOUND',
    })
  })

  it('returns hasKey/trialActionsUsed/trialActionsRemaining', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })
    mockFindOne.mockResolvedValue({
      _id: userId,
      openaiKey: { ciphertext: 'encrypted:key' },
      trialActionsUsed: 5,
    })

    const response = await GET()

    expect(await response.json()).toEqual({
      hasKey: true,
      trialActionsUsed: 5,
      trialActionsRemaining: 20,
    })
  })

  it('defaults trialActionsUsed to 0 when absent', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })
    mockFindOne.mockResolvedValue({ _id: userId })

    const response = await GET()

    expect(await response.json()).toEqual({
      hasKey: false,
      trialActionsUsed: 0,
      trialActionsRemaining: 25,
    })
  })
})

describe('POST /api/settings/openai-key', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockRequireUser.mockResolvedValue(null)

    const response = await POST(makeRequest({ apiKey: 'sk-test' }))

    expect(response.status).toBe(401)
  })

  it('returns 400 when apiKey is missing or empty', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })

    const response = await POST(makeRequest({ apiKey: '   ' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'apiKey is required',
      code: 'API_KEY_REQUIRED',
    })
  })

  it('returns 400 with INVALID_OPENAI_KEY when validation throws', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })
    mockModelsList.mockRejectedValue(new Error('bad key'))

    const response = await POST(makeRequest({ apiKey: 'sk-bad' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Invalid OpenAI API key',
      code: 'INVALID_OPENAI_KEY',
    })
    expect(mockUpdateOne).not.toHaveBeenCalled()
  })

  it('encrypts and stores the key on success', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })
    mockModelsList.mockResolvedValue({ data: [] })
    const encrypted = { ciphertext: 'encrypted:sk-good' }
    mockEncryptToken.mockReturnValue(encrypted)

    const response = await POST(makeRequest({ apiKey: '  sk-good  ' }))

    expect(mockEncryptToken).toHaveBeenCalledWith('sk-good')
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: userId },
      {
        $set: {
          openaiKey: encrypted,
          updatedAt: expect.any(Date),
        },
      },
    )
    expect(await response.json()).toEqual({ hasKey: true })
  })
})

describe('DELETE /api/settings/openai-key', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockRequireUser.mockResolvedValue(null)

    const response = await DELETE()

    expect(response.status).toBe(401)
  })

  it('unsets the key and returns hasKey: false', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })

    const response = await DELETE()

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: userId },
      { $unset: { openaiKey: '' }, $set: { updatedAt: expect.any(Date) } },
    )
    expect(await response.json()).toEqual({ hasKey: false })
  })
})
