import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ObjectId } from 'mongodb'

const {
  mockRequireUser,
  mockFindOne,
  mockDeleteOne,
  mockBookmarksDeleteOne,
  mockSessionsDeleteMany,
  mockDecryptToken,
} = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockFindOne: vi.fn(),
  mockDeleteOne: vi.fn(),
  mockBookmarksDeleteOne: vi.fn(),
  mockSessionsDeleteMany: vi.fn(),
  mockDecryptToken: vi.fn(),
}))

vi.mock('@/lib/auth/requireUser', () => ({
  requireUser: mockRequireUser,
}))

vi.mock('@/lib/db/collections', () => ({
  usersCollection: vi.fn(async () => ({
    findOne: mockFindOne,
    deleteOne: mockDeleteOne,
  })),
  bookmarksCollection: vi.fn(async () => ({
    deleteOne: mockBookmarksDeleteOne,
  })),
  sessionsCollection: vi.fn(async () => ({
    deleteMany: mockSessionsDeleteMany,
  })),
}))

vi.mock('@/lib/auth/tokenCrypto', () => ({
  decryptToken: mockDecryptToken,
}))

import { POST } from './route'

const userId = new ObjectId()

describe('POST /api/settings/disconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    mockDeleteOne.mockResolvedValue({ deletedCount: 1 })
    mockBookmarksDeleteOne.mockResolvedValue({ deletedCount: 1 })
    mockSessionsDeleteMany.mockResolvedValue({ deletedCount: 1 })
  })

  it('returns 401 when unauthenticated', async () => {
    mockRequireUser.mockResolvedValue(null)

    const response = await POST()

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
    })
  })

  it('returns 404 when the user doc is not found', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })
    mockFindOne.mockResolvedValue(null)

    const response = await POST()

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: 'User not found',
      code: 'USER_NOT_FOUND',
    })
  })

  it('decrypts the refresh token, revokes with Google, and deletes stored state', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })
    const encryptedRefreshToken = { ciphertext: 'encrypted:refresh-token' }
    mockFindOne.mockResolvedValue({
      _id: userId,
      gmailTokens: { refreshToken: encryptedRefreshToken },
    })
    mockDecryptToken.mockReturnValue('plain-refresh-token')

    const response = await POST()

    expect(mockDecryptToken).toHaveBeenCalledWith(encryptedRefreshToken)
    expect(fetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/revoke',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    )
    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect((fetchCall.body as URLSearchParams).get('token')).toBe(
      'plain-refresh-token',
    )

    expect(mockDeleteOne).toHaveBeenCalledWith({ _id: userId })
    expect(mockBookmarksDeleteOne).toHaveBeenCalledWith({ userId })
    expect(mockSessionsDeleteMany).toHaveBeenCalledWith({ userId })

    expect(await response.json()).toEqual({ disconnected: true })
  })

  it('still deletes stored state and succeeds when the Google revoke call rejects', async () => {
    mockRequireUser.mockResolvedValue({ userId, email: 'a@example.com' })
    mockFindOne.mockResolvedValue({
      _id: userId,
      gmailTokens: { refreshToken: { ciphertext: 'encrypted:refresh-token' } },
    })
    mockDecryptToken.mockReturnValue('plain-refresh-token')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const response = await POST()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ disconnected: true })
    expect(mockDeleteOne).toHaveBeenCalledWith({ _id: userId })
    expect(mockBookmarksDeleteOne).toHaveBeenCalledWith({ userId })
    expect(mockSessionsDeleteMany).toHaveBeenCalledWith({ userId })
  })
})
